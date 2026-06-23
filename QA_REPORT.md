# Reporte de QA — OfficeSpace

**Proyecto:** OfficeSpace — Sistema Inteligente de Experiencia de Espacios de Trabajo
**Evento:** IBM Hackathon 2026 · **Responsable QA/Dev:** Portillo Mejía Christian Ariel
**Versión:** 1.0

---

## 1. Resumen ejecutivo

OfficeSpace fue desarrollado de forma incremental con verificación continua en cada fase (base de datos → microservicios → frontend → Docker). Se ejecutaron pruebas unitarias por servicio, verificación de compilación (`tsc`/`vite build`), validación estructural de dependencias entre microservicios y pruebas funcionales manuales del flujo principal. Durante el desarrollo se detectaron y **corrigieron** varios defectos de integración, configuración y despliegue; todos los **críticos están resueltos**. El sistema cumple el núcleo funcional (autenticación, espacios, reservas con anti‑solapamiento, asistencia, dashboard, auditoría, exportación) y arranca con `docker compose up --build`.

---

## 2. Metodología

- **Pruebas unitarias** (Jest) en la capa de servicios: Auth, Users, Spaces, Resources, Bookings, Dashboard, Notifications, Chatbot, Export.
- **Verificación de compilación**: `tsc --noEmit` por workspace y `vite build` del frontend.
- **Validación de arquitectura**: revisión de dependencias cruzadas entre microservicios (constructores, módulos, imports) para garantizar autonomía.
- **Pruebas funcionales manuales**: casos en `TEST_CASES.md` y escenarios BDD en `GHERKIN_SCENARIOS.md`.
- **Pruebas de concurrencia/datos**: verificación del anti‑solapamiento por *exclusion constraint* a nivel PostgreSQL.

---

## 3. Pruebas realizadas

| Área | Tipo | Resultado |
|------|------|-----------|
| Autenticación / JWT / roles | Unit + manual | OK |
| CRUD de espacios y recursos (borrado lógico) | Unit + manual | OK |
| Reservas + validaciones (fecha, capacidad, límite 5) | Unit + manual | OK |
| Anti‑solapamiento (app + constraint) | Unit + datos | OK |
| Control de asistencia (ATTENDED/NO_SHOW) | Unit + manual | OK |
| Dashboard / métricas on‑demand | Unit + manual | OK |
| Notificaciones internas | Unit + manual | OK |
| Auditoría (17 eventos, inmutable) | Unit + manual | OK |
| Exportación CSV | Unit + manual | OK |
| Compilación (tsc/vite) de los 5 workspaces | Automatizada | OK (rc=0) |
| Docker Compose (build/arranque) | Manual | OK |

---

## 4. Bugs encontrados y resueltos

### BUG‑01 — Error de inyección de dependencias (NestJS)
- **Descripción:** `UsersService` (y luego `SpacesService`) dependían de `NotificationsService`, pero al separar en microservicios `auth-service` y `catalog-service` no importaban `NotificationsModule` → `Nest can't resolve dependencies`.
- **Impacto:** Crítico — auth-service y catalog-service no arrancaban.
- **Solución aplicada:** se eliminó la dependencia cruzada; `UsersService`/`SpacesService` quedaron con `Repository` + `AuditService`; las notificaciones de esos dominios se sustituyeron por métodos privados no‑op. Notificaciones quedan solo en `booking-service` (donde corresponden).
- **Estado:** ✅ Resuelto.

### BUG‑02 — Enum `ATTENDED` inexistente en PostgreSQL
- **Descripción:** el dashboard admin consultaba `BookingStatus.ATTENDED` pero el enum `booking_status` en la BD no tenía ese valor (migración no aplicada) → 500 "Error interno del servidor".
- **Impacto:** Alto — el dashboard admin no cargaba.
- **Solución aplicada:** se añadió `ATTENDED` al enum vía migración (`ALTER TYPE booking_status ADD VALUE 'ATTENDED'`) y se regeneró el cliente Prisma. En Docker, `prisma db push` crea el enum completo desde el schema.
- **Estado:** ✅ Resuelto.

### BUG‑03 — Seed fallaba en Docker (`Unknown file extension ".ts"`)
- **Descripción:** el entrypoint ejecutaba `ts-node prisma/seed.ts`, que fallaba por configuración TS/ESM en el contenedor.
- **Impacto:** Alto — auth-service no completaba la inicialización (sin datos semilla).
- **Solución aplicada:** el seed se **precompila a CommonJS** (`prisma/dist/seed.js`) durante el build y el entrypoint lo ejecuta con `node`. La generación es idempotente (si ya hay datos, continúa sin fallar).
- **Estado:** ✅ Resuelto.

### BUG‑04 — Ruta incorrecta de `main.js` en Docker
- **Descripción:** los Dockerfiles arrancaban `dist/apps/<svc>/src/main.js`, ruta inexistente. La salida real de `tsc` es `apps/<svc>/dist/<svc>/src/main.js` (el *common root* de los inputs es `apps/`).
- **Impacto:** Crítico — `Cannot find module … main.js`; los servicios no arrancaban.
- **Solución aplicada:** se corrigieron los `CMD` de los Dockerfiles y los scripts `start` a la ruta real.
- **Estado:** ✅ Resuelto.

### BUG‑05 — Tailwind: `The 'bg-pearl' class does not exist`
- **Descripción:** el color `pearl` estaba declarado como string en `tailwind.config.js`; en JIT, `@apply bg-pearl` no resolvía y rompía el frontend con overlay de Vite.
- **Impacto:** Alto — frontend no compilaba.
- **Solución aplicada:** `pearl` se convirtió a objeto con `DEFAULT` (+ shades), asegurando que `bg-pearl`/`text-pearl`/`border-pearl` resuelvan. Verificado en el CSS compilado.
- **Estado:** ✅ Resuelto.

### BUG‑06 — Conflicto de puertos (3000 vs 3001/3003)
- **Descripción:** los `main.ts` usaban fallback `?? process.env.PORT ?? …`; con `PORT=3000` heredado en `.env`, auth-service intentaba escuchar en 3000 (`EADDRINUSE`).
- **Impacto:** Alto — colisión de puertos al levantar microservicios.
- **Solución aplicada:** se eliminó el fallback a `PORT`; cada servicio usa solo su variable (`AUTH_SERVICE_PORT`/`CATALOG_SERVICE_PORT`/`BOOKING_SERVICE_PORT`) y se quitó `PORT=3000` de `.env`/`.env.example`.
- **Estado:** ✅ Resuelto.

### BUG‑07 — `npm install` inestable en build Docker (ECONNRESET)
- **Descripción:** `RUN npm install` fallaba intermitentemente por red (`ECONNRESET`), agravado por instalaciones en paralelo de los 4 servicios.
- **Impacto:** Medio/Alto — builds no reproducibles.
- **Solución aplicada:** se migró a `npm ci --prefer-offline --no-audit --no-fund` con copia previa de manifiestos (caché de capas) y `fetch-retries`/timeouts configurados; `package-lock.json` resincronizado.
- **Estado:** ✅ Resuelto.

---

## 5. Resultado final de QA

- **Bugs críticos:** 0 abiertos (BUG‑01, BUG‑04 resueltos).
- **Bugs altos:** 0 abiertos (BUG‑02, BUG‑03, BUG‑05, BUG‑06 resueltos).
- **Compilación:** los 5 workspaces compilan sin errores (`tsc` rc=0, `vite build` rc=0).
- **Arquitectura:** sin dependencias cruzadas inválidas entre microservicios.
- **Funcionalidad core:** operativa según `TEST_CASES.md`.

---

## 6. Riesgos residuales

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Logout sin invalidación de token en servidor (sin denylist) | Media | Expiración corta (2 h); denylist en versión futura |
| Bundle frontend > 500 kB (Recharts) | Baja | Code‑splitting futuro; no afecta funcionalidad |
| Métricas calculadas en memoria (sin caché) | Baja | Suficiente para MVP; agregaciones SQL/caché a escala |
| Exportación no auditada (EXPORT fuera del catálogo de 17 eventos) | Baja | Documentado; ampliar catálogo si se requiere |
| Reservas recurrentes no implementadas (campos reservados) | Baja | Mejora futura documentada |

---

## 7. Conclusión

OfficeSpace alcanzó un estado **estable y demostrable**: arquitectura de microservicios funcional, anti‑solapamiento garantizado a nivel de datos, control de asistencia operativo y despliegue de un comando con Docker. Todos los defectos detectados durante el desarrollo fueron corregidos y verificados. Los riesgos residuales son de severidad baja/media y no bloquean la operación ni la evaluación del hackathon.

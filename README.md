<div align="center">

# 🏢 OfficeSpace
### Sistema Inteligente de Experiencia de Espacios de Trabajo

**IBM Hackathon 2026**

Reserva, colabora y trabaja mejor — con verificación real de asistencia.

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](#)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](#)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](#licencia)

</div>

---

## 📌 Descripción

**OfficeSpace** es una plataforma web empresarial para gestionar la reserva de espacios corporativos (salas de juntas, escritorios, cabinas, áreas de coworking) en organizaciones con modelo de trabajo híbrido. Va más allá de una agenda de reservas: **verifica si la persona realmente asistió** a la oficina, generando métricas de ocupación y asistencia reales para la toma de decisiones.

Construido como **arquitectura de microservicios** con base de datos compartida, JWT, control de roles, Swagger y orquestación con Docker Compose.

## 👥 Equipo

| Integrante | Rol |
|------------|-----|
| **Portillo Mejía Christian Ariel** | Desarrollo Full‑Stack / Arquitectura / DevOps / QA |

Proyecto desarrollado para el **IBM Hackathon 2026**.

---

## ❗ Problema que resuelve

Las empresas con trabajo híbrido administran sus espacios con hojas de cálculo y procesos manuales, lo que provoca:

- **Duplicidad de reservas** (dos equipos en la misma sala).
- **Espacios subutilizados** y *no‑shows* (reservas que nadie usa).
- **Falta de visibilidad** sobre quién está realmente en la oficina.
- **Ausencia de control de acceso, auditoría y métricas** confiables.

El dato más valioso —**si el espacio reservado se usó realmente**— normalmente no existe.

## 💡 Solución propuesta

OfficeSpace digitaliza y automatiza la gestión de espacios y añade una capa de **inteligencia de uso**:

1. **Reserva ágil** (menos de 60 segundos) con prevención estricta de solapamientos.
2. **Verificación posterior de asistencia**: el gestor marca cada reserva finalizada como **ATTENDED** o **NO_SHOW**.
3. **Métricas reales**: tasa de asistencia, ocupación, horas pico, espacios más usados.
4. **Gobernanza**: roles, auditoría inmutable, notificaciones internas y exportaciones CSV.

---

## 🏗️ Arquitectura

Arquitectura de **microservicios con base de datos PostgreSQL compartida**. Cada servicio es un proceso independiente (puerto propio, Dockerfile propio, Swagger propio) y valida el mismo `JWT_SECRET`.

```mermaid
flowchart LR
    subgraph Cliente
        FE["🖥️ Frontend<br/>React + Vite + Tailwind<br/>:5173"]
    end

    subgraph Microservicios["Microservicios (NestJS)"]
        AUTH["🔐 auth-service :3001<br/>Auth · Users · Audit · JWT"]
        CAT["🗂️ catalog-service :3002<br/>Spaces · Resources · FAQ"]
        BOOK["📅 booking-service :3003<br/>Bookings · Dashboard · Notifications · Export"]
    end

    DB[("🐘 PostgreSQL :5432<br/>BD compartida + Prisma")]

    FE -->|"/api/v1/auth/*"| AUTH
    FE -->|"/api/v1/spaces · resources · chatbot"| CAT
    FE -->|"/api/v1/bookings · dashboard · notifications · export"| BOOK

    AUTH --> DB
    CAT --> DB
    BOOK --> DB
```

### Componentes

- **Frontend (React + TypeScript + Vite + TailwindCSS, :5173)** — SPA con React Router, React Query y Axios. Tres clientes HTTP (uno por microservicio) que adjuntan el JWT y manejan el 401 globalmente.
- **auth-service (:3001)** — autenticación JWT, gestión de usuarios, roles/permisos y **auditoría** (registro inmutable). Aplica el rate‑limiting de login.
- **catalog-service (:3002)** — CRUD de **espacios** y **recursos** (borrado lógico) y **Bot FAQ** (búsqueda sin acentos con `f_unaccent` + trigram, sin IA externa).
- **booking-service (:3003)** — núcleo del negocio: **reservas**, validación de disponibilidad, **anti‑solapamiento doble** (aplicación + *exclusion constraint* PostgreSQL), **dashboard/métricas**, **notificaciones** internas, **exportaciones CSV** y **control de asistencia** (ATTENDED/NO_SHOW).
- **PostgreSQL (:5432)** — base compartida administrada con **Prisma** (schema, migraciones, seed) y reglas a nivel de datos (constraints, índices, triggers).

---

## 🧰 Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router, React Query, React Hook Form, Zod, Recharts, Axios |
| Backend | NestJS 10, TypeScript, Passport‑JWT, class‑validator, @nestjs/throttler, Swagger (OpenAPI) |
| ORM / DB | Prisma 5, PostgreSQL 15 (`btree_gist`, `pg_trgm`, `unaccent`) |
| Infraestructura | Docker, Docker Compose, Nginx (servir el frontend) |
| Calidad | Jest, Supertest, ESLint, Prettier |

---

## 🧩 Microservicios y puertos

| Servicio | Puerto | Swagger | Responsabilidad |
|----------|--------|---------|-----------------|
| auth-service | 3001 | http://localhost:3001/api-docs | Auth, Users, Audit |
| catalog-service | 3002 | http://localhost:3002/api-docs | Spaces, Resources, Chatbot FAQ |
| booking-service | 3003 | http://localhost:3003/api-docs | Bookings, Dashboard, Notifications, Export |
| frontend | 5173 | — | Interfaz web |
| postgres | 5432 | — | Base de datos compartida |

---

## ⚙️ Instalación local (sin Docker)

Requisitos: **Node.js ≥ 20**, **npm ≥ 10**, **PostgreSQL 15**.

```bash
cd officespace
cp .env.example .env            # completar JWT_SECRET y DATABASE_URL
npm install
npm run prisma:generate
npx prisma migrate dev --name init
#   crear y aplicar la migración SQL personalizada (constraints anti-solapamiento):
npm run prisma:migrate:create -- --name constraints_and_hardening
#   pegar prisma/sql/0002_constraints_and_hardening.sql en el migration.sql generado
npm run prisma:migrate
npm run prisma:seed
# 4 terminales:
npm run dev:auth        # 3001
npm run dev:catalog     # 3002
npm run dev:booking     # 3003
npm run dev:frontend    # 5173
```

> Guía detallada para macOS (Apple Silicon): `GUIA_Backend_Local_macOS_M1.md`.

---

## 🔐 Variables de entorno

Copiar `.env.example` → `.env`. Variables principales:

```dotenv
NODE_ENV=development
TZ=America/Mexico_City

# Base de datos compartida (PostgreSQL)
DATABASE_URL=postgresql://officespace:officespace2025!@localhost:5432/officespace?schema=public

# JWT (el MISMO secreto en los 3 microservicios)
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=2h

# Rate limiting de login
THROTTLE_TTL=900
THROTTLE_LIMIT=5

# Puertos de microservicios
AUTH_SERVICE_PORT=3001
CATALOG_SERVICE_PORT=3002
BOOKING_SERVICE_PORT=3003

# CORS y URLs del frontend
CORS_ORIGIN=http://localhost:5173
VITE_AUTH_URL=http://localhost:3001/api/v1
VITE_CATALOG_URL=http://localhost:3002/api/v1
VITE_BOOKING_URL=http://localhost:3003/api/v1

# OfficeSpace Assistant · IBM Watson Assistant (OPCIONAL)
# Vacías => motor local rule-based. Completas => Watson v2 con fallback a local.
IBM_WATSON_ASSISTANT_API_KEY=
IBM_WATSON_ASSISTANT_URL=
IBM_WATSON_ASSISTANT_ID=
IBM_WATSON_ASSISTANT_VERSION=2023-06-15
```

> El archivo `.env` real **no** se versiona (está en `.gitignore` / `.dockerignore`). Las variables `IBM_*` son **opcionales**: sin ellas el asistente funciona con el motor local.

---

## 🐳 Docker (recomendado para evaluación)

Un solo comando levanta **postgres + auth + catalog + booking + frontend**, aplica el schema, las constraints anti‑solapamiento y el seed automáticamente:

```bash
docker compose up --build
```

Reinicio limpio (borra volúmenes/datos):

```bash
docker compose down -v
docker compose build --no-cache --progress=plain
docker compose up
```

Orden de arranque garantizado por healthchecks: **postgres → auth-service (migra + seed) → catalog/booking → frontend**.

---

## 🔑 Credenciales de prueba

| Rol | Email | Password |
|-----|-------|----------|
| **Administrador** | `admin@corporativoalpha.com` | `Admin123` |
| **Colaborador** | `ana.torres@corporativoalpha.com` | `User123` |
| Colaborador (alterno) | `carlos.mendez@corporativoalpha.com` | `User123` |

---

## 🎬 Datos de demostración (dashboard completo)

El seed crea automáticamente un dataset de demo **idempotente** para que el dashboard luzca completo en la presentación. Usa fechas relativas a la fecha actual (siempre vigentes) y los usuarios `admin@corporativoalpha.com`, `ana.torres@corporativoalpha.com` y `carlos.mendez@corporativoalpha.com`.

Qué genera:

- **10 espacios demo** (Sala Ejecutiva Norte, Sala Creativa Menta, Cabina Focus 01/02, Auditorio Ámbar, Sala Sprint Azul, Sala Consejo Graphite, Open Desk Flex A, Laboratorio Innovación en **MANTENIMIENTO**, Sala Training) con recursos en español (WiFi, Pantalla, Proyector, Pizarra, Videoconferencia, Bocinas, HDMI, Café, Aire acondicionado, Mesa colaborativa).
- **~80 reservas** con fechas relativas: reservas de **hoy** (varias activas en la hora actual + pasadas + futuras del día), de **esta semana** (Lun–Vie con horas pico 09–11 y 15–16) y del **mes**, repartidas por estado: `CONFIRMED` (~59), `ATTENDED` (8), `NO_SHOW` (4), `PENDING_APPROVAL` recurrentes (5), `CANCELLED`/liberadas (4). **Nunca se solapan** reservas CONFIRMED en el mismo espacio (respeta la exclusion constraint).
- **Notificaciones** demo para admin y colaboradores (leídas y no leídas).
- **Auditoría** demo (CREATE/CANCEL/RELEASE/APPROVE_BOOKING, MARK_ATTENDED, MARK_NO_SHOW, CREATE/UPDATE/CHANGE_SPACE_STATUS).

**Idempotencia:** los datos demo llevan marcador (`[DEMO_DASHBOARD]` en reservas y notificaciones; `ipAddress = DEMO_SEED` en auditoría) y se **borran y regeneran** en cada ejecución del seed. **No** se borran ni alteran usuarios, roles ni credenciales reales.

Reiniciar la demo desde cero:

```bash
# Local (sin Docker)
npx prisma db seed

# Docker (recrea volumen de BD y re-siembra)
docker compose down -v
docker compose up --build
```

> En Docker el seed se ejecuta como JS compilado (`node prisma/dist/seed.js`). Si editas `prisma/seed.ts`, recompílalo:
> `npx tsc prisma/seed.ts --outDir prisma/dist --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --resolveJsonModule`

---

## 📚 Swagger / OpenAPI

- auth-service → http://localhost:3001/api-docs
- catalog-service → http://localhost:3002/api-docs
- booking-service → http://localhost:3003/api-docs

---

## 🔄 Flujo principal

1. **Login** (auth-service) → se emite un JWT (2 h) con `userId`, `email`, `role`.
2. **Colaborador** consulta **Espacios** (catalog-service) filtrando por tipo, capacidad y zona.
3. **Reserva** (booking-service): selecciona fecha/horario/asistentes/motivo; el sistema valida fecha futura, capacidad, estado del espacio, **límite de 5 reservas activas** y **anti‑solapamiento** (rechaza con `409` si choca). Las reservas consecutivas sí se permiten.
4. **Mis Reservas**: el colaborador ve y cancela sus reservas futuras.
5. **Tras finalizar** la reserva, el **gestor** entra a *Reservas por verificar* y marca **ATTENDED** (asistió) o **NO_SHOW** (no asistió).
6. **Dashboard**: métricas en tiempo de consulta (ocupación, horas pico, **tasa de asistencia**) + **auditoría** + **exportación CSV**.

---

## 🚀 Innovación

A diferencia de un sistema de reservas tradicional, OfficeSpace **cierra el ciclo de uso del espacio**: además de reservar, **verifica la asistencia real** (ATTENDED / NO_SHOW) y calcula la **Attendance Rate**. Esto convierte reservas en **datos de ocupación reales** para optimizar espacios, reducir *no‑shows* y planear la capacidad de la oficina. Detalle completo en `INNOVATION.md`.

---

## 🤖 OfficeSpace Assistant (IBM Watson opcional)

Widget de chat flotante disponible en toda la app tras el login, con estilo IBM-like (azul profundo + teal), burbujas de conversación, acciones rápidas contextuales por rol y respuestas con botones de acción (navegación directa). Resuelve dudas sobre reservas, cancelación, estados (ATTENDED, NO_SHOW, PENDING_APPROVAL), liberación de espacios, disponibilidad, aprobaciones recurrentes y dashboard, y enriquece la conversación con datos reales (salas disponibles ahora, solicitudes pendientes).

Endpoint: `POST /api/v1/chatbot/assistant` con `{ message, context: { role, currentPage } }` → `{ answer, suggestions[], action?, engine }`.

**Modo de funcionamiento (dual, a prueba de fallos):**

- **Motor local rule-based** (por defecto): sin IA, sin red, siempre disponible. Reconoce intenciones por palabras clave normalizadas (sin acentos).
- **IBM Watson Assistant** (opcional): si se definen las variables `IBM_WATSON_ASSISTANT_API_KEY`, `IBM_WATSON_ASSISTANT_URL` e `IBM_WATSON_ASSISTANT_ID`, el `catalog-service` llama a Watson Assistant v2 (REST, sin SDK ni librerías pesadas). Si la llamada falla o las variables están vacías, cae automáticamente al motor local. **Nunca se rompe ni requiere credenciales.** No subir credenciales reales al repo.

## 📅 Integración con Google Calendar (sin credenciales)

En **Mis Reservas**, cada reserva `CONFIRMED` o `ATTENDED` ofrece:

- **Agregar a Google Calendar** — abre Google con el evento prellenado mediante enlace seguro (`calendar.google.com/calendar/render?...`). No requiere API keys ni OAuth.
- **Descargar .ics** — `GET /api/v1/bookings/:id/calendar.ics` genera un evento RFC 5545 (TZID `America/Mexico_City`) compatible con cualquier calendario. Solo el dueño o un ADMIN, y solo para reservas `CONFIRMED`/`ATTENDED`.

## 🛠️ Gestión avanzada de espacios y recursos (Admin)

Desde **Espacios**, el ADMIN crea/edita/elimina salas, cambia estado (Disponible / Mantenimiento / Inactiva — el mantenimiento bloquea nuevas reservas), gestiona recursos asignados, crea recursos nuevos y filtra por nombre, tipo, capacidad, piso, zona, estado y recurso. El backend impide desactivar/poner en mantenimiento salas con reservas futuras confirmadas (sugiere usar Mantenimiento o cancelar primero).

---

## 🧠 Decisiones técnicas

- **NestJS** — arquitectura modular (controllers/services/repositories), DI y guards que facilitan dividir el dominio en microservicios reutilizando el código.
- **PostgreSQL** — soporta **exclusion constraints** (`btree_gist`) para garantizar a nivel de datos que **nunca** existan dos reservas confirmadas solapadas, incluso ante condiciones de carrera; y `pg_trgm`/`unaccent` para el FAQ.
- **Prisma** — modelo tipado, migraciones reproducibles y seed; productividad alta con TypeScript de punta a punta.
- **JWT** — autenticación sin estado, ideal para microservicios: cada servicio valida el token con el mismo secreto sin llamadas entre servicios.
- **Docker Compose** — entorno reproducible de un comando; healthchecks ordenan el arranque (DB → auth → resto).
- **Microservicios con BD compartida** — separación de responsabilidades por dominio (auth/catalog/booking) manteniendo transacciones simples y consistencia, adecuado para el alcance del hackathon.

---

## 🔭 Posibles mejoras futuras

- Check‑in con **QR** o geolocalización para automatizar la asistencia.
- **WebSockets** para notificaciones y disponibilidad en tiempo real.
- **Reservas recurrentes** con aprobación (campos ya reservados en el modelo).
- Exportación a **Excel** y reportes programados.
- **API Gateway** y *service discovery*; extracción a microservicios con BD independiente.
- **Refresh tokens** y *denylist* de JWT al cerrar sesión.
- Integración con **Google Calendar / Outlook**.

---

## 📄 Licencia

Distribuido bajo licencia **MIT**. Ver sección [Licencia](#licencia).

```
MIT License — Copyright (c) 2026 Portillo Mejía Christian Ariel
Se concede permiso para usar, copiar, modificar y distribuir este software
con fines del IBM Hackathon 2026.
```

---

## 📑 Documentación complementaria

| Documento | Contenido |
|-----------|-----------|
| `ARCHITECTURE.md` | Diagramas Mermaid y ASCII |
| `TEST_CASES.md` | Casos de prueba manuales |
| `GHERKIN_SCENARIOS.md` | Escenarios BDD (Gherkin) |
| `QA_REPORT.md` | Reporte de calidad y bugs resueltos |
| `INNOVATION.md` | Detalle de la innovación (control de asistencia) |
| `DELIVERY_CHECKLIST.md` | Checklist de entrega del hackathon |

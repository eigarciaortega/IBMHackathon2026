# 🏢 OfficeSpace — Sistema de Gestión Híbrida Inteligente
### IBM Hackathon 2026 · Escenario 1 · Corporativo Alpha

---

## Resumen Ejecutivo

**OfficeSpace** es un MVP de plataforma corporativa para la gestión inteligente de espacios de trabajo híbridos. Diseñado para **Corporativo Alpha**, el sistema permite a colaboradores reservar salas y escritorios en tiempo real, mientras otorga a los administradores control total sobre la disponibilidad, el mantenimiento y el análisis de ocupación.

El sistema resuelve los tres puntos de dolor críticos de la gestión híbrida:

- **Conflictos de reserva** eliminados con validación de solapamiento en base de datos.
- **Uso ineficiente** mitigado con liberación automática por no-show y sugerencias inteligentes.
- **Visibilidad operativa** garantizada con dashboard en tiempo real y estados de mantenimiento.

---

## Arquitectura y Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                     │
│              Angular 18 · puerto 4200                    │
└───────────────────┬─────────────────┬───────────────────┘
                    │                 │
         ┌──────────▼──────┐ ┌───────▼─────────┐
         │ catalog-service │ │ booking-service  │
         │  NestJS 10      │ │  NestJS 10       │
         │  puerto 3011    │ │  puerto 3012     │
         └──────────┬──────┘ └───────┬──────────┘
                    │                │
         ┌──────────▼────────────────▼──────────┐
         │       PostgreSQL 15 (Docker)          │
         │  Base de datos compartida · 5434      │
         └──────────────────────────────────────┘
```

### Decisión de Arquitectura: Microservicios con BD Compartida

Se optó por el patrón **Shared Database** (BD compartida entre microservicios) en lugar de una BD por servicio. Esta decisión fue deliberada y técnicamente justificada:

| Criterio | BD por servicio | BD Compartida ✅ |
|---|---|---|
| Consistencia transaccional | Eventual (requiere coordinación) | Inmediata — ACID nativo de PostgreSQL |
| Complejidad de despliegue | Alta (múltiples instancias de BD) | Baja (un solo contenedor) |
| Velocidad de desarrollo | Lenta | Alta |
| Anti-solapamiento de reservas | Query entre servicios | Una sola query atómica en BD |

> **Nota sobre consistencia:** al compartir la misma BD, todas las operaciones se benefician de las garantías **ACID de PostgreSQL** de forma nativa. No se requiere ningún mecanismo de coordinación distribuida porque no existe estado distribuido: ambos servicios leen y escriben en las mismas tablas dentro de la misma transacción de base de datos.

El `catalog-service` gestiona espacios y autenticación; el `booking-service` gestiona reservas. Ambos acceden a las tablas `spaces`, `users` y `bookings` en la misma instancia PostgreSQL. TypeORM con `synchronize: true` gestiona las migraciones de esquema automáticamente.

### Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular | 18 |
| Backend | NestJS + TypeORM | 10 |
| Autenticación | PassportJS + JWT + bcrypt | — |
| Documentación API | @nestjs/swagger (OpenAPI 3.0) | 7.4 |
| Base de datos | PostgreSQL | 15 |
| Contenedores | Docker + Docker Compose | — |
| Estilos | Carbon Design System (custom SCSS) | — |

---

## Resolución del Core de Negocio

### 1. Anti-Solapamiento de Reservas

El corazón del motor de reservas es una query de solapamiento ejecutada en la capa de persistencia, **antes** de insertar cualquier registro:

```sql
SELECT booking FROM bookings booking
WHERE booking.space_id = :spaceId
  AND booking.start_time < :endTime
  AND booking.end_time   > :startTime
  AND booking.status    != 'NO_SHOW'
  AND booking.status    != 'CANCELLED'
```

La lógica `start < newEnd AND end > newStart` garantiza la detección de cualquier tipo de solapamiento (parcial, total o envolvente). Las reservas con estado `NO_SHOW` y `CANCELLED` se excluyen explícitamente para no bloquear slots vacíos.

**Respuesta:** `409 Conflict` con el rango de la reserva conflictiva, para que el frontend pueda informar al usuario exactamente qué horario está tomado.

### 2. Validaciones de Negocio

Aplicadas como guard chain en `bookings.service.ts` antes de persistir:

- **Fecha en el pasado** → `400 Bad Request`
- **Hora de fin ≤ hora de inicio** → `400 Bad Request`
- **Espacio inexistente** → `404 Not Found`
- **Asistentes > capacidad del espacio** → `400 Bad Request` (incluye nombre del espacio y límite)
- **Espacio en mantenimiento durante el slot solicitado** → `400 Bad Request` (incluye fecha de reactivación)

### 3. Autenticación JWT Basada en Roles

```
POST /auth/login  →  { access_token: "eyJ...", user: { role: "ADMINISTRADOR" } }
```

El `catalog-service` emite tokens JWT firmados con `JWT_SECRET` compartido. El `booking-service` verifica el mismo secreto sin llamar al catalog-service, logrando **autenticación stateless sin acoplamiento entre servicios**.

```
Payload JWT: { sub: userId, email, role: "ADMINISTRADOR" | "COLABORADOR" }
```

**Guard de roles:** `RolesGuard` + decorador `@Roles(UserRole.ADMINISTRADOR)` protege todos los endpoints de escritura de spaces y el endpoint de reasignación de reservas.

---

## 🚀 Innovaciones y Valor Agregado

### 1. Motor de Sugerencias Inteligente (Bot)

Un algoritmo de recomendación basado en **análisis de uso histórico** que sugiere automáticamente los 3 mejores horarios disponibles para el día siguiente:

**Algoritmo:**
1. Consulta el conteo de reservas por espacio en los últimos 7 días.
2. Ordena los espacios de **menor a mayor demanda** (prioriza los menos saturados).
3. Para 3 franjas horarias fijas (08:00, 11:00, 14:00), verifica disponibilidad real contra la BD.
4. Retorna hasta 3 sugerencias únicas con nombre del espacio, franja y justificación.

```
GET /bookings/suggestions
→ [{ spaceId, spaceName, date, startTime, endTime, label, reason }]
```

El resultado se presenta en el frontend como un panel colapsable que autocompIeta el formulario de búsqueda con un solo clic.

### 2. Integración Nativa con Calendarios Corporativos

Al confirmar una reserva, el sistema genera **deep-links directos** a Google Calendar y Microsoft Outlook sin requerir ninguna instalación ni descarga:

```
Google Calendar:
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text=Reserva+OfficeSpace+-+{spaceName}
  &dates={YYYYMMDDTHHMMSSZ}/{YYYYMMDDTHHMMSSZ}
  &details=Sala+{name}+·+Piso+{floor}+·+{capacity}+personas

Outlook Web:
https://outlook.live.com/calendar/0/action/compose
  ?subject=Reserva+OfficeSpace+-+{spaceName}
  &startdt={ISO}&enddt={ISO}&body=...
```

Ambos botones abren el evento **pre-cargado** en el calendario del usuario en una nueva pestaña. Se mantiene la generación de `.ics` como fallback para clientes de escritorio.

### 3. Estados de Mantenimiento con Soft-Block Inteligente

El sistema implementa **bloqueo suave** de espacios dañados sin eliminar ni cancelar el historial de reservas:

**Flujo completo del administrador:**
1. Selecciona el espacio → "Poner en mantenimiento" → ingresa motivo + fecha de reactivación.
2. El sistema activa `is_under_maintenance = true` y guarda `maintenance_until` + `maintenance_reason`.
3. **Automáticamente** consulta todas las reservas futuras confirmadas del espacio (`GET /bookings/affected`).
4. Por cada reserva afectada, busca espacios alternativos disponibles para **el mismo horario y capacidad** (`GET /bookings/:id/alternatives`).
5. El admin selecciona la alternativa y reasigna con un clic (`PATCH /bookings/:id/relocate`).

**Regla de disponibilidad dinámica:** la condición de bloqueo compara `maintenance_until` contra el `start` del slot **buscado**, no contra `now`. Si el mantenimiento termina a las 14:00 y el usuario busca a las 15:00, la sala aparece disponible.

**Auto-reactivación:** al expirar `maintenance_until`, ambos servicios limpian el flag automáticamente en la siguiente operación de búsqueda (lazy release via `UPDATE WHERE maintenance_until <= NOW()`).

### 4. Sistema de Check-in con Liberación Automática por No-Show

Eliminamos el mayor desperdicio de espacio corporativo: la sala reservada pero vacía.

**Ventana de check-in:** el colaborador puede confirmar su presencia desde 5 minutos antes hasta 15 minutos después del inicio de la reserva.

```
POST /bookings/:id/checkin  →  { status: "CHECKED_IN", checked_in_at: "ISO" }
```

**Liberación automática (lazy):** al inicio de cada operación de consulta, `releaseNoShows()` marca como `NO_SHOW` todas las reservas `CONFIRMED` cuyo `start_time < now - 15min`. Estas reservas son excluidas del algoritmo de solapamiento, liberando el espacio instantáneamente.

```
Estados posibles: CONFIRMED → CHECKED_IN
                  CONFIRMED → NO_SHOW   (automático si no hubo check-in a tiempo)
                  CONFIRMED → CANCELLED (por el usuario o el administrador)
```

El frontend muestra el botón de check-in solo dentro de la ventana válida y presenta badges de color diferenciados por cada estado.

---

## Documentación de API (Swagger)

Ambos microservicios exponen documentación interactiva OpenAPI 3.0:

| Servicio | URL (desarrollo local) | Descripción |
|---|---|---|
| Catalog Service | **http://localhost:3011/api-docs** | Espacios, usuarios, autenticación |
| Booking Service | **http://localhost:3012/api-docs** | Reservas, disponibilidad, check-in, mantenimiento |

**Flujo de autenticación en Swagger:**
1. Ir a `http://localhost:3011/api-docs`
2. Ejecutar `POST /auth/login` con las credenciales de prueba.
3. Copiar el `access_token` del response.
4. Hacer clic en **Authorize** (🔒) → pegar el token.
5. Todos los endpoints quedan autenticados en la sesión.

El mismo token funciona en `http://localhost:3012/api-docs` (mismo `JWT_SECRET`).

### Resiliencia contra bugs clásicos de motores de reserva

| Bug clásico | Mitigación implementada |
|---|---|
| Double-booking (race condition) | Query de solapamiento atómica en BD relacional |
| Sala "fantasma" ocupada para siempre | No-show auto-release en cada operación de lectura |
| Reserva en el pasado | Validación `start_time > now` en capa de servicio |
| Capacidad ignorada | Validación `attendees <= space.capacity` antes de insertar |
| Mantenimiento bloquea fechas futuras libres | Comparación `maintenance_until > slotStart`, no `> now` |

---

## Instrucciones de Despliegue

### Prerrequisitos

- Docker Desktop 4.x+
- Node.js 20+
- npm 10+

### Opción A — Despliegue completo con Docker (Producción)

```bash
# Clonar el repositorio y entrar al directorio raíz
git clone <repo-url>
cd "IBMHackathon2026 - Frontend"

# Construir imágenes y levantar toda la infraestructura
docker compose up -d --build

# Verificar que los contenedores están healthy
docker compose ps
```

### Opción B — Desarrollo local (Hot reload)

**1. Base de datos**
```bash
cd "IBMHackathon2026 - Frontend"
docker compose up -d postgres
```

**2. Catalog Service**
```bash
cd catalog-service
cp .env.example .env
# Ajustar en .env: DB_PORT=5434  PORT=3011
npm install && npm run start:dev
# Swagger → http://localhost:3011/api-docs
```

**3. Booking Service**
```bash
cd booking-service
cp .env.example .env
# Ajustar en .env: DB_PORT=5434  PORT=3012
npm install && npm run start:dev
# Swagger → http://localhost:3012/api-docs
```

**4. Frontend Angular**
```bash
cd officespace-frontend
npm install && ng serve
# App → http://localhost:4200
```

> El `catalog-service` ejecuta `seedUsers()` en el `onApplicationBootstrap`. Los tres usuarios de prueba se crean automáticamente en el primer arranque si no existen.

---

## Credenciales de Prueba

| Rol | Email | Contraseña | Capacidades |
|---|---|---|---|
| **ADMINISTRADOR** | `admin@corporativoalpha.com` | `Admin123` | CRUD de espacios, todas las reservas, mantenimiento, reasignación |
| **COLABORADOR** | `carlos.mendez@corporativoalpha.com` | `User123` | Buscar espacios, crear/cancelar reservas propias, check-in, bot |
| **COLABORADOR** | `ana.torres@corporativoalpha.com` | `User123` | Igual que carlos — útil para probar solapamiento entre usuarios |

---

## Endpoints Principales

### Catalog Service — `http://localhost:3011`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Autenticación, retorna JWT |
| `POST` | `/auth/register` | Público | Registro de nuevos usuarios |
| `GET` | `/spaces` | Autenticado | Listar todos los espacios |
| `POST` | `/spaces` | ADMIN | Crear espacio |
| `PATCH` | `/spaces/:id` | ADMIN | Actualizar espacio |
| `PATCH` | `/spaces/:id/maintenance` | ADMIN | Activar mantenimiento con motivo y fecha |
| `DELETE` | `/spaces/:id/maintenance` | ADMIN | Reactivar espacio manualmente |
| `DELETE` | `/spaces/:id` | ADMIN | Eliminar espacio |

### Booking Service — `http://localhost:3012`

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/bookings/spaces/available` | Autenticado | Espacios disponibles para un horario dado |
| `POST` | `/bookings` | Autenticado | Crear reserva (con anti-solapamiento) |
| `GET` | `/bookings/my` | Autenticado | Mis reservas |
| `GET` | `/bookings/suggestions` | Autenticado | Bot de sugerencias de horario |
| `POST` | `/bookings/:id/checkin` | Autenticado | Confirmar llegada (ventana ±15 min) |
| `GET` | `/bookings/affected?spaceId=` | ADMIN | Reservas futuras afectadas por mantenimiento |
| `GET` | `/bookings/:id/alternatives` | ADMIN | Espacios alternativos para reubicar una reserva |
| `PATCH` | `/bookings/:id/relocate` | ADMIN | Reasignar reserva a espacio alternativo |
| `GET` | `/bookings/today` | Autenticado | Reservas del día (Dashboard de ocupación) |
| `DELETE` | `/bookings/:id` | Autenticado | Cancelar reserva propia (admin: cualquiera) |

---

## Estructura del Monorepo

```
IBMHackathon2026 - Frontend/
├── catalog-service/          # NestJS — Espacios + Autenticación
│   └── src/
│       ├── auth/             # JWT strategy, Guards, Decorators
│       ├── users/            # Entidad User, Roles, Seed automático
│       └── spaces/           # CRUD + Mantenimiento soft-block
├── booking-service/          # NestJS — Motor de Reservas
│   └── src/
│       ├── auth/             # JWT Guard (verifica token del catalog)
│       ├── spaces/           # Espejo de entidad Space (solo lectura)
│       └── bookings/         # Reservas, Check-in, Sugerencias, Reasignación
├── officespace-frontend/     # Angular 18 — SPA
│   └── src/app/
│       ├── core/             # Modelos, Servicios, Interceptors JWT
│       ├── features/
│       │   ├── auth/         # Login
│       │   ├── search/       # Búsqueda de espacios + Bot de sugerencias
│       │   ├── booking/      # Confirmar reserva + Mis reservas + Check-in
│       │   └── admin/        # Dashboard de ocupación + CRUD + Mantenimiento
│       └── shared/           # SpaceCard, Layout, Navbar
├── shared-infra/
│   └── init-db.sql           # Inicialización de PostgreSQL + extensiones
└── docker-compose.yml        # Orquestación completa del stack
```

---

*Desarrollado para IBM Hackathon 2026 — Escenario 1: Gestión Híbrida de Espacios Corporativos.*

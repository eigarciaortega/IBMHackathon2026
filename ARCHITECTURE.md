# Arquitectura — OfficeSpace

Sistema de **microservicios con base de datos PostgreSQL compartida**. Cada servicio es un proceso NestJS independiente, con su propio puerto, Dockerfile y Swagger, y valida el mismo `JWT_SECRET`.

---

## Diagrama Mermaid (pegar en GitHub)

```mermaid
flowchart TB
    user(["👤 Usuario<br/>Admin / Colaborador"])

    subgraph CLIENT["Cliente"]
        FE["🖥️ Frontend SPA<br/>React + Vite + Tailwind<br/>Puerto 5173"]
    end

    subgraph SERVICES["Microservicios — NestJS"]
        AUTH["🔐 auth-service · 3001<br/>Auth · Users · Audit<br/>JWT · Roles · Throttler"]
        CAT["🗂️ catalog-service · 3002<br/>Spaces · Resources · FAQ"]
        BOOK["📅 booking-service · 3003<br/>Bookings · Dashboard<br/>Notifications · Export<br/>Asistencia (ATTENDED/NO_SHOW)"]
    end

    DB[("🐘 PostgreSQL · 5432<br/>BD compartida<br/>Prisma + Exclusion Constraint")]

    user --> FE
    FE -->|"POST /api/v1/auth/login (JWT)"| AUTH
    FE -->|"Bearer JWT · /spaces /resources /chatbot"| CAT
    FE -->|"Bearer JWT · /bookings /dashboard /notifications /export"| BOOK

    AUTH -->|"Prisma"| DB
    CAT -->|"Prisma"| DB
    BOOK -->|"Prisma"| DB

    classDef svc fill:#11635d,stroke:#0d1018,color:#fff;
    classDef db fill:#1e3a8a,stroke:#0d1018,color:#fff;
    classDef fe fill:#199b8e,stroke:#0d1018,color:#fff;
    class AUTH,CAT,BOOK svc;
    class DB db;
    class FE fe;
```

### Flujo de una reserva (secuencia)

```mermaid
sequenceDiagram
    participant U as Colaborador
    participant FE as Frontend (5173)
    participant A as auth-service (3001)
    participant C as catalog-service (3002)
    participant B as booking-service (3003)
    participant DB as PostgreSQL (5432)

    U->>FE: Inicia sesión
    FE->>A: POST /api/v1/auth/login
    A->>DB: Verifica credenciales (bcrypt)
    A-->>FE: JWT (2h)
    U->>FE: Busca espacios
    FE->>C: GET /api/v1/spaces (Bearer JWT)
    C->>DB: SELECT spaces
    C-->>FE: Lista de espacios
    U->>FE: Confirma reserva
    FE->>B: POST /api/v1/bookings (Bearer JWT)
    B->>DB: Validación + Exclusion Constraint
    alt Sin solapamiento
        DB-->>B: OK (201)
        B-->>FE: Reserva CONFIRMED
    else Solapamiento
        DB-->>B: Violación constraint
        B-->>FE: 409 Conflict
    end
    Note over B,DB: Tras finalizar, el gestor marca ATTENDED / NO_SHOW
```

---

## Diagrama ASCII (documentación textual)

```
                                   ┌──────────────────────────────┐
                                   │            USUARIO            │
                                   │     Admin / Colaborador       │
                                   └───────────────┬──────────────┘
                                                   │ HTTPS
                                                   ▼
                          ┌──────────────────────────────────────────┐
                          │   FRONTEND  (React + Vite + Tailwind)      │
                          │                Puerto 5173                 │
                          └───────┬───────────────┬───────────────┬────┘
              Bearer JWT          │               │               │
        ┌─────────────────────────┘               │               └─────────────────────────┐
        ▼                                          ▼                                          ▼
┌────────────────────┐              ┌────────────────────────┐              ┌────────────────────────────┐
│   auth-service      │              │   catalog-service       │              │     booking-service         │
│      :3001          │              │       :3002             │              │        :3003                │
│  /api/v1/auth       │              │  /api/v1/spaces         │              │  /api/v1/bookings           │
│  /api/v1/users      │              │  /api/v1/resources      │              │  /api/v1/dashboard          │
│  /api/v1/audit      │              │  /api/v1/chatbot        │              │  /api/v1/notifications      │
│  JWT · Roles        │              │  Borrado lógico · FAQ   │              │  /api/v1/export             │
│  Throttler          │              │                         │              │  Asistencia ATTENDED/NO_SHOW│
│  /api-docs          │              │  /api-docs              │              │  /api-docs                  │
└─────────┬──────────┘              └───────────┬─────────────┘              └──────────────┬──────────────┘
          │ Prisma                              │ Prisma                                    │ Prisma
          └─────────────────────────────────────┼───────────────────────────────────────────┘
                                                 ▼
                          ┌──────────────────────────────────────────┐
                          │   PostgreSQL 15  (Base de Datos compartida) │
                          │                Puerto 5432                  │
                          │  Tablas: roles, users, spaces, resources,   │
                          │  space_resources, bookings, audit_logs,     │
                          │  notifications, chatbot_faq                 │
                          │  Reglas: EXCLUDE no_overlapping_bookings,   │
                          │  CHECKs, índices, triggers audit inmutable  │
                          └──────────────────────────────────────────┘

Comunicación:
  Frontend  --HTTP/JSON + Bearer JWT-->  auth | catalog | booking
  Cada microservicio  --Prisma-->  PostgreSQL (misma BD)
  JWT_SECRET compartido: cada servicio valida el token localmente (sin llamadas internas)
```

---

## Modelo de datos (entidades principales)

```
roles ──1:N── users ──1:N── bookings ──N:1── spaces ──N:M── resources
                  │                                  (space_resources)
                  ├─1:N── audit_logs
                  └─1:N── notifications
chatbot_faq (independiente)
```

- **Borrado lógico** en users, spaces, resources (campo `status`).
- **Exclusion Constraint** `no_overlapping_bookings` (`WHERE status='CONFIRMED'`) → anti‑solapamiento a nivel de datos.
- **Auditoría inmutable**: triggers que impiden `UPDATE`/`DELETE` en `audit_logs`.
- Estados de reserva: `CONFIRMED`, `ATTENDED`, `NO_SHOW`, `CANCELLED`, `FINISHED` (derivado), `PENDING_APPROVAL` (reservado).

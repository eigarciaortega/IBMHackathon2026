# Modelo de datos

OfficeSpace usa PostgreSQL compartido entre microservicios. El modelo se mantiene deliberadamente simple para el MVP del hackathon: usuarios, espacios, reservas y trazabilidad de busquedas del asistente.

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : creates
  USERS ||--o{ ASSISTANT_LOGS : searches
  SPACES ||--o{ BOOKINGS : is_reserved

  USERS {
    uuid id PK
    varchar email UK
    text password_hash
    varchar full_name
    varchar role
    timestamptz created_at
  }

  SPACES {
    uuid id PK
    varchar name
    varchar type
    integer capacity
    varchar floor
    boolean has_projector
    boolean has_ac
    boolean has_screen
    boolean has_whiteboard
    boolean is_quiet_zone
    text description
    boolean active
    timestamptz created_at
    timestamptz updated_at
  }

  BOOKINGS {
    uuid id PK
    uuid space_id FK
    uuid user_id FK
    date date
    time start_time
    time end_time
    integer attendees
    varchar status
    timestamptz created_at
    timestamptz updated_at
  }

  ASSISTANT_LOGS {
    uuid id PK
    uuid user_id FK
    text query_text
    varchar intent
    varchar detected_type
    integer detected_capacity
    date detected_date
    varchar detected_time_preference
    text_array detected_resources
    timestamptz created_at
  }
```

## Reglas relevantes

- `users.role` solo permite `ADMINISTRADOR` o `COLABORADOR`.
- `spaces.type` solo permite `SALA` o `DESK`.
- `spaces.capacity` debe ser mayor a `0`.
- `bookings.status` solo permite `ACTIVE` o `CANCELLED`.
- `bookings.end_time` debe ser mayor que `bookings.start_time`.
- La regla de no solapamiento se aplica en `booking-service` contra reservas `ACTIVE`:

```text
new_start < existing_end AND new_end > existing_start
```

## Indices principales

- `idx_bookings_space_time`: acelera la busqueda de reservas activas por espacio, fecha e intervalo.
- `idx_bookings_user`: acelera la vista "Mis reservas".
- `idx_assistant_logs_created_at`: acelera las metricas y busquedas recientes de Alpha Assistant.

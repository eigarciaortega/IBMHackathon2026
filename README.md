# OfficeSpace — Gestión Híbrida Inteligente

Sistema de reservas de espacios de trabajo híbrido para **Corporativo Alpha**. Permite a los colaboradores reservar salas y escritorios, y a los administradores gestionar el inventario de espacios.

---

## Arquitectura

```
┌─────────────┐     JWT      ┌──────────────────────────────────────────┐
│   Frontend  │ ──────────── │              API Gateway (puertos)        │
│   Angular   │              │  auth-service :8083  catalog-service :8081│
└─────────────┘              │  booking-service :8082                    │
                             └──────────────────┬───────────────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │   PostgreSQL :5432     │
                                    │   DB: officeSpace      │
                                    └───────────────────────┘
```

### Microservicios

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| `auth-service` | 8083 | Autenticación JWT, gestión de usuarios |
| `catalog-service` | 8081 | CRUD de espacios (salas y escritorios) |
| `booking-service` | 8082 | Motor de reservas con detección de solapamientos |

### Decisiones de diseño

- **Dual-ID pattern**: cada entidad tiene un `id` interno (BIGSERIAL, usado en FKs) y un `publicId` (UUID, expuesto en la API) para evitar enumeración.
- **JWT stateless**: el `auth-service` firma el token; `catalog-service` y `booking-service` lo validan localmente con el mismo secreto. No hay llamadas entre servicios para autenticar.
- **Soft delete**: los espacios se desactivan (`active = false`) en lugar de borrarse.
- **Única llamada inter-servicio**: `booking-service` consulta a `catalog-service` para validar capacidad al crear una reserva (`CatalogClient.java`).

---

## Stack tecnológico

- **Backend**: Java 21 · Spring Boot 4.1.0 · Spring Security 7 · Spring Data JPA
- **Base de datos**: PostgreSQL 16 con campo JSONB para atributos de espacios
- **Autenticación**: JWT (jjwt 0.12.6) con roles `ADMIN` y `COLLABORATOR`
- **Documentación API**: SpringDoc OpenAPI 2.8.9 (Swagger UI)
- **Frontend**: Angular
- **Contenedores**: Docker + Docker Compose

---

## Requisitos previos

- Java 21
- Maven (o usar `./mvnw` incluido)
- PostgreSQL 16 (para ejecución local) o Docker

---

## Ejecución local

### 1. Base de datos

```sql
CREATE DATABASE "officeSpace";
```

### 2. Levantar servicios

```bash
# Terminal 1
cd authService && ./mvnw spring-boot:run

# Terminal 2
cd catalogService && ./mvnw spring-boot:run

# Terminal 3
cd bookingService && ./mvnw spring-boot:run
```

Los servicios crean las tablas automáticamente (`ddl-auto=update`) y ejecutan seeders al primer arranque.

---

## Ejecución con Docker

```bash
# Construir imágenes y levantar todo
docker compose up --build

# Solo levantar (si ya están construidas las imágenes)
docker compose up

# Detener y eliminar contenedores (conserva los datos)
docker compose down

# Detener y eliminar contenedores + volúmenes (borra los datos)
docker compose down -v
```

### Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `JWT_SECRET` | `S3cr3tK3yP4r4H4ck4th0n2026MustBeAtLeast256BitsLong!` | Secreto compartido entre los 3 servicios |
| `DB_PASSWORD` | `Davfeb26022002+` | Contraseña de PostgreSQL |

---

## Usuarios predefinidos (seeder)

| Email | Contraseña | Rol |
|-------|------------|-----|
| `admin@corporativoalpha.com` | `Admin123` | `ADMIN` |
| `carlos.mendez@corporativoalpha.com` | `User123` | `COLLABORATOR` |
| `ana.torres@corporativoalpha.com` | `User123` | `COLLABORATOR` |

---

## API Reference

### auth-service · `localhost:8083`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Público | Retorna JWT |

**Login request:**
```json
{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}
```

**Login response:**
```json
{
  "token": "eyJhbGci...",
  "tokenType": "Bearer",
  "publicId": "uuid",
  "email": "admin@corporativoalpha.com",
  "name": "Admin Alpha",
  "role": "ADMIN"
}
```

---

### catalog-service · `localhost:8081`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | `/api/resources` | Público | Listar espacios (filtros opcionales) |
| GET | `/api/resources/{publicId}` | Público | Detalle de un espacio |
| POST | `/api/resources` | ADMIN | Crear espacio |
| PUT | `/api/resources/{publicId}` | ADMIN | Actualizar espacio |
| DELETE | `/api/resources/{publicId}` | ADMIN | Desactivar espacio (soft delete) |

**Filtros disponibles en GET `/api/resources`:**
- `?type=ROOM` — solo salas
- `?type=DESK` — solo escritorios
- `?minCapacity=8` — capacidad mínima

**Tipos de espacio:** `ROOM`, `DESK`

---

### booking-service · `localhost:8082`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/api/bookings` | Autenticado | Crear reserva |
| GET | `/api/bookings/my` | Autenticado | Mis reservas |
| DELETE | `/api/bookings/{publicId}` | Autenticado (dueño) | Cancelar reserva |
| GET | `/api/bookings/dashboard?date=YYYY-MM-DD` | ADMIN | Todas las reservas de un día |

**Crear reserva:**
```json
{
  "spacePublicId": "uuid-del-espacio",
  "bookingDate": "2026-06-25",
  "startTime": "09:00",
  "endTime": "11:00",
  "attendees": 5,
  "notes": "Reunión de equipo"
}
```

**Validaciones:**
- La fecha no puede ser pasada
- `endTime` debe ser posterior a `startTime`
- `attendees` no puede superar la capacidad del espacio
- No puede haber solapamiento de horario para el mismo espacio

---

## Swagger UI

| Servicio | URL |
|----------|-----|
| auth-service | http://localhost:8083/swagger-ui.html |
| catalog-service | http://localhost:8081/swagger-ui.html |
| booking-service | http://localhost:8082/swagger-ui.html |

Para probar endpoints protegidos: obtén el token con `/api/auth/login` → click en **Authorize** → pega el token.

---

## Tests

```bash
# Ejecutar todos los tests de un servicio
cd authService && ./mvnw test
cd catalogService && ./mvnw test
cd bookingService && ./mvnw test
```

Los tests unitarios usan Mockito (sin contexto Spring, sin base de datos). Los tests de contexto (`contextLoads`) usan H2 en memoria con modo de compatibilidad PostgreSQL.

| Servicio | Tests |
|----------|-------|
| auth-service | 4 (3 unitarios + 1 contexto) |
| catalog-service | 10 (9 unitarios + 1 contexto) |
| booking-service | 14 (13 unitarios + 1 contexto) |

---

## Roles y permisos

| Permiso | ADMIN | COLLABORATOR |
|---------|-------|--------------|
| Gestionar espacios (CRUD) | ✅ | ❌ |
| Ver espacios | ✅ | ✅ |
| Crear reservas | ✅ | ✅ |
| Ver propias reservas | ✅ | ✅ |
| Cancelar propias reservas | ✅ | ✅ |
| Dashboard (todas las reservas) | ✅ | ❌ |

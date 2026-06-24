# API_CONTRACT.md

# OfficeSpace: Gestión Híbrida Inteligente

## Contrato de API REST

---

## 1. Propósito

Este documento define el contrato de API REST del sistema **OfficeSpace: Gestión Híbrida Inteligente**.

Incluye:

* Servicios disponibles.
* Endpoints principales.
* Métodos HTTP.
* Roles permitidos.
* Request body.
* Response body.
* Códigos HTTP esperados.
* Ejemplos de uso.
* Formato estándar de errores.

---

## 2. URLs base

| Servicio        | URL local               |
| --------------- | ----------------------- |
| Auth Service    | `http://localhost:8081` |
| Catalog Service | `http://localhost:8082` |
| Booking Service | `http://localhost:8083` |
| Frontend        | `http://localhost:5173` |

---

## 3. Autenticación

El sistema utiliza autenticación basada en **JWT**.

Después de iniciar sesión correctamente, el backend devuelve un token. Ese token debe enviarse en los endpoints protegidos usando el header:

```http
Authorization: Bearer TOKEN_JWT
```

Ejemplo:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

---

## 4. Roles del sistema

| Rol             | Descripción                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `ADMINISTRADOR` | Puede administrar espacios y consultar todas las reservas                       |
| `COLABORADOR`   | Puede buscar espacios, crear reservas y consultar/cancelar sus propias reservas |

---

## 5. Formato estándar de errores

Todos los microservicios devuelven errores con una estructura común:

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 409,
  "error": "Conflict",
  "message": "El espacio ya está ocupado en ese horario",
  "path": "/bookings"
}
```

### Campos

| Campo       | Tipo   | Descripción                                |
| ----------- | ------ | ------------------------------------------ |
| `timestamp` | string | Fecha y hora del error                     |
| `status`    | number | Código HTTP                                |
| `error`     | string | Nombre del error HTTP                      |
| `message`   | string | Mensaje legible para usuario/desarrollador |
| `path`      | string | Ruta donde ocurrió el error                |

---

## 6. Códigos HTTP usados

| Código | Nombre                | Uso                                             |
| -----: | --------------------- | ----------------------------------------------- |
|  `200` | OK                    | Consulta exitosa                                |
|  `201` | Created               | Recurso creado correctamente                    |
|  `204` | No Content            | Operación exitosa sin cuerpo de respuesta       |
|  `400` | Bad Request           | Datos inválidos o reglas de negocio incumplidas |
|  `401` | Unauthorized          | Token ausente, inválido o expirado              |
|  `403` | Forbidden             | Usuario autenticado sin permisos suficientes    |
|  `404` | Not Found             | Recurso inexistente                             |
|  `409` | Conflict              | Conflicto de reserva por solapamiento           |
|  `500` | Internal Server Error | Error inesperado                                |

---

# 7. Auth Service

Base URL:

```text
http://localhost:8081
```

Responsabilidad:

* Login.
* Generación de JWT.
* Consulta del usuario autenticado.

---

## 7.1. Login

### Endpoint

```http
POST /auth/login
```

### Rol requerido

Público.

### Descripción

Valida credenciales y devuelve un JWT con la información del usuario autenticado.

### Request headers

```http
Content-Type: application/json
```

### Request body

```json
{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}
```

### Validaciones

| Campo      | Regla                      |
| ---------- | -------------------------- |
| `email`    | Obligatorio, formato email |
| `password` | Obligatorio                |

### Response `200 OK`

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "email": "admin@corporativoalpha.com",
    "name": "Administrador",
    "role": "ADMINISTRADOR"
  }
}
```

### Response `401 Unauthorized`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Credenciales inválidas",
  "path": "/auth/login"
}
```

### Response `400 Bad Request`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "email: El correo no tiene un formato válido",
  "path": "/auth/login"
}
```

---

## 7.2. Usuario autenticado

### Endpoint

```http
GET /auth/me
```

### Rol requerido

Usuario autenticado.

### Descripción

Devuelve la información del usuario autenticado usando el JWT enviado en el header.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Response `200 OK`

```json
{
  "id": 1,
  "email": "admin@corporativoalpha.com",
  "name": "Administrador",
  "role": "ADMINISTRADOR"
}
```

### Response `401 Unauthorized`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token requerido o inválido",
  "path": "/auth/me"
}
```

---

# 8. Catalog Service

Base URL:

```text
http://localhost:8082
```

Responsabilidad:

* Gestión de espacios.
* Consulta de espacios.
* Filtros.
* Activación/desactivación de espacios.
* Disponibilidad.

---

## 8.1. Listar espacios

### Endpoint

```http
GET /spaces
```

### Rol requerido

Usuario autenticado.

### Descripción

Devuelve la lista de espacios registrados. Permite filtros opcionales.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Query params opcionales

| Parámetro            | Tipo    | Ejemplo       | Descripción                    |
| -------------------- | ------- | ------------- | ------------------------------ |
| `type`               | string  | `SALA_JUNTAS` | Tipo de espacio                |
| `minCapacity`        | number  | `4`           | Capacidad mínima               |
| `floor`              | number  | `2`           | Piso                           |
| `hasProjector`       | boolean | `true`        | Filtrar por proyector          |
| `hasAirConditioning` | boolean | `true`        | Filtrar por aire acondicionado |
| `status`             | string  | `ACTIVO`      | Estado del espacio             |

### Ejemplo

```http
GET /spaces?type=SALA_JUNTAS&minCapacity=4&status=ACTIVO
```

### Response `200 OK`

```json
[
  {
    "id": 101,
    "name": "Sala Innovación",
    "type": "SALA_JUNTAS",
    "capacity": 8,
    "floor": 3,
    "location": "Edificio A - Piso 3",
    "hasProjector": true,
    "hasAirConditioning": true,
    "hasWhiteboard": true,
    "hasMonitor": true,
    "otherResources": "Sistema de videoconferencia",
    "status": "ACTIVO"
  }
]
```

### Response `401 Unauthorized`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Token requerido o inválido",
  "path": "/spaces"
}
```

---

## 8.2. Consultar espacio por ID

### Endpoint

```http
GET /spaces/{id}
```

### Rol requerido

Usuario autenticado.

### Path params

| Parámetro | Tipo   | Descripción    |
| --------- | ------ | -------------- |
| `id`      | number | ID del espacio |

### Ejemplo

```http
GET /spaces/101
```

### Response `200 OK`

```json
{
  "id": 101,
  "name": "Sala Innovación",
  "type": "SALA_JUNTAS",
  "capacity": 8,
  "floor": 3,
  "location": "Edificio A - Piso 3",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Sistema de videoconferencia",
  "status": "ACTIVO"
}
```

### Response `404 Not Found`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El espacio no existe",
  "path": "/spaces/999"
}
```

---

## 8.3. Crear espacio

### Endpoint

```http
POST /spaces
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Crea un nuevo espacio físico.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Request body

```json
{
  "name": "Sala Dirección",
  "type": "SALA_JUNTAS",
  "capacity": 10,
  "floor": 5,
  "location": "Edificio A - Piso 5",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Cámara para videoconferencia"
}
```

### Validaciones

| Campo      | Regla                                                |
| ---------- | ---------------------------------------------------- |
| `name`     | Obligatorio                                          |
| `type`     | Obligatorio, `SALA_JUNTAS` o `ESCRITORIO_INDIVIDUAL` |
| `capacity` | Obligatorio, mayor a 0                               |
| `floor`    | Obligatorio                                          |
| `location` | Obligatorio                                          |

### Response `201 Created`

```json
{
  "id": 203,
  "name": "Sala Dirección",
  "type": "SALA_JUNTAS",
  "capacity": 10,
  "floor": 5,
  "location": "Edificio A - Piso 5",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Cámara para videoconferencia",
  "status": "ACTIVO"
}
```

### Response `403 Forbidden`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "No tienes permisos para realizar esta acción",
  "path": "/spaces"
}
```

### Response `400 Bad Request`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "capacity: La capacidad debe ser mayor a cero",
  "path": "/spaces"
}
```

---

## 8.4. Actualizar espacio

### Endpoint

```http
PUT /spaces/{id}
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Actualiza los datos de un espacio existente. También se usa para reactivar espacios cambiando `status` a `ACTIVO`.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Path params

| Parámetro | Tipo   | Descripción    |
| --------- | ------ | -------------- |
| `id`      | number | ID del espacio |

### Request body

```json
{
  "name": "Sala Dirección",
  "type": "SALA_JUNTAS",
  "capacity": 10,
  "floor": 5,
  "location": "Edificio A - Piso 5",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Cámara para videoconferencia",
  "status": "ACTIVO"
}
```

### Response `200 OK`

```json
{
  "id": 203,
  "name": "Sala Dirección",
  "type": "SALA_JUNTAS",
  "capacity": 10,
  "floor": 5,
  "location": "Edificio A - Piso 5",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Cámara para videoconferencia",
  "status": "ACTIVO"
}
```

### Response `404 Not Found`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El espacio no existe",
  "path": "/spaces/999"
}
```

---

## 8.5. Desactivar espacio

### Endpoint

```http
DELETE /spaces/{id}
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Realiza baja lógica del espacio. No borra físicamente el registro, solo cambia su estado a `INACTIVO`.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
```

### Response `204 No Content`

Sin cuerpo de respuesta.

### Response `404 Not Found`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El espacio no existe",
  "path": "/spaces/999"
}
```

---

## 8.6. Buscar espacios disponibles

### Endpoint

```http
GET /spaces/available
```

### Rol requerido

Usuario autenticado.

### Descripción

Devuelve espacios activos que no tienen reservas activas solapadas en la fecha y horario solicitados.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Query params obligatorios

| Parámetro   | Tipo | Ejemplo      | Descripción      |
| ----------- | ---- | ------------ | ---------------- |
| `date`      | date | `2026-07-01` | Fecha de reserva |
| `startTime` | time | `09:00`      | Hora de inicio   |
| `endTime`   | time | `10:00`      | Hora de fin      |

### Query params opcionales

| Parámetro     | Tipo   | Ejemplo       | Descripción      |
| ------------- | ------ | ------------- | ---------------- |
| `type`        | string | `SALA_JUNTAS` | Tipo de espacio  |
| `minCapacity` | number | `4`           | Capacidad mínima |

### Ejemplo

```http
GET /spaces/available?date=2026-07-01&startTime=09:00&endTime=10:00&type=SALA_JUNTAS&minCapacity=4
```

### Response `200 OK`

```json
[
  {
    "id": 101,
    "name": "Sala Innovación",
    "type": "SALA_JUNTAS",
    "capacity": 8,
    "floor": 3,
    "location": "Edificio A - Piso 3",
    "hasProjector": true,
    "hasAirConditioning": true,
    "hasWhiteboard": true,
    "hasMonitor": true,
    "otherResources": "Sistema de videoconferencia",
    "status": "ACTIVO"
  }
]
```

### Response `400 Bad Request`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "La hora de fin debe ser mayor que la hora de inicio",
  "path": "/spaces/available"
}
```

---

# 9. Booking Service

Base URL:

```text
http://localhost:8083
```

Responsabilidad:

* Crear reservas.
* Validar reglas de negocio.
* Cancelar reservas.
* Consultar reservas propias.
* Consultar reservas globales.
* Exponer dashboards.

---

## 9.1. Crear reserva

### Endpoint

```http
POST /bookings
```

### Rol requerido

Usuario autenticado.

### Descripción

Crea una reserva para el usuario autenticado.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
Content-Type: application/json
```

### Request body

```json
{
  "spaceId": 101,
  "date": "2026-07-01",
  "startTime": "09:00",
  "endTime": "10:00",
  "attendees": 4
}
```

### Validaciones

| Regla                                             | Error esperado    |
| ------------------------------------------------- | ----------------- |
| El espacio debe existir                           | `404 Not Found`   |
| El espacio debe estar activo                      | `400 Bad Request` |
| La fecha no debe estar en el pasado               | `400 Bad Request` |
| La hora de fin debe ser mayor a la hora de inicio | `400 Bad Request` |
| La duración no puede ser cero                     | `400 Bad Request` |
| Los asistentes no pueden exceder la capacidad     | `400 Bad Request` |
| No debe existir reserva activa solapada           | `409 Conflict`    |

### Response `201 Created`

```json
{
  "id": 1,
  "userId": 2,
  "userName": "Carlos Méndez",
  "userEmail": "carlos.mendez@corporativoalpha.com",
  "spaceId": 101,
  "spaceName": "Sala Innovación",
  "spaceType": "SALA_JUNTAS",
  "date": "2026-07-01",
  "startTime": "09:00:00",
  "endTime": "10:00:00",
  "attendees": 4,
  "status": "ACTIVA",
  "createdAt": "2026-06-22T23:04:08.076902"
}
```

### Response `400 Bad Request`: capacidad excedida

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "El número de asistentes excede la capacidad del espacio",
  "path": "/bookings"
}
```

### Response `400 Bad Request`: fecha pasada

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se pueden crear reservas en el pasado",
  "path": "/bookings"
}
```

### Response `400 Bad Request`: hora inválida

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "La hora de fin debe ser mayor que la hora de inicio",
  "path": "/bookings"
}
```

### Response `404 Not Found`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El espacio no existe",
  "path": "/bookings"
}
```

### Response `409 Conflict`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 409,
  "error": "Conflict",
  "message": "El espacio ya está ocupado en ese horario",
  "path": "/bookings"
}
```

---

## 9.2. Consultar reservas propias

### Endpoint

```http
GET /bookings/my
```

### Rol requerido

Usuario autenticado.

### Descripción

Devuelve las reservas del usuario autenticado.

En frontend:

* Si el usuario es `COLABORADOR`, se muestra como **Mis reservas**.
* Si el usuario es `ADMINISTRADOR`, el frontend puede usar otra vista para mostrar todas las reservas mediante `/bookings`.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Response `200 OK`

```json
[
  {
    "id": 1,
    "userId": 2,
    "userName": "Carlos Méndez",
    "userEmail": "carlos.mendez@corporativoalpha.com",
    "spaceId": 101,
    "spaceName": "Sala Innovación",
    "spaceType": "SALA_JUNTAS",
    "date": "2026-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "attendees": 4,
    "status": "ACTIVA",
    "createdAt": "2026-06-22T23:04:08.076902"
  }
]
```

---

## 9.3. Dashboard personal

### Endpoint

```http
GET /bookings/my/dashboard
```

### Rol requerido

Usuario autenticado.

### Descripción

Devuelve un resumen de reservas del usuario autenticado.

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Response `200 OK`

```json
{
  "totalMyBookings": 4,
  "activeMyBookings": 2,
  "cancelledMyBookings": 2,
  "finishedMyBookings": 0
}
```

---

## 9.4. Consultar todas las reservas

### Endpoint

```http
GET /bookings
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Devuelve todas las reservas del sistema, sin limitar por usuario.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
```

### Response `200 OK`

```json
[
  {
    "id": 1,
    "userId": 2,
    "userName": "Carlos Méndez",
    "userEmail": "carlos.mendez@corporativoalpha.com",
    "spaceId": 101,
    "spaceName": "Sala Innovación",
    "spaceType": "SALA_JUNTAS",
    "date": "2026-07-01",
    "startTime": "09:00:00",
    "endTime": "10:00:00",
    "attendees": 4,
    "status": "ACTIVA",
    "createdAt": "2026-06-22T23:04:08.076902"
  }
]
```

### Response `403 Forbidden`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "No tienes permisos para realizar esta acción",
  "path": "/bookings"
}
```

---

## 9.5. Consultar reservas del día

### Endpoint

```http
GET /bookings/today
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Devuelve las reservas cuya fecha es el día actual del servidor.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
```

### Response `200 OK`

```json
[
  {
    "id": 4,
    "userId": 2,
    "userName": "Carlos Méndez",
    "userEmail": "carlos.mendez@corporativoalpha.com",
    "spaceId": 101,
    "spaceName": "Sala Innovación",
    "spaceType": "SALA_JUNTAS",
    "date": "2026-06-23",
    "startTime": "23:00:00",
    "endTime": "23:30:00",
    "attendees": 4,
    "status": "ACTIVA",
    "createdAt": "2026-06-23T01:30:00.000000"
  }
]
```

---

## 9.6. Dashboard administrador del día

### Endpoint

```http
GET /bookings/today/dashboard
```

### Rol requerido

`ADMINISTRADOR`

### Descripción

Devuelve estadísticas de reservas del día actual del servidor.

### Request headers

```http
Authorization: Bearer TOKEN_ADMIN
```

### Response `200 OK`

```json
{
  "totalBookingsToday": 1,
  "activeBookingsToday": 1,
  "cancelledBookingsToday": 0,
  "finishedBookingsToday": 0
}
```

---

## 9.7. Cancelar reserva

### Endpoint

```http
DELETE /bookings/{id}
```

### Rol requerido

Usuario autenticado.

### Descripción

Cancela una reserva futura activa. No elimina físicamente el registro. Cambia el estado de la reserva a `CANCELADA`.

### Reglas

| Rol             | Permiso                                        |
| --------------- | ---------------------------------------------- |
| `COLABORADOR`   | Solo puede cancelar sus propias reservas       |
| `ADMINISTRADOR` | Puede cancelar cualquier reserva futura activa |

### Request headers

```http
Authorization: Bearer TOKEN_JWT
```

### Path params

| Parámetro | Tipo   | Descripción      |
| --------- | ------ | ---------------- |
| `id`      | number | ID de la reserva |

### Response `204 No Content`

Sin cuerpo de respuesta.

### Response `403 Forbidden`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "No puedes cancelar una reserva de otro usuario",
  "path": "/bookings/1"
}
```

### Response `400 Bad Request`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se pueden cancelar reservas pasadas",
  "path": "/bookings/1"
}
```

### Response `404 Not Found`

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "La reserva no existe",
  "path": "/bookings/999"
}
```

---

# 10. Casos especiales de reglas de reserva

## 10.1. Reserva solapada

Reserva existente:

```text
09:00 - 10:00
```

Nueva reserva:

```text
09:30 - 10:30
```

Resultado esperado:

```http
409 Conflict
```

Respuesta:

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 409,
  "error": "Conflict",
  "message": "El espacio ya está ocupado en ese horario",
  "path": "/bookings"
}
```

---

## 10.2. Reserva consecutiva permitida

Reserva existente:

```text
09:00 - 10:00
```

Nueva reserva:

```text
10:00 - 11:00
```

Resultado esperado:

```http
201 Created
```

Motivo:

El sistema usa intervalo semiabierto:

```text
[inicio, fin)
```

Por eso una reserva que termina a las 10:00 no bloquea otra que comienza exactamente a las 10:00.

---

## 10.3. Duración cero

Request:

```json
{
  "spaceId": 101,
  "date": "2026-07-01",
  "startTime": "10:00",
  "endTime": "10:00",
  "attendees": 4
}
```

Resultado esperado:

```http
400 Bad Request
```

Respuesta:

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "La hora de fin debe ser mayor que la hora de inicio",
  "path": "/bookings"
}
```

---

## 10.4. Capacidad excedida

Espacio:

```text
Sala con capacidad 4
```

Request:

```json
{
  "spaceId": 203,
  "date": "2026-07-01",
  "startTime": "09:00",
  "endTime": "10:00",
  "attendees": 6
}
```

Resultado esperado:

```http
400 Bad Request
```

Respuesta:

```json
{
  "timestamp": "2026-07-01T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "El número de asistentes excede la capacidad del espacio",
  "path": "/bookings"
}
```

---

# 11. Ejemplos de prueba rápida

## 11.1. Login admin

```http
POST http://localhost:8081/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}
```

---

## 11.2. Login colaborador

```http
POST http://localhost:8081/auth/login
Content-Type: application/json
```

```json
{
  "email": "carlos.mendez@corporativoalpha.com",
  "password": "User123"
}
```

---

## 11.3. Crear espacio como admin

```http
POST http://localhost:8082/spaces
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "name": "Sala QA",
  "type": "SALA_JUNTAS",
  "capacity": 4,
  "floor": 1,
  "location": "Edificio A - Piso 1",
  "hasProjector": true,
  "hasAirConditioning": true,
  "hasWhiteboard": true,
  "hasMonitor": true,
  "otherResources": "Sala de pruebas"
}
```

---

## 11.4. Buscar disponibles

```http
GET http://localhost:8082/spaces/available?date=2026-07-10&startTime=09:00&endTime=10:00&type=SALA_JUNTAS&minCapacity=4
Authorization: Bearer TOKEN
```

---

## 11.5. Crear reserva

```http
POST http://localhost:8083/bookings
Authorization: Bearer TOKEN_COLABORADOR
Content-Type: application/json
```

```json
{
  "spaceId": 101,
  "date": "2026-07-10",
  "startTime": "09:00",
  "endTime": "10:00",
  "attendees": 4
}
```

---

## 11.6. Cancelar reserva

```http
DELETE http://localhost:8083/bookings/1
Authorization: Bearer TOKEN_COLABORADOR
```

---

# 12. Resumen de permisos por endpoint

| Servicio | Método | Endpoint                    | Público | Autenticado | Admin |
| -------- | ------ | --------------------------- | ------: | ----------: | ----: |
| Auth     | POST   | `/auth/login`               |      Sí |          Sí |    Sí |
| Auth     | GET    | `/auth/me`                  |      No |          Sí |    Sí |
| Catalog  | GET    | `/spaces`                   |      No |          Sí |    Sí |
| Catalog  | GET    | `/spaces/{id}`              |      No |          Sí |    Sí |
| Catalog  | POST   | `/spaces`                   |      No |          No |    Sí |
| Catalog  | PUT    | `/spaces/{id}`              |      No |          No |    Sí |
| Catalog  | DELETE | `/spaces/{id}`              |      No |          No |    Sí |
| Catalog  | GET    | `/spaces/available`         |      No |          Sí |    Sí |
| Booking  | POST   | `/bookings`                 |      No |          Sí |    Sí |
| Booking  | GET    | `/bookings/my`              |      No |          Sí |    Sí |
| Booking  | GET    | `/bookings/my/dashboard`    |      No |          Sí |    Sí |
| Booking  | GET    | `/bookings`                 |      No |          No |    Sí |
| Booking  | GET    | `/bookings/today`           |      No |          No |    Sí |
| Booking  | GET    | `/bookings/today/dashboard` |      No |          No |    Sí |
| Booking  | DELETE | `/bookings/{id}`            |      No |          Sí |    Sí |

---

# 13. Notas para tester

1. Siempre iniciar sesión primero con `/auth/login`.
2. Copiar el token devuelto.
3. Usar el token en el header `Authorization`.
4. Para probar permisos de administrador, usar `admin@corporativoalpha.com`.
5. Para probar permisos de colaborador, usar `carlos.mendez@corporativoalpha.com` o `ana.torres@corporativoalpha.com`.
6. Para probar solapamiento, usar el mismo `spaceId`, misma fecha y horarios cruzados.
7. Para probar reserva consecutiva, usar hora de inicio igual a la hora de fin de una reserva existente.
8. Para probar capacidad, usar un número de asistentes mayor que la capacidad del espacio.
9. Para probar cancelación ajena, crear reserva con Carlos e intentar cancelarla con Ana.
10. Para reiniciar datos desde cero, ejecutar:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

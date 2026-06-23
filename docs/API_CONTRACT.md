# Contrato de la API — OfficeSpace

Referencia de los endpoints de los tres servicios. La fuente viva está en el Swagger
de cada servicio (`/api-docs`). Códigos HTTP usados: `200, 201, 204, 400, 401, 403,
404, 409, 500`.

## Sobre de error estándar

Todas las respuestas de error usan la misma forma en los tres servicios:

```json
{ "error": { "codigo": "CODIGO_ESTABLE", "mensaje": "Texto legible en español." } }
```

`codigo` es un identificador estable en `MAYÚSCULAS_CON_GUION_BAJO`; `mensaje` es
texto legible. Códigos usados: `SOLICITUD_INVALIDA`, `CREDENCIALES_INVALIDAS`,
`TOKEN_AUSENTE`, `TOKEN_INVALIDO`, `ACCESO_DENEGADO`, `ESPACIO_NO_ENCONTRADO`,
`RESERVA_NO_ENCONTRADA`, `HORARIO_INVALIDO`, `FECHA_PASADA`, `FECHA_INVALIDA`,
`ASISTENTES_INVALIDOS`, `CAPACIDAD_EXCEDIDA`, `RESERVA_SOLAPADA`,
`TIPO_INVALIDO`, `NOMBRE_REQUERIDO`, `CAPACIDAD_INVALIDA`, `CATALOGO_NO_DISPONIBLE`,
`ERROR_INTERNO`.

Autenticación: los endpoints protegidos requieren `Authorization: Bearer <token>`.

---

## auth-service (puerto 8081)

### `GET /health`
Sonda de salud. → `200 { "status": "ok", "servicio": "auth-service" }`.

### `POST /auth/login`
Body: `{ "email": string, "password": string }`.
- `200 { "token": string, "rol": "ADMINISTRADOR" | "COLABORADOR" }`
- `401 CREDENCIALES_INVALIDAS`

### `GET /auth/me` (protegido)
Devuelve los datos del usuario del token.
- `200 { "email", "rol", "nombre" }`
- `401 TOKEN_AUSENTE | TOKEN_INVALIDO`

### `GET /api-docs`
Swagger UI.

---

## catalog-service (puerto 8082)

### `GET /health` → `200`

### `GET /spaces` (protegido)
Query opcional: `tipo` (`SALA` | `DESK`), `capacidad_min` (entero ≥ 0). Los filtros
se aplican en la consulta SQL.
- `200 [ Espacio ]`
- `400 FILTRO_INVALIDO` (capacidad_min no numérica)
- `401`

### `GET /spaces/{id}` (protegido)
- `200 Espacio`
- `404 ESPACIO_NO_ENCONTRADO`

### `POST /spaces` (ADMIN)
Body: `{ nombre, tipo, capacidad, piso, recurso_ids }`. `recurso_ids` son los ids de
los recursos asignados.
- `201 Espacio`
- `400 NOMBRE_REQUERIDO | TIPO_INVALIDO | CAPACIDAD_INVALIDA | RECURSO_INVALIDO`
- `401` · `403 ACCESO_DENEGADO` (rol COLABORADOR)

### `PUT /spaces/{id}` (ADMIN)
Reemplaza también el conjunto de recursos asignados con `recurso_ids`.
- `200 Espacio` · `400` · `403` · `404`

### `DELETE /spaces/{id}` (ADMIN)
- `204` (sin contenido) · `403` · `404`

### `GET /resources` (protegido)
Catálogo de recursos.
- `200 [ Recurso ]` · `401`

### `POST /resources` (ADMIN)
Body: `{ nombre }`.
- `201 Recurso` · `400 NOMBRE_REQUERIDO` · `403` · `409 RECURSO_DUPLICADO`

### `PUT /resources/{id}` (ADMIN)
- `200 Recurso` · `404 RECURSO_NO_ENCONTRADO` · `409 RECURSO_DUPLICADO`

### `DELETE /resources/{id}` (ADMIN)
Borra el recurso; sus asignaciones a espacios se eliminan en cascada.
- `204` · `404 RECURSO_NO_ENCONTRADO`

### `GET /api-docs`
Swagger UI.

**Espacio:**
```json
{
  "id": 1, "nombre": "Sala Monterrey", "tipo": "SALA", "capacidad": 8,
  "piso": "Piso 1",
  "recursos": [ { "id": 1, "nombre": "Proyector" }, { "id": 2, "nombre": "Aire acondicionado" } ],
  "creado_en": "2026-06-23T00:00:00Z"
}
```

**Recurso:**
```json
{ "id": 1, "nombre": "Proyector", "creado_en": "2026-06-23T00:00:00Z" }
```

---

## booking-service (puerto 8083)

### `GET /health` → `200`

### `POST /bookings` (protegido)
El usuario se toma del token. Valida consistencia temporal, que no sea en el pasado
(TZ `America/Mexico_City`), capacidad (consultando catalog por HTTP) y no
solapamiento.
Body: `{ espacio_id, fecha: "YYYY-MM-DD", hora_inicio: "HH:MM", hora_fin: "HH:MM", asistentes }`.
- `201 Reserva`
- `400 HORARIO_INVALIDO | FECHA_PASADA | FECHA_INVALIDA | ASISTENTES_INVALIDOS | CAPACIDAD_EXCEDIDA`
- `401` · `404 ESPACIO_NO_ENCONTRADO`
- `409 RESERVA_SOLAPADA` (conflicto de horario; garantizado por app y por la base)

### `GET /bookings/mine` (protegido)
- `200 [ Reserva ]` (las del usuario autenticado)

### `GET /bookings/availability` (protegido)
Query: `espacio_id`, `fecha`, `inicio`, `fin`.
- `200 { espacio_id, fecha, hora_inicio, hora_fin, disponible: boolean }`
- `400` (parámetros inválidos)

### `GET /occupancy` (protegido)
Query: `fecha=YYYY-MM-DD`. Reservas confirmadas del día (dashboard admin).
- `200 [ Reserva ]` · `400 FECHA_INVALIDA`

### `DELETE /bookings/{id}` (protegido, solo dueño)
Cancela la reserva (`estado → CANCELADA`), liberando el horario.
- `200 Reserva`
- `401` · `403 ACCESO_DENEGADO` (reserva ajena) · `404 RESERVA_NO_ENCONTRADA`

### `GET /notifications` (ADMIN)
Historial reciente de notificaciones y conteo de no leídas.
- `200 { notificaciones: [ Notificacion ], no_leidas }` · `401` · `403 ACCESO_DENEGADO`

### `POST /notifications/read` (ADMIN)
Marca como leídas todas las notificaciones pendientes.
- `204` · `401` · `403 ACCESO_DENEGADO`

### `GET /notifications/stream` (ADMIN, SSE)
Flujo de notificaciones en tiempo real (Server-Sent Events). Como `EventSource` no
envía headers, el JWT de administrador viaja en el query param `token`.
- `200 text/event-stream` (eventos `notificacion` con la `Notificacion` en JSON)
- `401 TOKEN_INVALIDO` · `403 ACCESO_DENEGADO`

### `GET /api-docs`
Swagger UI.

**Reserva:**
```json
{
  "id": 1, "espacio_id": 1, "usuario_email": "carlos.mendez@corporativoalpha.com",
  "fecha": "2026-06-24", "hora_inicio": "09:00", "hora_fin": "10:00",
  "asistentes": 4, "estado": "CONFIRMADA", "creado_en": "2026-06-23T00:00:00Z"
}
```

**Notificacion:**
```json
{
  "id": 1, "tipo": "RESERVA_CREADA",
  "mensaje": "carlos.mendez@corporativoalpha.com reservó Sala Monterrey de 09:00 a 10:00",
  "actor_email": "carlos.mendez@corporativoalpha.com", "recurso": "Sala Monterrey",
  "leida": false, "creado_en": "2026-06-23T00:00:00Z"
}
```
`tipo` ∈ `RESERVA_CREADA` · `RESERVA_CANCELADA` · `ESPACIO_CREADO` · `ESPACIO_ACTUALIZADO` · `ESPACIO_ELIMINADO`.

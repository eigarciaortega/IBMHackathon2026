# Contrato de API — IBM OfficeSpace

Todos los endpoints (salvo `POST /auth/login`) requieren cabecera
`Authorization: Bearer <token>`. Documentación interactiva en `/api-docs` de cada servicio.

Códigos de estado usados: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.

---

## auth-service (`:4001`)

### `POST /auth/login`
Inicia sesión. Público.

```bash
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"Admin123"}'
```
**200**
```json
{ "token": "eyJhbGciOi...", "user": { "id": 1, "full_name": "Administrador IBM", "email": "admin@corporativoalpha.com", "role": "ADMINISTRADOR" } }
```
**401** → `{ "error": "Credenciales incorrectas" }`

### `GET /auth/me`
Devuelve el usuario autenticado. **401** si falta/expira el token.

### `GET /auth/users`
Lista de usuarios. Solo `ADMINISTRADOR` (**403** en caso contrario).

---

## catalog-service (`:4002`)

### `GET /spaces`
Lista espacios. Filtros opcionales: `type`, `minCapacity`, `projector`, `ac`, `videoconference`, `all`.

```bash
curl http://localhost:4002/spaces?type=SALA&minCapacity=6 -H "Authorization: Bearer $TOKEN"
```

### `GET /spaces/:id`
Un espacio. **404** si no existe.

### `POST /spaces`  ·  solo ADMIN
```json
{ "name": "Sala Granite", "type": "SALA", "capacity": 8, "floor": "Piso 4",
  "location": "Ala Este", "has_projector": true, "has_ac": true, "has_videoconference": false }
```
**201** devuelve el espacio creado · **400** datos inválidos · **403** sin permiso.

### `PUT /spaces/:id`  ·  solo ADMIN
Actualiza (campos parciales permitidos). **200** / **403** / **404**.

### `DELETE /spaces/:id`  ·  solo ADMIN
Elimina el espacio (y en cascada sus reservas). **200** / **403** / **404**.

---

## booking-service (`:4003`)

### `GET /availability?date&start&end&type&minCapacity`
Devuelve solo los espacios **libres** en el rango.

```bash
curl "http://localhost:4003/availability?date=2026-06-25&start=09:00&end=10:00&type=SALA" \
  -H "Authorization: Bearer $TOKEN"
```

### `POST /bookings`  — operación crítica
```json
{ "space_id": 1, "booking_date": "2026-06-25", "start_time": "09:00",
  "end_time": "10:00", "attendees": 4, "title": "Reunión de Sprint" }
```
| Código | Significado |
|--------|-------------|
| **201** | Reserva creada |
| **400** | Validación fallida (capacidad, fecha pasada, fin ≤ inicio) — `detalles[].code` |
| **401** | Sin token |
| **404** | Espacio no encontrado |
| **409** | **Solapamiento de horario** |

Ejemplo de **409**:
```json
{ "error": "El espacio ya está reservado en ese intervalo de horario", "conflicto": { "id": 1, "start_time": "09:00:00", "end_time": "10:00:00" } }
```

### `GET /bookings/me`
Reservas del usuario (con datos del espacio), ordenadas por fecha desc.

### `DELETE /bookings/:id`
Cancela una reserva **futura** del propio usuario (o admin). **200** / **400** (solo futuras) / **403** / **404**.

### `GET /bookings/occupancy?date`
Resumen de ocupación del día (dashboard):
```json
{ "date":"2026-06-22", "totalSpaces":10, "occupiedSpaces":4, "freeSpaces":6, "occupancyRate":40, "bookings":[ ... ] }
```

### `GET /bookings/analytics`
Métricas: totales, tasa de cancelación, espacios top, horas pico, reservas por tipo.

### `GET /bookings/suggestions?date&duration&type&minCapacity`
Sugerencias de franjas libres óptimas (base del asistente).
```json
{ "date":"2026-06-22", "duration":60, "suggestions":[ { "space_name":"Sala Turing", "floor":"Piso 3", "start":"12:00", "end":"13:00", ... } ] }
```

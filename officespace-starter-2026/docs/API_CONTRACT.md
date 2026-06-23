# Contrato de API — OfficeSpace

Base URL: `http://localhost:3000`  
Swagger interactivo: `http://localhost:3001/api-docs` | `http://localhost:3002/api-docs` | `http://localhost:3003/api-docs`

---

## Autenticación

Todos los endpoints (excepto `/login`) requieren:
```
Authorization: Bearer <token_jwt>
```

---

## Auth Service

### POST /login
Genera un token JWT.

**Body:**
```json
{ "email": "admin@corporativoalpha.com", "password": "Admin123" }
```

**Respuestas:**
| Código | Descripción |
|--------|-------------|
| 200 | Login exitoso, retorna token |
| 400 | Faltan campos |
| 401 | Credenciales inválidas |
| 500 | Error interno |

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "usuario": { "id": 1, "email": "admin@corporativoalpha.com", "rol": "ADMINISTRADOR" }
}
```

---

## Catalog Service

### GET /spaces
Lista espacios con filtros opcionales.

**Query params:** `tipo=SALA|DESK`, `capacidad_min=4`

| Código | Descripción |
|--------|-------------|
| 200 | Lista de espacios |
| 401 | Token inválido |

### GET /spaces/:id
Obtiene un espacio por ID.

| Código | Descripción |
|--------|-------------|
| 200 | Datos del espacio |
| 404 | Espacio no encontrado |

### POST /spaces — Solo Admin
Crea un nuevo espacio.

**Body:**
```json
{
  "nombre": "Sala Norte",
  "tipo": "SALA",
  "capacidad": 10,
  "recursos": "Proyector, Aire acondicionado",
  "piso": "Piso 3"
}
```

| Código | Descripción |
|--------|-------------|
| 201 | Espacio creado |
| 400 | Faltan campos obligatorios |
| 403 | Solo administradores |

### PUT /spaces/:id — Solo Admin
Actualiza un espacio existente. Body igual a POST (campos opcionales).

| Código | Descripción |
|--------|-------------|
| 200 | Espacio actualizado |
| 404 | Espacio no encontrado |
| 403 | Solo administradores |

### DELETE /spaces/:id — Solo Admin

| Código | Descripción |
|--------|-------------|
| 200 | Espacio eliminado |
| 404 | Espacio no encontrado |
| 403 | Solo administradores |

---

## Booking Service

### POST /bookings
Crea una reserva. Valida solapamiento, capacidad, fecha y hora.

**Body:**
```json
{
  "space_id": 1,
  "fecha": "2026-07-01",
  "hora_inicio": "09:00",
  "hora_fin": "11:00",
  "asistentes": 4
}
```

| Código | Descripción |
|--------|-------------|
| 201 | Reserva creada |
| 400 | Validación fallida (fecha pasada, hora inválida, capacidad excedida) |
| 401 | Token inválido |
| 404 | Espacio no existe |
| 409 | Conflicto de horario (solapamiento) |

### GET /bookings/mis-reservas
Reservas del usuario autenticado.

| Código | Descripción |
|--------|-------------|
| 200 | Lista de reservas con datos del espacio |

### GET /bookings/dashboard
Ocupación del día de hoy. Disponible para todos los roles.

| Código | Descripción |
|--------|-------------|
| 200 | `{ fecha, total_reservas, reservas: [...] }` |

### GET /bookings/historial — Solo Admin
Historial completo con filtros opcionales.

**Query params:** `fecha_inicio=2026-07-01`, `fecha_fin=2026-07-31`, `space_id=1`

| Código | Descripción |
|--------|-------------|
| 200 | `{ total, reservas: [...] }` |
| 403 | Solo administradores |

### DELETE /bookings/:id
Cancela una reserva. Solo el dueño o un Admin puede cancelar.

| Código | Descripción |
|--------|-------------|
| 200 | Reserva cancelada |
| 400 | Reserva ya pasada |
| 403 | Sin permiso |
| 404 | Reserva no encontrada |

---

## Ejemplos con curl

```bash
# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"Admin123"}'

# Listar espacios tipo SALA con capacidad mínima 4
curl http://localhost:3000/spaces?tipo=SALA&capacidad_min=4 \
  -H "Authorization: Bearer <TOKEN>"

# Crear reserva
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"space_id":1,"fecha":"2026-07-10","hora_inicio":"09:00","hora_fin":"11:00","asistentes":4}'

# Mis reservas
curl http://localhost:3000/bookings/mis-reservas \
  -H "Authorization: Bearer <TOKEN>"

# Cancelar reserva
curl -X DELETE http://localhost:3000/bookings/1 \
  -H "Authorization: Bearer <TOKEN>"
```

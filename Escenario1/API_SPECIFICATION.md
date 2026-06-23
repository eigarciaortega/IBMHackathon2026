# API Specification

## Base URLs
- User Service: `http://localhost:8001`
- Room Service: `http://localhost:8002`
- Reservation Service: `http://localhost:8003`

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## User Service API (Port 8001)

### 1. Register User
**Endpoint:** `POST /api/users/register`

**Request Body:**
```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "contrasena": "SecurePass123"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "created_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid email format or missing fields
- `409 Conflict` - Email already registered

---

### 2. Login
**Endpoint:** `POST /api/users/login`

**Request Body:**
```json
{
  "correo": "juan@example.com",
  "contrasena": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - User not found

---

### 3. Get Current User
**Endpoint:** `GET /api/users/me`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "created_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired token

---

## Room Service API (Port 8002)

### 4. Create Room
**Endpoint:** `POST /api/rooms`

**Request Body:**
```json
{
  "nombre": "Sala de Juntas A",
  "tipo": "sala",
  "recursos": ["computadora", "proyector", "aire_condicionado"],
  "capacidad": 12
}
```

**Valid Values:**
- `tipo`: "sala" | "escritorio"
- `recursos`: Array of strings (computadora, aire_condicionado, proyector)
- `capacidad`: Positive integer

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "nombre": "Sala de Juntas A",
  "tipo": "sala",
  "recursos": ["computadora", "proyector", "aire_condicionado"],
  "capacidad": 12,
  "estado": "disponible",
  "created_at": "2026-06-23T18:00:00Z",
  "updated_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid tipo or missing required fields
- `422 Unprocessable Entity` - Validation error

---

### 5. List Rooms (Paginated)
**Endpoint:** `GET /api/rooms`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `size` (optional, default: 10) - Items per page
- `search` (optional) - Search by room name (case-insensitive)

**Example Request:**
```
GET /api/rooms?page=1&size=10&search=Sala
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "nombre": "Sala de Juntas A",
      "tipo": "sala",
      "recursos": ["computadora", "proyector"],
      "capacidad": 12,
      "estado": "disponible",
      "created_at": "2026-06-23T18:00:00Z",
      "updated_at": "2026-06-23T18:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "pages": 1
}
```

---

### 6. Get Room by ID
**Endpoint:** `GET /api/rooms/{id}`

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "nombre": "Sala de Juntas A",
  "tipo": "sala",
  "recursos": ["computadora", "proyector", "aire_condicionado"],
  "capacidad": 12,
  "estado": "disponible",
  "created_at": "2026-06-23T18:00:00Z",
  "updated_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Room not found

---

### 7. Update Room
**Endpoint:** `PUT /api/rooms/{id}`

**Request Body:**
```json
{
  "nombre": "Sala de Juntas A - Actualizada",
  "tipo": "sala",
  "recursos": ["computadora", "proyector"],
  "capacidad": 15
}
```

**Response (200 OK):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "nombre": "Sala de Juntas A - Actualizada",
  "tipo": "sala",
  "recursos": ["computadora", "proyector"],
  "capacidad": 15,
  "estado": "disponible",
  "created_at": "2026-06-23T18:00:00Z",
  "updated_at": "2026-06-23T18:30:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Room not found
- `400 Bad Request` - Invalid data

---

### 8. Delete Room
**Endpoint:** `DELETE /api/rooms/{id}`

**Response (204 No Content)**

**Error Responses:**
- `404 Not Found` - Room not found
- `409 Conflict` - Room has active reservations

---

## Reservation Service API (Port 8003)

### 9. Create Reservation
**Endpoint:** `POST /api/reservations`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "sala_id": "660e8400-e29b-41d4-a716-446655440001",
  "usuario_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha_inicio": "2026-06-24T10:00:00",
  "fecha_fin": "2026-06-24T12:00:00",
  "cantidad_personas": 8
}
```

**Validations:**
- User must exist
- Room must exist
- Room must be "disponible"
- cantidad_personas <= room.capacidad
- No date overlaps with other reservations for same room
- fecha_fin > fecha_inicio
- Dates must be in the future

**Response (201 Created):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "sala_id": "660e8400-e29b-41d4-a716-446655440001",
  "usuario_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha_inicio": "2026-06-24T10:00:00Z",
  "fecha_fin": "2026-06-24T12:00:00Z",
  "cantidad_personas": 8,
  "estado": "abierto",
  "created_at": "2026-06-23T18:00:00Z",
  "updated_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed (capacity, dates, conflicts)
- `404 Not Found` - User or room not found
- `409 Conflict` - Date overlap with existing reservation

---

### 10. List Reservations
**Endpoint:** `GET /api/reservations`

**Query Parameters:**
- `usuario_id` (optional) - Filter by user
- `sala_id` (optional) - Filter by room
- `estado` (optional) - Filter by status (abierto, cancelado)

**Example Request:**
```
GET /api/reservations?usuario_id=550e8400-e29b-41d4-a716-446655440000&estado=abierto
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "sala": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "nombre": "Sala de Juntas A",
        "tipo": "sala"
      },
      "usuario": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nombre": "Juan Pérez",
        "correo": "juan@example.com"
      },
      "fecha_inicio": "2026-06-24T10:00:00Z",
      "fecha_fin": "2026-06-24T12:00:00Z",
      "cantidad_personas": 8,
      "estado": "abierto",
      "created_at": "2026-06-23T18:00:00Z"
    }
  ]
}
```

---

### 11. Get Reservation by ID
**Endpoint:** `GET /api/reservations/{id}`

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "sala": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Sala de Juntas A",
    "tipo": "sala",
    "capacidad": 12
  },
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com"
  },
  "fecha_inicio": "2026-06-24T10:00:00Z",
  "fecha_fin": "2026-06-24T12:00:00Z",
  "cantidad_personas": 8,
  "estado": "abierto",
  "created_at": "2026-06-23T18:00:00Z",
  "updated_at": "2026-06-23T18:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Reservation not found

---

### 12. Cancel Reservation
**Endpoint:** `DELETE /api/reservations/{id}`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "estado": "cancelado",
  "updated_at": "2026-06-23T18:30:00Z",
  "message": "Reservación cancelada exitosamente"
}
```

**Side Effects:**
- Reservation estado changed to "cancelado"
- Room estado changed back to "disponible"

**Error Responses:**
- `404 Not Found` - Reservation not found
- `400 Bad Request` - Reservation already cancelled

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Or for validation errors:

```json
{
  "detail": [
    {
      "loc": ["body", "correo"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Status Codes Summary

- `200 OK` - Successful GET, PUT, DELETE (with body)
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE (no body)
- `400 Bad Request` - Invalid input or business rule violation
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource or constraint violation
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## Testing Workflow

### 1. Register and Login
```bash
# Register
curl -X POST http://localhost:8001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test User","correo":"test@example.com","contrasena":"test123"}'

# Login (save the token)
curl -X POST http://localhost:8001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"test@example.com","contrasena":"test123"}'
```

### 2. Create Room
```bash
curl -X POST http://localhost:8002/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Sala Test","tipo":"sala","recursos":["computadora"],"capacidad":10}'
```

### 3. Create Reservation
```bash
curl -X POST http://localhost:8003/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sala_id":"ROOM_ID",
    "usuario_id":"USER_ID",
    "fecha_inicio":"2026-06-25T10:00:00",
    "fecha_fin":"2026-06-25T12:00:00",
    "cantidad_personas":5
  }'
```

### 4. List and Cancel
```bash
# List reservations
curl http://localhost:8003/api/reservations

# Cancel reservation
curl -X DELETE http://localhost:8003/api/reservations/RESERVATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
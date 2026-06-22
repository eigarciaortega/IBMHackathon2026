# OfficeSpace - Documentación del Contrato de API

## 📋 Resumen General

Este documento define el contrato completo de API para los microservicios de OfficeSpace. Todos los endpoints siguen principios RESTful y retornan respuestas en formato JSON.

## 🌐 URLs Base

- **Servicio de Catálogo**: `http://localhost:3001/api`
- **Servicio de Reservas**: `http://localhost:3002/api`
- **Documentación Swagger**:
  - Catálogo: `http://localhost:3001/api-docs`
  - Reservas: `http://localhost:3002/api-docs`

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación JWT mediante el encabezado `Authorization`:

```
Authorization: Bearer <jwt_token>
```

### Estructura del Token

```json
{
  "userId": 1,
  "email": "admin@corporativoalpha.com",
  "role": "ADMIN",
  "iat": 1640000000,
  "exp": 1640086400
}
```

## 📊 Formato Estándar de Respuesta

### Respuesta Exitosa

```json
{
  "success": true,
  "data": { ... },
  "message": "Operación completada exitosamente"
}
```

### Respuesta de Error

```json
{
  "success": false,
  "error": {
    "code": "CODIGO_ERROR",
    "message": "Mensaje de error legible",
    "details": { ... }
  }
}
```

## 🔢 Códigos de Estado HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | GET, PUT, DELETE exitosos |
| 201 | Creado | POST exitoso (recurso creado) |
| 400 | Solicitud Incorrecta | Errores de validación, entrada inválida |
| 401 | No Autorizado | Token JWT faltante o inválido |
| 403 | Prohibido | Token válido pero permisos insuficientes |
| 404 | No Encontrado | El recurso no existe |
| 409 | Conflicto | Conflicto de lógica de negocio (ej: solapamiento de reservas) |
| 500 | Error Interno del Servidor | Error inesperado del servidor |

---

# 🏢 API del Servicio de Catálogo

## Resumen de Endpoints

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | `/spaces` | Opcional | Cualquiera | Listar todos los espacios con filtros |
| GET | `/spaces/:id` | Opcional | Cualquiera | Obtener detalles de un espacio |
| POST | `/spaces` | Requerido | Admin | Crear nuevo espacio |
| PUT | `/spaces/:id` | Requerido | Admin | Actualizar espacio |
| DELETE | `/spaces/:id` | Requerido | Admin | Eliminar espacio |
| GET | `/spaces/dashboard` | Requerido | Admin | Obtener dashboard de ocupación |

---

## 1. Listar Todos los Espacios

### Solicitud

```http
GET /api/spaces?type=SALA&capacity=8&floor=Piso 1
```

**Parámetros de Consulta**:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| type | string | No | Filtrar por tipo: `SALA` o `DESK` |
| capacity | integer | No | Capacidad mínima requerida |
| floor | string | No | Filtrar por piso |
| has_projector | boolean | No | Filtrar por disponibilidad de proyector |
| has_ac | boolean | No | Filtrar por disponibilidad de aire acondicionado |

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Sala Creativa",
      "type": "SALA",
      "capacity": 8,
      "floor": "Piso 1",
      "has_projector": true,
      "has_ac": true,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Sala Ejecutiva",
      "type": "SALA",
      "capacity": 12,
      "floor": "Piso 2",
      "has_projector": true,
      "has_ac": true,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "message": "Espacios recuperados exitosamente"
}
```

---

## 2. Obtener Detalles de un Espacio

### Solicitud

```http
GET /api/spaces/1
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Sala Creativa",
    "type": "SALA",
    "capacity": 8,
    "floor": "Piso 1",
    "has_projector": true,
    "has_ac": true,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-15T10:00:00Z"
  },
  "message": "Espacio recuperado exitosamente"
}
```

**Respuesta de Error** (No Encontrado):

**Estado**: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "SPACE_NOT_FOUND",
    "message": "Espacio con ID 1 no encontrado"
  }
}
```

---

## 3. Crear Espacio (Solo Admin)

### Solicitud

```http
POST /api/spaces
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Cuerpo**:

```json
{
  "name": "Sala Innovación",
  "type": "SALA",
  "capacity": 10,
  "floor": "Piso 3",
  "has_projector": true,
  "has_ac": true
}
```

**Reglas de Validación**:

| Campo | Tipo | Requerido | Restricciones |
|-------|------|-----------|---------------|
| name | string | Sí | 3-255 caracteres |
| type | string | Sí | Debe ser `SALA` o `DESK` |
| capacity | integer | Sí | Debe ser > 0 |
| floor | string | No | Máximo 50 caracteres |
| has_projector | boolean | No | Por defecto: false |
| has_ac | boolean | No | Por defecto: false |

### Respuesta

**Estado**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Sala Innovación",
    "type": "SALA",
    "capacity": 10,
    "floor": "Piso 3",
    "has_projector": true,
    "has_ac": true,
    "created_at": "2026-06-22T21:00:00Z",
    "updated_at": "2026-06-22T21:00:00Z"
  },
  "message": "Espacio creado exitosamente"
}
```

**Respuesta de Error** (Validación):

**Estado**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": {
      "capacity": "La capacidad debe ser mayor que 0",
      "type": "El tipo debe ser SALA o DESK"
    }
  }
}
```

**Respuesta de Error** (No Autorizado):

**Estado**: `403 Forbidden`

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Solo los administradores pueden crear espacios"
  }
}
```

---

## 4. Actualizar Espacio (Solo Admin)

### Solicitud

```http
PUT /api/spaces/5
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Cuerpo**:

```json
{
  "name": "Sala Innovación Plus",
  "capacity": 12,
  "has_projector": true,
  "has_ac": true
}
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Sala Innovación Plus",
    "type": "SALA",
    "capacity": 12,
    "floor": "Piso 3",
    "has_projector": true,
    "has_ac": true,
    "created_at": "2026-06-22T21:00:00Z",
    "updated_at": "2026-06-22T21:05:00Z"
  },
  "message": "Espacio actualizado exitosamente"
}
```

---

## 5. Eliminar Espacio (Solo Admin)

### Solicitud

```http
DELETE /api/spaces/5
Authorization: Bearer <admin_jwt_token>
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "message": "Espacio eliminado exitosamente"
}
```

**Respuesta de Error** (Tiene Reservas Activas):

**Estado**: `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "SPACE_HAS_BOOKINGS",
    "message": "No se puede eliminar un espacio con reservas activas",
    "details": {
      "active_bookings": 3
    }
  }
}
```

---

## 6. Obtener Dashboard (Solo Admin)

### Solicitud

```http
GET /api/spaces/dashboard?date=2026-06-22
Authorization: Bearer <admin_jwt_token>
```

**Parámetros de Consulta**:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| date | string | No | Fecha en formato YYYY-MM-DD (por defecto: hoy) |

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": {
    "date": "2026-06-22",
    "total_spaces": 10,
    "occupied_spaces": 6,
    "available_spaces": 4,
    "occupancy_rate": 60,
    "spaces": [
      {
        "id": 1,
        "name": "Sala Creativa",
        "type": "SALA",
        "status": "occupied",
        "current_booking": {
          "id": 15,
          "user": "Carlos Méndez",
          "start_time": "2026-06-22T09:00:00Z",
          "end_time": "2026-06-22T11:00:00Z"
        }
      },
      {
        "id": 3,
        "name": "Escritorio Ventana",
        "type": "DESK",
        "status": "available",
        "current_booking": null
      }
    ]
  },
  "message": "Datos del dashboard recuperados exitosamente"
}
```

---

# 📅 API del Servicio de Reservas

## Resumen de Endpoints

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/auth/login` | No | Cualquiera | Inicio de sesión de usuario |
| POST | `/bookings` | Requerido | Cualquiera | Crear reserva |
| GET | `/bookings/my-bookings` | Requerido | Cualquiera | Obtener reservas del usuario |
| GET | `/bookings/:id` | Requerido | Cualquiera | Obtener detalles de reserva |
| DELETE | `/bookings/:id` | Requerido | Propietario/Admin | Cancelar reserva |
| GET | `/bookings/check-availability` | Opcional | Cualquiera | Verificar disponibilidad de espacio |

---

## 1. Inicio de Sesión de Usuario

### Solicitud

```http
POST /api/auth/login
Content-Type: application/json
```

**Cuerpo**:

```json
{
  "email": "carlos.mendez@corporativoalpha.com",
  "password": "User123"
}
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "email": "carlos.mendez@corporativoalpha.com",
      "name": "Carlos Méndez",
      "role": "COLABORADOR"
    }
  },
  "message": "Inicio de sesión exitoso"
}
```

**Respuesta de Error** (Credenciales Inválidas):

**Estado**: `401 Unauthorized`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña inválidos"
  }
}
```

---

## 2. Crear Reserva

### Solicitud

```http
POST /api/bookings
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Cuerpo**:

```json
{
  "space_id": 1,
  "start_time": "2026-06-23T09:00:00Z",
  "end_time": "2026-06-23T11:00:00Z",
  "attendees": 6
}
```

**Reglas de Validación**:

| Campo | Tipo | Requerido | Restricciones |
|-------|------|-----------|---------------|
| space_id | integer | Sí | Debe existir en la base de datos |
| start_time | ISO 8601 | Sí | Debe ser en el futuro |
| end_time | ISO 8601 | Sí | Debe ser después de start_time |
| attendees | integer | Sí | Debe ser > 0 y <= capacidad del espacio |

### Respuesta

**Estado**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 25,
    "space_id": 1,
    "space_name": "Sala Creativa",
    "user_id": 2,
    "user_name": "Carlos Méndez",
    "start_time": "2026-06-23T09:00:00Z",
    "end_time": "2026-06-23T11:00:00Z",
    "attendees": 6,
    "status": "CONFIRMED",
    "created_at": "2026-06-22T21:10:00Z"
  },
  "message": "Reserva creada exitosamente"
}
```

**Respuesta de Error** (Solapamiento Detectado):

**Estado**: `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAP",
    "message": "El espacio ya está reservado para este horario",
    "details": {
      "conflicting_booking": {
        "id": 20,
        "start_time": "2026-06-23T08:00:00Z",
        "end_time": "2026-06-23T10:00:00Z",
        "user": "Ana Torres"
      }
    }
  }
}
```

**Respuesta de Error** (Capacidad Excedida):

**Estado**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "El número de asistentes excede la capacidad del espacio",
    "details": {
      "requested_attendees": 10,
      "space_capacity": 8
    }
  }
}
```

**Respuesta de Error** (Rango de Tiempo Inválido):

**Estado**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TIME_RANGE",
    "message": "La hora de fin debe ser posterior a la hora de inicio"
  }
}
```

**Respuesta de Error** (Fecha Pasada):

**Estado**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "PAST_DATE_BOOKING",
    "message": "No se pueden crear reservas en el pasado"
  }
}
```

---

## 3. Obtener Mis Reservas

### Solicitud

```http
GET /api/bookings/my-bookings?status=CONFIRMED&from=2026-06-22
Authorization: Bearer <jwt_token>
```

**Parámetros de Consulta**:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| status | string | No | Filtrar por estado: `CONFIRMED` o `CANCELLED` |
| from | string | No | Fecha de inicio (YYYY-MM-DD) |
| to | string | No | Fecha de fin (YYYY-MM-DD) |

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "space": {
        "id": 1,
        "name": "Sala Creativa",
        "type": "SALA",
        "capacity": 8
      },
      "start_time": "2026-06-23T09:00:00Z",
      "end_time": "2026-06-23T11:00:00Z",
      "attendees": 6,
      "status": "CONFIRMED",
      "created_at": "2026-06-22T21:10:00Z"
    },
    {
      "id": 22,
      "space": {
        "id": 3,
        "name": "Escritorio Ventana",
        "type": "DESK",
        "capacity": 1
      },
      "start_time": "2026-06-24T14:00:00Z",
      "end_time": "2026-06-24T18:00:00Z",
      "attendees": 1,
      "status": "CONFIRMED",
      "created_at": "2026-06-21T15:30:00Z"
    }
  ],
  "message": "Reservas recuperadas exitosamente"
}
```

---

## 4. Obtener Detalles de Reserva

### Solicitud

```http
GET /api/bookings/25
Authorization: Bearer <jwt_token>
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 25,
    "space": {
      "id": 1,
      "name": "Sala Creativa",
      "type": "SALA",
      "capacity": 8,
      "floor": "Piso 1",
      "has_projector": true,
      "has_ac": true
    },
    "user": {
      "id": 2,
      "name": "Carlos Méndez",
      "email": "carlos.mendez@corporativoalpha.com"
    },
    "start_time": "2026-06-23T09:00:00Z",
    "end_time": "2026-06-23T11:00:00Z",
    "attendees": 6,
    "status": "CONFIRMED",
    "created_at": "2026-06-22T21:10:00Z"
  },
  "message": "Reserva recuperada exitosamente"
}
```

**Respuesta de Error** (No Encontrado):

**Estado**: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Reserva con ID 25 no encontrada"
  }
}
```

**Respuesta de Error** (Prohibido):

**Estado**: `403 Forbidden`

```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Solo puedes ver tus propias reservas"
  }
}
```

---

## 5. Cancelar Reserva

### Solicitud

```http
DELETE /api/bookings/25
Authorization: Bearer <jwt_token>
```

### Respuesta

**Estado**: `200 OK`

```json
{
  "success": true,
  "message": "Reserva cancelada exitosamente"
}
```

**Respuesta de Error** (Reserva Pasada):

**Estado**: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "CANNOT_CANCEL_PAST_BOOKING",
    "message": "No se pueden cancelar reservas que ya han comenzado o terminado"
  }
}
```

**Respuesta de Error** (No es Propietario):

**Estado**: `403 Forbidden`

```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Solo puedes cancelar tus propias reservas"
  }
}
```

---

## 6. Verificar Disponibilidad

### Solicitud

```http
GET /api/bookings/check-availability?space_id=1&start_time=2026-06-23T09:00:00Z&end_time=2026-06-23T11:00:00Z
```

**Parámetros de Consulta**:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| space_id | integer | Sí | ID del espacio a verificar |
| start_time | ISO 8601 | Sí | Hora de inicio deseada |
| end_time | ISO 8601 | Sí | Hora de fin deseada |

### Respuesta

**Estado**: `200 OK` (Disponible)

```json
{
  "success": true,
  "data": {
    "available": true,
    "space_id": 1,
    "requested_time": {
      "start": "2026-06-23T09:00:00Z",
      "end": "2026-06-23T11:00:00Z"
    }
  },
  "message": "El espacio está disponible para el horario solicitado"
}
```

**Estado**: `200 OK` (No Disponible)

```json
{
  "success": true,
  "data": {
    "available": false,
    "space_id": 1,
    "requested_time": {
      "start": "2026-06-23T09:00:00Z",
      "end": "2026-06-23T11:00:00Z"
    },
    "conflicting_bookings": [
      {
        "id": 20,
        "start_time": "2026-06-23T08:00:00Z",
        "end_time": "2026-06-23T10:00:00Z"
      }
    ]
  },
  "message": "El espacio no está disponible para el horario solicitado"
}
```

---

## 🧪 Escenarios de Prueba

### Escenario 1: Flujo de Reserva Exitosa

```
1. POST /api/auth/login (obtener JWT)
2. GET /api/spaces?capacity=8 (encontrar espacio adecuado)
3. GET /api/bookings/check-availability (verificar disponibilidad)
4. POST /api/bookings (crear reserva)
5. GET /api/bookings/my-bookings (verificar que la reserva existe)
```

### Escenario 2: Detección de Solapamiento

```
1. POST /api/bookings (crear reserva 09:00-10:00)
2. POST /api/bookings (intentar 09:30-10:30) → 409 Conflict
```

### Escenario 3: Validación de Capacidad

```
1. GET /api/spaces/1 (capacidad: 8)
2. POST /api/bookings (asistentes: 10) → 400 Bad Request
```

### Escenario 4: Gestión de Espacios por Admin

```
1. POST /api/auth/login (credenciales de admin)
2. POST /api/spaces (crear nuevo espacio)
3. GET /api/spaces/dashboard (ver ocupación)
4. PUT /api/spaces/:id (actualizar espacio)
5. DELETE /api/spaces/:id (eliminar espacio)
```

---

## 🔒 Consideraciones de Seguridad

### Limitación de Tasa (Mejora Futura)

```
- Endpoint de login: 5 solicitudes por minuto por IP
- Creación de reservas: 10 solicitudes por minuto por usuario
- Listado de espacios: 100 solicitudes por minuto por IP
```

### Sanitización de Entradas

Todas las entradas se validan y sanitizan para prevenir:
- Inyección SQL
- Ataques XSS
- Inyección NoSQL (si se usa MongoDB)

### Configuración CORS

```javascript
{
  origin: ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

## 📚 Colección de Postman

Una colección completa de Postman está disponible en `/docs/OfficeSpace.postman_collection.json` con:

- Variables de entorno preconfiguradas
- Flujo de autenticación
- Todos los endpoints con ejemplos
- Scripts de prueba para validación

---

**Próximos Pasos**: Implementar los servicios siguiendo esta especificación de contrato.
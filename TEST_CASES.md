# Plan de Pruebas — OfficeSpace: Gestión Híbrida Inteligente
**Proyecto:** Corporativo Alpha — Sistema de reservas de espacios híbridos  
**Versión:** 1.0  
**Fecha:** 2026-06-22  
**Autor:** David Santiago Gaspar Rodríguez  

---

## 1. Alcance

Este documento describe los casos de prueba funcionales y de seguridad para los tres microservicios del sistema:

- **auth-service** (puerto 8083): autenticación y generación de JWT
- **catalog-service** (puerto 8081): gestión del catálogo de espacios
- **booking-service** (puerto 8082): motor de reservas

Las pruebas cubren dos niveles:

| Nivel | Herramienta | Propósito |
|-------|-------------|-----------|
| Unitario | JUnit 5 + Mockito | Lógica de negocio aislada, sin base de datos |
| Integración manual | cURL / Swagger UI | Flujo HTTP de extremo a extremo con todos los servicios levantados |

---

## 2. Datos de prueba

### 2.1 Usuarios predefinidos (seeder)

| ID | Email | Contraseña | Rol |
|----|-------|------------|-----|
| U1 | admin@corporativoalpha.com | Admin123 | ADMIN |
| U2 | carlos.mendez@corporativoalpha.com | User123 | COLLABORATOR |
| U3 | ana.torres@corporativoalpha.com | User123 | COLLABORATOR |

### 2.2 Espacios predefinidos (seeder)

| ID | Nombre | Tipo | Capacidad |
|----|--------|------|-----------|
| E1 | Sala Creativa | ROOM | 8 |
| E2 | Sala Innovación | ROOM | 12 |
| E3 | Sala Directivos | ROOM | 6 |
| E4 | Escritorio Ventana | DESK | 1 |
| E5 | Escritorio Silencioso | DESK | 1 |

---

## 3. Casos de prueba — auth-service

---

### TC-AUTH-001 · Login con credenciales válidas

| Campo | Detalle |
|-------|---------|
| **ID** | TC-AUTH-001 |
| **Módulo** | auth-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `AuthServiceTest.login_validCredentials_returnsLoginResponseWithToken` |
| **Prioridad** | Alta |

**Precondiciones**
- El servicio auth-service está levantado en el puerto 8083.
- El usuario U1 (`admin@corporativoalpha.com`) existe en la base de datos.

**Pasos**

1. Enviar `POST http://localhost:8083/api/auth/login` con el cuerpo:
```json
{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}
```

**Salida esperada**
- HTTP `200 OK`
- Cuerpo JSON con los campos:
  - `token`: cadena JWT no vacía (formato `eyJhbGci...`)
  - `tokenType`: `"Bearer"`
  - `email`: `"admin@corporativoalpha.com"`
  - `name`: `"Admin Alpha"`
  - `role`: `"ADMIN"`
  - `publicId`: UUID no nulo

---

### TC-AUTH-002 · Login con contraseña incorrecta

| Campo | Detalle |
|-------|---------|
| **ID** | TC-AUTH-002 |
| **Módulo** | auth-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `AuthServiceTest.login_invalidCredentials_throwsBadCredentialsException` |
| **Prioridad** | Alta |

**Precondiciones**
- El servicio auth-service está levantado.

**Pasos**

1. Enviar `POST http://localhost:8083/api/auth/login` con el cuerpo:
```json
{
  "email": "admin@corporativoalpha.com",
  "password": "ContraseñaIncorrecta"
}
```

**Salida esperada**
- HTTP `401 Unauthorized`
- El repositorio de usuarios **no** es consultado (validado en test unitario)
- El token **no** es generado

---

### TC-AUTH-003 · Login verifica email y contraseña correctos en el AuthenticationManager

| Campo | Detalle |
|-------|---------|
| **ID** | TC-AUTH-003 |
| **Módulo** | auth-service |
| **Tipo** | Unitario |
| **Referencia de test** | `AuthServiceTest.login_authenticatesWithCorrectEmailAndPassword` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna (prueba unitaria con mocks).

**Pasos**

1. Invocar el método `AuthService.login()` con email `admin@corporativoalpha.com` y password `Admin123`.

**Salida esperada**
- El `AuthenticationManager` es llamado exactamente una vez con un `UsernamePasswordAuthenticationToken` que contiene el email y la contraseña proporcionados.
- El token JWT es generado para el usuario encontrado.

---

## 4. Casos de prueba — catalog-service

---

### TC-CAT-001 · Listar todos los espacios activos sin filtros

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-001 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findAll_noFilters_returnsAllActive` |
| **Prioridad** | Alta |

**Precondiciones**
- Los 5 espacios del seeder están activos en la base de datos.

**Pasos**

1. Enviar `GET http://localhost:8081/api/resources`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con 5 elementos
- Cada elemento contiene: `publicId`, `name`, `type`, `capacity`, `features`, `location`, `active: true`

---

### TC-CAT-002 · Filtrar espacios por tipo ROOM

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-002 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findAll_withTypeFilter_returnsOnlyMatchingType` |
| **Prioridad** | Alta |

**Precondiciones**
- Los 5 espacios del seeder están activos.

**Pasos**

1. Enviar `GET http://localhost:8081/api/resources?type=ROOM`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con 3 elementos (Sala Creativa, Sala Innovación, Sala Directivos)
- Todos los elementos tienen `"type": "ROOM"`

---

### TC-CAT-003 · Filtrar espacios por capacidad mínima

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-003 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findAll_withCapacityFilter_returnsOnlyResourcesAboveMinCapacity` |
| **Prioridad** | Alta |

**Precondiciones**
- Los 5 espacios del seeder están activos.

**Pasos**

1. Enviar `GET http://localhost:8081/api/resources?minCapacity=8`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con 2 elementos (Sala Creativa cap. 8, Sala Innovación cap. 12)
- Todos los elementos tienen `capacity >= 8`

---

### TC-CAT-004 · Filtrar espacios por tipo y capacidad combinados

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-004 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findAll_withBothFilters_delegatesCorrectQuery` |
| **Prioridad** | Media |

**Precondiciones**
- Los 5 espacios del seeder están activos.

**Pasos**

1. Enviar `GET http://localhost:8081/api/resources?type=ROOM&minCapacity=8`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con 2 elementos (Sala Creativa cap. 8, Sala Innovación cap. 12)
- Todos los elementos tienen `type = ROOM` y `capacity >= 8`

---

### TC-CAT-005 · Obtener espacio por publicId existente

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-005 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findByPublicId_existingResource_returnsResponse` |
| **Prioridad** | Alta |

**Precondiciones**
- El UUID de la Sala Creativa es conocido (obtenido de TC-CAT-001).

**Pasos**

1. Obtener el `publicId` de la Sala Creativa con `GET /api/resources`
2. Enviar `GET http://localhost:8081/api/resources/{publicId}`

**Salida esperada**
- HTTP `200 OK`
- JSON con `name: "Sala Creativa"`, `type: "ROOM"`, `capacity: 8`

---

### TC-CAT-006 · Obtener espacio con publicId inexistente

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-006 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.findByPublicId_unknownId_throwsResourceNotFoundException` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna.

**Pasos**

1. Enviar `GET http://localhost:8081/api/resources/00000000-0000-0000-0000-000000000000`

**Salida esperada**
- HTTP `404 Not Found`
- Cuerpo JSON con `"status": 404` y mensaje que indica el UUID no encontrado

---

### TC-CAT-007 · Crear espacio (rol ADMIN)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-007 |
| **Módulo** | catalog-service |
| **Tipo** | Integración |
| **Referencia de test** | `ResourceServiceTest.create_validRequest_persistsAndReturnsResponse` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U1 (ADMIN) obtenido en TC-AUTH-001.

**Pasos**

1. Enviar `POST http://localhost:8081/api/resources` con header `Authorization: Bearer {token_admin}` y cuerpo:
```json
{
  "name": "Sala de Conferencias",
  "type": "ROOM",
  "capacity": 20,
  "location": "Floor 5, Building A",
  "features": {
    "has_projector": true,
    "has_ac": true,
    "monitors": 4
  }
}
```

**Salida esperada**
- HTTP `201 Created`
- JSON con `publicId` generado, `name: "Sala de Conferencias"`, `capacity: 20`, `active: true`

---

### TC-CAT-008 · Crear espacio con rol COLLABORATOR (acceso denegado)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-008 |
| **Módulo** | catalog-service |
| **Tipo** | Integración |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U2 (COLLABORATOR) obtenido en TC-AUTH-001.

**Pasos**

1. Enviar `POST http://localhost:8081/api/resources` con header `Authorization: Bearer {token_collaborator}` y cualquier cuerpo válido.

**Salida esperada**
- HTTP `403 Forbidden`

---

### TC-CAT-009 · Desactivar espacio (soft delete)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-009 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `ResourceServiceTest.softDelete_existingResource_setsActiveToFalse` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U1 (ADMIN).
- `publicId` de un espacio existente.

**Pasos**

1. Enviar `DELETE http://localhost:8081/api/resources/{publicId}` con header `Authorization: Bearer {token_admin}`
2. Enviar `GET http://localhost:8081/api/resources` para verificar que ya no aparece en la lista

**Salida esperada**
- Paso 1: HTTP `204 No Content`
- Paso 2: el espacio desactivado **no** aparece en la lista (soft delete, el registro persiste en BD con `active = false`)

---

### TC-CAT-010 · Desactivar espacio inexistente

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-010 |
| **Módulo** | catalog-service |
| **Tipo** | Unitario |
| **Referencia de test** | `ResourceServiceTest.softDelete_unknownId_throwsResourceNotFoundException` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna (prueba unitaria con mocks).

**Pasos**

1. Invocar `ResourceService.softDelete()` con un UUID que no existe en repositorio.

**Salida esperada**
- Se lanza `ResourceNotFoundException` con el UUID en el mensaje.

---

### TC-CAT-011 · Acceso sin token devuelve 401

| Campo | Detalle |
|-------|---------|
| **ID** | TC-CAT-011 |
| **Módulo** | catalog-service |
| **Tipo** | Integración |
| **Prioridad** | Alta |

**Precondiciones**
- Ninguna.

**Pasos**

1. Enviar `POST http://localhost:8081/api/resources` sin header `Authorization`.

**Salida esperada**
- HTTP `401 Unauthorized`
- JSON con `"status": 401, "error": "Unauthorized"`

---

## 5. Casos de prueba — booking-service

---

### TC-BOOK-001 · Crear reserva válida

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-001 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_validRequest_savesAndReturnsResponse` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U2 (COLLABORATOR).
- `publicId` de la Sala Creativa (capacidad 8).
- La fecha de reserva es mañana o posterior.
- No existe ninguna reserva para ese espacio en el horario seleccionado.

**Pasos**

1. Enviar `POST http://localhost:8082/api/bookings` con header `Authorization: Bearer {token}` y cuerpo:
```json
{
  "spacePublicId": "{publicId_sala_creativa}",
  "bookingDate": "2026-06-25",
  "startTime": "09:00",
  "endTime": "11:00",
  "attendees": 5,
  "notes": "Reunión de equipo"
}
```

**Salida esperada**
- HTTP `201 Created`
- JSON con: `publicId` (UUID generado), `spacePublicId`, `bookingDate: "2026-06-25"`, `startTime: "09:00"`, `endTime: "11:00"`, `attendees: 5`, `createdAt`

---

### TC-BOOK-002 · Crear reserva con fecha en el pasado

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-002 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_pastDate_throwsIllegalArgument` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT válido.

**Pasos**

1. Enviar `POST http://localhost:8082/api/bookings` con `"bookingDate": "2026-01-01"` (fecha pasada).

**Salida esperada**
- HTTP `400 Bad Request`
- JSON con `"error"` que contiene la palabra `"past"`

---

### TC-BOOK-003 · Crear reserva con hora de fin anterior a la de inicio

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-003 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_endTimeBeforeStartTime_throwsIllegalArgument` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT válido.

**Pasos**

1. Enviar `POST http://localhost:8082/api/bookings` con `"startTime": "11:00"` y `"endTime": "09:00"`.

**Salida esperada**
- HTTP `400 Bad Request`
- JSON con `"error"` que contiene `"End time"`

---

### TC-BOOK-004 · Crear reserva con hora de inicio igual a la de fin

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-004 |
| **Módulo** | booking-service |
| **Tipo** | Unitario |
| **Referencia de test** | `BookingServiceTest.create_equalStartAndEndTime_throwsIllegalArgument` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna (prueba unitaria con mocks).

**Pasos**

1. Invocar `BookingService.create()` con `startTime = "10:00"` y `endTime = "10:00"`.

**Salida esperada**
- Se lanza `IllegalArgumentException`.

---

### TC-BOOK-005 · Crear reserva para espacio inexistente

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-005 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_spaceNotFound_throwsIllegalArgument` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT válido.

**Pasos**

1. Enviar `POST http://localhost:8082/api/bookings` con un `spacePublicId` que no existe en el catalog-service.

**Salida esperada**
- HTTP `400 Bad Request`
- JSON con `"error"` que contiene `"Space not found"`

---

### TC-BOOK-006 · Crear reserva para espacio inactivo

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-006 |
| **Módulo** | booking-service |
| **Tipo** | Unitario |
| **Referencia de test** | `BookingServiceTest.create_spaceInactive_throwsIllegalArgument` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna (prueba unitaria con mocks).

**Pasos**

1. Invocar `BookingService.create()` con un `spacePublicId` cuyo recurso tiene `active = false`.

**Salida esperada**
- Se lanza `IllegalArgumentException` con mensaje `"Space not found or not available"`.

---

### TC-BOOK-007 · Crear reserva con asistentes que exceden la capacidad

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-007 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_attendeesExceedCapacity_throwsIllegalArgument` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT válido.
- La Sala Creativa tiene capacidad 8.

**Pasos**

1. Enviar `POST http://localhost:8082/api/bookings` con `"attendees": 9` para la Sala Creativa (capacidad 8).

**Salida esperada**
- HTTP `400 Bad Request`
- JSON con `"error"` que contiene `"capacity"` y los valores `9` (asistentes) y `8` (capacidad)

---

### TC-BOOK-008 · Crear reserva con solapamiento de horario

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-008 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.create_overlappingBookingExists_throwsBookingConflict` |
| **Prioridad** | Alta |

**Precondiciones**
- Existe una reserva para la Sala Creativa el mismo día de 09:00 a 11:00.

**Pasos**

1. Con la reserva anterior activa, enviar `POST http://localhost:8082/api/bookings` para el mismo espacio y día con horario `"startTime": "10:00"` y `"endTime": "12:00"` (solapamiento parcial).

**Salida esperada**
- HTTP `409 Conflict`
- JSON con `"error"` que contiene `"already booked"`

---

### TC-BOOK-009 · Ver mis reservas

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-009 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.findMyBookings_returnsOnlyUserBookings` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U2 (COLLABORATOR).
- U2 tiene al menos una reserva creada.

**Pasos**

1. Enviar `GET http://localhost:8082/api/bookings/my` con header `Authorization: Bearer {token_U2}`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con las reservas pertenecientes únicamente a U2
- Ordenado por `bookingDate` descendente, luego por `startTime` descendente

---

### TC-BOOK-010 · Cancelar reserva propia (futura)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-010 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.cancel_validFutureBooking_deletesBooking` |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U2.
- U2 tiene una reserva futura con `publicId` conocido.

**Pasos**

1. Enviar `DELETE http://localhost:8082/api/bookings/{publicId}` con header `Authorization: Bearer {token_U2}`

**Salida esperada**
- HTTP `204 No Content`
- La reserva ya no aparece en `GET /api/bookings/my`

---

### TC-BOOK-011 · Cancelar reserva de otro usuario

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-011 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.cancel_notOwner_throwsAccessDeniedException` |
| **Prioridad** | Alta |

**Precondiciones**
- Reserva creada por U2 con `publicId` conocido.
- Token JWT de U3 (otro COLLABORATOR).

**Pasos**

1. Enviar `DELETE http://localhost:8082/api/bookings/{publicId_de_U2}` con header `Authorization: Bearer {token_U3}`

**Salida esperada**
- HTTP `403 Forbidden`
- La reserva de U2 permanece activa

---

### TC-BOOK-012 · Cancelar reserva ya iniciada o pasada

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-012 |
| **Módulo** | booking-service |
| **Tipo** | Unitario |
| **Referencia de test** | `BookingServiceTest.cancel_bookingAlreadyPassed_throwsIllegalArgument` |
| **Prioridad** | Media |

**Precondiciones**
- Ninguna (prueba unitaria con mocks).

**Pasos**

1. Invocar `BookingService.cancel()` con una reserva cuya `bookingDate` es ayer.

**Salida esperada**
- Se lanza `IllegalArgumentException` con mensaje que contiene `"already started"`.

---

### TC-BOOK-013 · Cancelar reserva inexistente

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-013 |
| **Módulo** | booking-service |
| **Tipo** | Unitario + Integración |
| **Referencia de test** | `BookingServiceTest.cancel_bookingNotFound_throwsBookingNotFoundException` |
| **Prioridad** | Media |

**Precondiciones**
- Token JWT válido.

**Pasos**

1. Enviar `DELETE http://localhost:8082/api/bookings/00000000-0000-0000-0000-000000000000`

**Salida esperada**
- HTTP `404 Not Found`

---

### TC-BOOK-014 · Dashboard de reservas por fecha (ADMIN)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-014 |
| **Módulo** | booking-service |
| **Tipo** | Integración |
| **Prioridad** | Alta |

**Precondiciones**
- Token JWT de U1 (ADMIN).
- Al menos una reserva existe para la fecha consultada.

**Pasos**

1. Enviar `GET http://localhost:8082/api/bookings/dashboard?date=2026-06-25` con header `Authorization: Bearer {token_admin}`

**Salida esperada**
- HTTP `200 OK`
- Array JSON con todas las reservas del día, de todos los usuarios

---

### TC-BOOK-015 · Acceso sin token devuelve 401

| Campo | Detalle |
|-------|---------|
| **ID** | TC-BOOK-015 |
| **Módulo** | booking-service |
| **Tipo** | Integración |
| **Prioridad** | Alta |

**Precondiciones**
- Ninguna.

**Pasos**

1. Enviar `GET http://localhost:8082/api/bookings/my` sin header `Authorization`.

**Salida esperada**
- HTTP `401 Unauthorized`
- JSON con `"status": 401, "error": "Unauthorized"`

---

## 6. Resumen de cobertura

| ID | Descripción | Módulo | Tipo | Prioridad |
|----|-------------|--------|------|-----------|
| TC-AUTH-001 | Login con credenciales válidas | auth-service | Unitario + Integración | Alta |
| TC-AUTH-002 | Login con contraseña incorrecta | auth-service | Unitario + Integración | Alta |
| TC-AUTH-003 | Verificación de parámetros de autenticación | auth-service | Unitario | Media |
| TC-CAT-001 | Listar todos los espacios activos | catalog-service | Unitario + Integración | Alta |
| TC-CAT-002 | Filtrar por tipo ROOM | catalog-service | Unitario + Integración | Alta |
| TC-CAT-003 | Filtrar por capacidad mínima | catalog-service | Unitario + Integración | Alta |
| TC-CAT-004 | Filtrar por tipo y capacidad combinados | catalog-service | Unitario + Integración | Media |
| TC-CAT-005 | Obtener espacio por publicId existente | catalog-service | Unitario + Integración | Alta |
| TC-CAT-006 | Obtener espacio con publicId inexistente | catalog-service | Unitario + Integración | Media |
| TC-CAT-007 | Crear espacio (ADMIN) | catalog-service | Integración | Alta |
| TC-CAT-008 | Crear espacio con rol COLLABORATOR | catalog-service | Integración | Alta |
| TC-CAT-009 | Desactivar espacio (soft delete) | catalog-service | Unitario + Integración | Alta |
| TC-CAT-010 | Desactivar espacio inexistente | catalog-service | Unitario | Media |
| TC-CAT-011 | Acceso sin token devuelve 401 | catalog-service | Integración | Alta |
| TC-BOOK-001 | Crear reserva válida | booking-service | Unitario + Integración | Alta |
| TC-BOOK-002 | Fecha en el pasado | booking-service | Unitario + Integración | Alta |
| TC-BOOK-003 | Hora de fin anterior a la de inicio | booking-service | Unitario + Integración | Alta |
| TC-BOOK-004 | Hora de inicio igual a la de fin | booking-service | Unitario | Media |
| TC-BOOK-005 | Espacio inexistente | booking-service | Unitario + Integración | Alta |
| TC-BOOK-006 | Espacio inactivo | booking-service | Unitario | Media |
| TC-BOOK-007 | Asistentes exceden capacidad | booking-service | Unitario + Integración | Alta |
| TC-BOOK-008 | Solapamiento de horario | booking-service | Unitario + Integración | Alta |
| TC-BOOK-009 | Ver mis reservas | booking-service | Unitario + Integración | Alta |
| TC-BOOK-010 | Cancelar reserva propia (futura) | booking-service | Unitario + Integración | Alta |
| TC-BOOK-011 | Cancelar reserva de otro usuario | booking-service | Unitario + Integración | Alta |
| TC-BOOK-012 | Cancelar reserva ya iniciada o pasada | booking-service | Unitario | Media |
| TC-BOOK-013 | Cancelar reserva inexistente | booking-service | Unitario + Integración | Media |
| TC-BOOK-014 | Dashboard por fecha (ADMIN) | booking-service | Integración | Alta |
| TC-BOOK-015 | Acceso sin token devuelve 401 | booking-service | Integración | Alta |

**Total: 29 casos de prueba**  
**Alta prioridad: 21 · Media prioridad: 8**  
**Tests unitarios automatizados: 28 (JUnit 5 + Mockito)**

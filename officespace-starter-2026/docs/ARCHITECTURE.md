# Decisiones Arquitectónicas — OfficeSpace

## Arquitectura Elegida: Microservicios con Base de Datos Compartida

Elegimos esta arquitectura porque combina la separación de responsabilidades de los microservicios con la simplicidad de una sola base de datos, reduciendo la complejidad de transacciones distribuidas sin sacrificar la independencia de cada servicio.

---

## Servicios y Responsabilidades

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| api-gateway | 3000 | Enrutamiento central y CORS |
| auth-service | 3003 | Autenticación y generación de JWT |
| catalog-service | 3001 | CRUD de espacios |
| booking-service | 3002 | Motor de reservas y validaciones |
| frontend | 8080 | Interfaz de usuario (nginx) |
| postgres | 5432 | Base de datos compartida |

---

## Decisiones Técnicas Clave

### 1. JWT para Autenticación
El token JWT contiene `{ id, email, rol }` y se valida en cada servicio mediante un middleware compartido (`auth.middleware.js`). No se usa sesión del servidor — el token viaja en el header `Authorization: Bearer <token>`.

### 2. Validación de Solapamiento
La query crítica que previene doble booking:
```sql
SELECT id FROM reservas
WHERE space_id = $1
  AND fecha = $2
  AND hora_inicio < $4
  AND hora_fin > $3
```
Esta condición detecta los 5 casos de solapamiento posibles.

### 3. WebSockets para Notificaciones
`booking-service` usa `socket.io` sobre el mismo servidor HTTP. Al crear o cancelar una reserva, emite un evento a todos los clientes conectados sin necesidad de polling.

### 4. API Gateway
Centraliza el enrutamiento con `express-http-proxy`. El frontend solo conoce `localhost:3000` — no sabe qué servicio responde internamente. Dentro de Docker, el gateway usa los nombres de contenedor (`officespace_auth:3003`) en vez de `localhost`.

### 5. Base de Datos Compartida
Los tres servicios comparten la misma instancia de PostgreSQL 15. Cada servicio accede solo a las tablas de su dominio: `catalog-service` → `espacios`, `booking-service` → `reservas`, `auth-service` → `usuarios`.

---

## Flujo de una Reserva

```
Usuario → Frontend → Gateway :3000
  → POST /login → auth-service :3003 → PostgreSQL (usuarios)
  ← JWT token

Usuario → Frontend → Gateway :3000
  → GET /spaces → catalog-service :3001 → PostgreSQL (espacios)
  ← Lista de espacios

Usuario → Frontend → Gateway :3000
  → POST /bookings → booking-service :3002
      → Valida JWT
      → Verifica espacio existe
      → Valida capacidad
      → Valida fecha no pasada
      → Valida hora_fin > hora_inicio
      → Query solapamiento
      → INSERT reserva
      → Emite evento WebSocket
  ← 201 Created
```

---

## Por qué no Microservicios con DB Separada

- Requiere transacciones distribuidas (SAGA pattern)
- Mayor complejidad de configuración
- Tiempo de desarrollo no viable para hackathon
- La separación lógica por servicio cumple el objetivo de aprendizaje

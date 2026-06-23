# 📋 OfficeSpace – CURLs de Prueba Completos

## Variables de entorno (opcional)
```bash
AUTH_URL=http://localhost:8081
CATALOG_URL=http://localhost:8082
BOOKING_URL=http://localhost:8083

# Obten el token después del login
TOKEN="<pega_tu_token_aqui>"
```

---

## 1️⃣ AUTH SERVICE (puerto 8081)

### Health Check
```bash
curl -X GET http://localhost:8081/api/auth/health
```

### Login – Admin (éxito esperado: 200)
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"Admin123"}'
```

### Login – Colaborador Carlos
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendez@corporativoalpha.com","password":"User123"}'
```

### Login – Credenciales Inválidas (esperado: 401)
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"WrongPass"}'
```

### Login – Email Inválido (esperado: 400)
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"Admin123"}'
```

### Validar Token (reemplaza TOKEN con el obtenido en login)
```bash
curl -X GET http://localhost:8081/api/auth/validate \
  -H "Authorization: Bearer $TOKEN"
```

### Validar Token Inválido (esperado: valid=false)
```bash
curl -X GET http://localhost:8081/api/auth/validate \
  -H "Authorization: Bearer invalid.token.here"
```

---

## 2️⃣ CATALOG SERVICE (puerto 8082)

> ⚠️ Primero haz login como Admin para obtener TOKEN_ADMIN
> ⚠️ Para GET, también funciona con TOKEN de colaborador

### Health Check
```bash
curl -X GET http://localhost:8082/api/spaces/health
```

### Listar Todos los Espacios
```bash
curl -X GET http://localhost:8082/api/spaces \
  -H "Authorization: Bearer $TOKEN"
```

### Listar con Filtro – Solo Salas de Juntas
```bash
curl -X GET "http://localhost:8082/api/spaces?type=SALA_JUNTAS" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar con Filtro – Capacidad Mínima 8
```bash
curl -X GET "http://localhost:8082/api/spaces?minCapacity=8" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar con Filtros Combinados
```bash
curl -X GET "http://localhost:8082/api/spaces?type=SALA_JUNTAS&minCapacity=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Obtener Espacio por ID
```bash
curl -X GET http://localhost:8082/api/spaces/<SPACE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Listar Espacios Activos
```bash
curl -X GET http://localhost:8082/api/spaces/active \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Espacio (solo ADMIN, esperado: 201)
```bash
curl -X POST http://localhost:8082/api/spaces \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sala de Innovación",
    "type": "SALA_JUNTAS",
    "capacity": 15,
    "floor": "Piso 6",
    "location": "Torre Norte",
    "resources": ["Proyector 4K", "Pizarrón Digital", "Aire Acondicionado"]
  }'
```

### Crear Espacio como Colaborador (esperado: 403 Forbidden)
```bash
curl -X POST http://localhost:8082/api/spaces \
  -H "Authorization: Bearer $TOKEN_COLABORADOR" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"ESCRITORIO","capacity":1,"floor":"P1"}'
```

### Actualizar Espacio (solo ADMIN)
```bash
curl -X PUT http://localhost:8082/api/spaces/<SPACE_ID> \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sala de Innovación V2","capacity":20,"active":true}'
```

### Eliminar Espacio (solo ADMIN, esperado: 204)
```bash
curl -X DELETE http://localhost:8082/api/spaces/<SPACE_ID> \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

### Sin Token (esperado: 401/403)
```bash
curl -X GET http://localhost:8082/api/spaces
```

---

## 3️⃣ BOOKING SERVICE (puerto 8083)

> Reemplaza SPACE_ID con un ID real obtenido del catalog-service
> Reemplaza FECHA con una fecha futura: ej. 2026-08-01

### Health Check
```bash
curl -X GET http://localhost:8083/api/bookings/health
```

### ✅ Crear Reserva Exitosa
```bash
curl -X POST http://localhost:8083/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "<SPACE_ID>",
    "date": "2026-08-01",
    "startTime": "09:00",
    "endTime": "10:30",
    "attendees": 5,
    "notes": "Sprint Planning Q3"
  }'
```

### ❌ Crear Reserva Solapada (esperado: 409 Conflict)
```bash
# Primero crear la reserva anterior, luego ejecutar esto:
curl -X POST http://localhost:8083/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "<SAME_SPACE_ID>",
    "date": "2026-08-01",
    "startTime": "09:30",
    "endTime": "11:00",
    "attendees": 3,
    "notes": "Reunión solapada - debe fallar"
  }'
```

### ❌ Reserva en el Pasado (esperado: 400)
```bash
curl -X POST http://localhost:8083/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "<SPACE_ID>",
    "date": "2020-01-01",
    "startTime": "09:00",
    "endTime": "10:00",
    "attendees": 2
  }'
```

### ❌ Hora Fin <= Hora Inicio (esperado: 400)
```bash
curl -X POST http://localhost:8083/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "<SPACE_ID>",
    "date": "2026-08-02",
    "startTime": "11:00",
    "endTime": "09:00",
    "attendees": 2
  }'
```

### ❌ Capacidad Excedida (esperado: 400)
```bash
# Usa un espacio con capacidad baja (ej. Escritorio=1)
curl -X POST http://localhost:8083/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "<ESCRITORIO_ID>",
    "date": "2026-08-03",
    "startTime": "10:00",
    "endTime": "11:00",
    "attendees": 50
  }'
```

### ❌ Sin Autenticación (esperado: 401/403)
```bash
curl -X POST http://localhost:8083/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"spaceId":"any","date":"2026-08-01","startTime":"09:00","endTime":"10:00","attendees":1}'
```

### Mis Reservas
```bash
curl -X GET http://localhost:8083/api/bookings/my \
  -H "Authorization: Bearer $TOKEN"
```

### Reservas de Hoy (Dashboard Admin)
```bash
curl -X GET http://localhost:8083/api/bookings/today \
  -H "Authorization: Bearer $TOKEN"
```

### Cancelar Reserva (dueño o admin)
```bash
curl -X DELETE http://localhost:8083/api/bookings/<BOOKING_ID> \
  -H "Authorization: Bearer $TOKEN"
```

### Cancelar Reserva de Otro Usuario como Colaborador (esperado: 403)
```bash
# Con token de carlos intentar cancelar reserva de ana
curl -X DELETE http://localhost:8083/api/bookings/<ANA_BOOKING_ID> \
  -H "Authorization: Bearer $TOKEN_CARLOS"
```

---

## 🧪 Script de Prueba Automatizado (Bash)

```bash
#!/bin/bash
echo "=== OfficeSpace Test Script ==="

BASE_AUTH=http://localhost:8081
BASE_CAT=http://localhost:8082
BASE_BOOK=http://localhost:8083

# 1. Login Admin
echo "\n1. Login Admin..."
RESP=$(curl -s -X POST $BASE_AUTH/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"Admin123"}')
ADMIN_TOKEN=$(echo $RESP | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token Admin: ${ADMIN_TOKEN:0:30}..."

# 2. Login Carlos
echo "\n2. Login Colaborador..."
RESP2=$(curl -s -X POST $BASE_AUTH/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendez@corporativoalpha.com","password":"User123"}')
CARLOS_TOKEN=$(echo $RESP2 | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token Carlos: ${CARLOS_TOKEN:0:30}..."

# 3. Get first space ID
echo "\n3. Obteniendo espacios..."
SPACES=$(curl -s -X GET $BASE_CAT/api/spaces \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Espacios: $SPACES" | head -c 200

echo "\n\n=== Tests completados. Verifica los resultados arriba ==="
```

---

## 📊 Casos de Prueba Gherkin (BDD)

```gherkin
Feature: Motor de Reservas Anti-Solapamiento

  Scenario: Reserva exitosa sin conflicto
    Given el usuario "carlos.mendez@corporativoalpha.com" está autenticado
    And el espacio "Sala Creativa B" está disponible el "2026-08-01"
    When crea una reserva de "09:00" a "10:00" con 5 asistentes
    Then la respuesta debe ser 201 Created
    And la reserva tiene status "CONFIRMADA"

  Scenario: Solapamiento detectado - CRÍTICO
    Given existe una reserva confirmada en "Sala Creativa B" de "09:00" a "10:00"
    When se intenta reservar el mismo espacio de "09:30" a "11:00"
    Then la respuesta debe ser 409 Conflict
    And el mensaje debe indicar "ya está reservado"

  Scenario: Reserva en el pasado rechazada
    Given el usuario está autenticado
    When intenta crear una reserva con fecha "2020-01-01"
    Then la respuesta debe ser 400 Bad Request
    And el mensaje indica "reservas en el pasado"

  Scenario: Capacidad excedida rechazada
    Given el espacio tiene capacidad para 8 personas
    When se solicita reservar para 10 asistentes
    Then la respuesta debe ser 400 Bad Request
    And el mensaje indica "Capacidad excedida"

  Scenario: Sin autenticación rechazado
    Given no se incluye token JWT en el header
    When se llama a POST /api/bookings
    Then la respuesta debe ser 401 o 403
```

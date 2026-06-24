# 🧪 Guía de Pruebas - OfficeSpace

## 📋 Índice
1. [Preparación del Entorno](#preparación-del-entorno)
2. [Ejecución de Pruebas](#ejecución-de-pruebas)
3. [Casos de Prueba](#casos-de-prueba)
4. [Resultados Esperados](#resultados-esperados)

---

## 🚀 Preparación del Entorno

### 1. Iniciar Servicios

```bash
# Terminal 1 - Base de Datos (Docker)
cd Escenario1
docker-compose up -d

# Terminal 2 - Catalog Service
cd Escenario1/catalog_service
npm start

# Terminal 3 - Booking Service
cd Escenario1/booking_service
npm start

# Terminal 4 - Frontend
cd Escenario1/frontend
npm run dev
```

### 2. Verificar que todos los servicios estén corriendo

```bash
# Verificar Catalog Service
curl http://localhost:3001/health

# Verificar Booking Service
curl http://localhost:3002/health

# Verificar Frontend
# Abrir http://localhost:5174 en el navegador
```

---

## 🧪 Ejecución de Pruebas

### Opción 1: Usando VS Code REST Client

1. Instala la extensión "REST Client" en VS Code
2. Abre el archivo `TEST-CASES.http`
3. Ejecuta las pruebas en orden:
   - Primero ejecuta el LOGIN (Paso 1.1)
   - Copia el token de la respuesta
   - Reemplaza `{{token}}` con tu token en las siguientes peticiones
   - Ejecuta cada caso de prueba haciendo click en "Send Request"

### Opción 2: Usando cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","contrasena":"Admin123"}' \
  | jq -r '.token')

# 2. Obtener espacios
curl -X GET http://localhost:3001/spaces \
  -H "Authorization: Bearer $TOKEN"

# 3. Crear espacio
curl -X POST http://localhost:3001/spaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Sala de Prueba",
    "tipo": "SALA",
    "capacidad": 8,
    "piso": "Piso 3",
    "con_proyector": true,
    "con_aire": true
  }'
```

### Opción 3: Usando Postman

1. Importa el archivo `TEST-CASES.http` en Postman
2. Crea una variable de entorno `token`
3. Ejecuta el login y guarda el token automáticamente
4. Ejecuta los demás casos de prueba

---

## 📝 Casos de Prueba

### PASO 1: Autenticación ✅

| Caso | Endpoint | Método | Resultado Esperado |
|------|----------|--------|-------------------|
| 1.1 | `/auth/login` | POST | 200 - Token JWT + datos de usuario |
| 1.2 | `/auth/login` | POST | 200 - Token JWT (Colaborador) |

**Datos de prueba:**
- Admin: `admin@corporativoalpha.com` / `Admin123`
- Colaborador: `carlos.mendez@corporativoalpha.com` / `User123`

---

### PASO 2: Gestión de Espacios (Admin) ✅

| Caso | Endpoint | Método | Rol | Resultado Esperado |
|------|----------|--------|-----|-------------------|
| 2.1 | `/health` | GET | - | 200 - Status OK |
| 2.2 | `/spaces` | GET | Usuario | 200 - Lista de espacios |
| 2.3 | `/spaces?tipo=SALA` | GET | Usuario | 200 - Solo salas |
| 2.4 | `/spaces?capacidad=6` | GET | Usuario | 200 - Espacios con capacidad ≥6 |
| 2.5 | `/spaces/1` | GET | Usuario | 200 - Espacio específico |
| 2.6 | `/spaces` | POST | **Admin** | 201 - Espacio creado |
| 2.7 | `/spaces/1` | PUT | **Admin** | 200 - Espacio actualizado |
| 2.8 | `/spaces/9` | DELETE | **Admin** | 200 - Espacio eliminado |
| 2.9 | `/spaces` | POST | Colaborador | **403 - Forbidden** |

---

### PASO 3: Sistema de Reservaciones ✅

| Caso | Endpoint | Método | Resultado Esperado |
|------|----------|--------|-------------------|
| 3.1 | `/bookings/health` | GET | 200 - Status OK |
| 3.2 | `/bookings/available` | GET | 200 - Espacios disponibles |
| 3.3 | `/bookings/available?tipo=SALA` | GET | 200 - Salas disponibles |
| 3.4 | `/bookings` | POST | 201 - Reserva creada |
| 3.5 | `/bookings/mine` | GET | 200 - Mis reservas |
| 3.6 | `/bookings/1` | DELETE | 200 - Reserva cancelada |

---

### PASO 4: Casos de Prueba Específicos 🔍

#### 4.1 Traslape de Horarios ❌
**Objetivo:** Verificar que no se permitan reservas con traslape

1. Crear reserva: Espacio 2, 14:00-16:00 → **201 Created**
2. Intentar traslape: Espacio 2, 15:00-17:00 → **409 Conflict**

**Resultado esperado:** Error 409 con mensaje "El espacio ya tiene una reserva confirmada en ese horario"

---

#### 4.2 Liberación de Espacio tras Cancelación ✅
**Objetivo:** Verificar que al cancelar una reserva, el espacio se libera inmediatamente

1. Crear reserva: Espacio 3, 10:00-11:00 → **201 Created**
2. Intentar mismo horario → **409 Conflict**
3. Cancelar primera reserva → **200 OK**
4. Intentar mismo horario nuevamente → **201 Created** ✅

**Resultado esperado:** Después de cancelar, el espacio debe estar disponible

---

#### 4.3 Refrigerador solo en Sala de Lactancia 🧊
**Objetivo:** Verificar restricción de refrigerador

1. Intentar reservar refrigerador en Sala Creativa (ID 1) → **403 Forbidden**
2. Reservar refrigerador en Sala de Lactancia (ID 8) → **201 Created** ✅

**Resultado esperado:** Solo la Sala de Lactancia permite refrigerador

---

#### 4.4 Exceder Capacidad ❌
**Objetivo:** Verificar validación de capacidad

1. Reservar Sala Pequeña A (capacidad 4) con 10 asistentes → **400 Bad Request**

**Resultado esperado:** Error indicando que se excede la capacidad

---

#### 4.5 Reservas Consecutivas ✅
**Objetivo:** Verificar que se permitan reservas consecutivas

1. Reservar Escritorio 4, 10:00-11:00 → **201 Created**
2. Reservar Escritorio 4, 11:00-12:00 → **201 Created** ✅

**Resultado esperado:** Ambas reservas deben crearse exitosamente

---

### PASO 5: Panel de Administrador 👨‍💼

| Caso | Endpoint | Método | Rol | Resultado Esperado |
|------|----------|--------|-----|-------------------|
| 5.1 | `/bookings/today` | GET | **Admin** | 200 - Reservas de hoy |
| 5.2 | `/bookings/by-date?fecha=2026-06-26` | GET | **Admin** | 200 - Reservas de la fecha |
| 5.4 | `/bookings/by-date?fecha=2026-06-26` | GET | Colaborador | **403 - Forbidden** |

---

## ✅ Resultados Esperados

### Códigos HTTP

| Código | Significado | Cuándo se usa |
|--------|-------------|---------------|
| 200 | OK | Operación exitosa (GET, PUT, DELETE) |
| 201 | Created | Recurso creado exitosamente (POST) |
| 400 | Bad Request | Validación fallida (datos inválidos) |
| 401 | Unauthorized | Token no proporcionado o inválido |
| 403 | Forbidden | Usuario no tiene permisos (rol insuficiente) |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto de horarios (traslape) |
| 500 | Internal Server Error | Error del servidor |

---

### Validaciones Implementadas

#### ✅ Autenticación y Autorización
- [x] Login con JWT
- [x] Token en header `Authorization: Bearer <token>`
- [x] Middleware `verifyToken` valida token
- [x] Middleware `verifyAdmin` valida rol ADMINISTRADOR

#### ✅ Gestión de Espacios
- [x] Solo Admin puede crear/editar/eliminar espacios
- [x] Colaboradores pueden ver espacios
- [x] Filtros por tipo y capacidad
- [x] Soft delete (disponible = false)

#### ✅ Sistema de Reservaciones
- [x] Validación de traslapes (solo CONFIRMED/PENDING)
- [x] Cancelación libera espacio inmediatamente
- [x] Refrigerador solo en Sala de Lactancia
- [x] Validación de capacidad
- [x] No permitir reservas en el pasado
- [x] Hora salida > hora entrada

#### ✅ Panel de Administrador
- [x] Ver todas las reservas por fecha
- [x] Ver reservas de hoy
- [x] Colaboradores solo ven sus propias reservas
- [x] Reservas CANCELLED no se muestran

---

## 🐛 Troubleshooting

### Problema: Error 401 "Token no proporcionado"
**Solución:** Asegúrate de incluir el header `Authorization: Bearer <token>`

### Problema: Error 403 "Acceso denegado"
**Solución:** Verifica que estés usando el token de Admin para operaciones administrativas

### Problema: Error 500 al crear espacio
**Solución:** Verifica que la columna `con_refrigerador` exista en la BD:
```bash
docker exec officespace_db psql -U officeuser -d officespace -c "\d espacios"
```

### Problema: Booking service no responde
**Solución:** Verifica que esté corriendo:
```bash
curl http://localhost:3002/health
```

---

## 📊 Checklist de Pruebas

### Antes de empezar
- [ ] Todos los servicios están corriendo
- [ ] Base de datos tiene datos iniciales
- [ ] Puedes acceder al frontend en http://localhost:5174

### Pruebas Básicas
- [ ] Login como Admin funciona
- [ ] Login como Colaborador funciona
- [ ] Obtener lista de espacios funciona
- [ ] Crear espacio como Admin funciona
- [ ] Editar espacio como Admin funciona
- [ ] Eliminar espacio como Admin funciona
- [ ] Crear espacio como Colaborador falla con 403

### Pruebas de Reservaciones
- [ ] Crear reserva funciona
- [ ] Ver mis reservas funciona
- [ ] Cancelar reserva funciona
- [ ] Traslape de horarios falla con 409
- [ ] Espacio se libera tras cancelación
- [ ] Refrigerador solo en Sala de Lactancia
- [ ] Exceder capacidad falla con 400

### Pruebas de Admin
- [ ] Ver reservas de hoy funciona
- [ ] Ver reservas por fecha funciona
- [ ] Colaborador no puede ver panel Admin (403)

---

## 📝 Notas Adicionales

- Los tokens JWT expiran en 24 horas
- Las reservas CANCELLED no se muestran en el panel
- El soft delete mantiene los espacios en la BD pero los marca como no disponibles
- Los logs de debug están activos en todos los servicios

---

**Última actualización:** 2026-06-23
**Versión:** 1.0.0
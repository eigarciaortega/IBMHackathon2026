# 💳 NeoWallet - Sistema de Pagos P2P

Sistema bancario distribuido con arquitectura de microservicios que garantiza la integridad de transacciones financieras mediante el **Patrón Saga** y **Consistencia Eventual**.

---

## 🏗️ Arquitectura

### Patrón Saga
Orquestación de transacciones distribuidas con compensación automática:
1. **Debitar** → Retiro del emisor
2. **Acreditar** → Depósito al receptor  
3. **Compensación** → Reversión automática en caso de fallo

### Microservicios

```
┌─────────────────┐         ┌─────────────────┐
│ Accounts Service│◄────────┤Processor Service│
│   (Port 3000)   │         │   (Port 3001)   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
  ┌─────────────┐           ┌─────────────┐
  │ accounts_db │           │processor_db │
  │  (Port 5432)│           │ (Port 5433) │
  └─────────────┘           └─────────────┘
```

---

## 🚀 Quick Start

### Requisitos
- Java JDK 21+
- Docker Desktop
- Puertos 3000, 3001, 5432, 5433 disponibles

### Ejecución

```bash
# 1. Iniciar bases de datos
docker-compose up -d

# 2. Terminal 1 - Accounts Service
./gradlew run

# 3. Terminal 2 - Processor Service  
./gradlew runProcessor

# 4. Verificar servicios
curl http://localhost:3000/health
curl http://localhost:3001/health
```

---

## 📡 API Endpoints

### Accounts Service (Port 3000)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | No |
| GET | `/accounts/{id}` | Consultar saldo | API Key |
| POST | `/api/recharge` | Recargar saldo | No |
| POST | `/accounts/update-balance` | Actualizar balance (interno) | No |

**API Key:** `X-API-KEY: IBM-HACKATHON-2026`

### Processor Service (Port 3001)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/transfer` | Transferencia P2P |
| GET | `/api/transactions/{userId}` | Historial de transacciones |

---

## 🧪 Pruebas

### Usando test.http
Abre `test.http` en VS Code con la extensión REST Client.

### Usando cURL

```bash
# Consultar saldo
curl http://localhost:3000/accounts/1 \
  -H "X-API-KEY: IBM-HACKATHON-2026"

# Transferencia exitosa
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":100}'

# Historial de transacciones
curl http://localhost:3001/api/transactions/1
```

### Usando PowerShell

```powershell
# Consultar saldo
Invoke-RestMethod -Uri "http://localhost:3000/accounts/1" `
  -Headers @{"X-API-KEY"="IBM-HACKATHON-2026"}

# Transferencia
Invoke-RestMethod -Uri "http://localhost:3001/api/transfer" `
  -Method Post -ContentType "application/json" `
  -Body '{"senderId":1,"receiverId":2,"amount":100}'

# Historial
Invoke-RestMethod -Uri "http://localhost:3001/api/transactions/1"
```

---

## 📊 Estados de Transacción

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Transacción iniciada |
| `DEBITED` | Dinero debitado del emisor |
| `COMPLETED` | Transferencia completada ✅ |
| `FAILED` | Falló antes de debitar ❌ |
| `ROLLED_BACK` | Compensación ejecutada 🔄 |

---

## 🎯 Funcionalidades

### Core
- ✅ Consultar saldo de usuario
- ✅ Recargar saldo (simulado)
- ✅ Transferencias P2P con validaciones
- ✅ Patrón Saga con compensación automática

### BONUS Implementados
- ⭐ Historial de transacciones por usuario
- ⭐ Health checks en ambos servicios
- ⭐ Documentación OpenAPI 3.0
- ⭐ Logs estructurados (Logback)

---

## 🛡️ Validaciones de Negocio

- ❌ No permite auto-transferencias
- ❌ No permite montos negativos o cero
- ❌ Verifica fondos suficientes antes de debitar
- ❌ Valida existencia de usuarios
- ✅ Garantiza que no se pierde dinero bajo ninguna circunstancia

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| `README.md` | Este archivo |
| `openapi-spec.yaml` | Especificación OpenAPI 3.0 |
| `CasosPrueba_NeoWallet_CORRECTO.md` | 15 casos de prueba documentados |
| `test.http` | Casos de prueba ejecutables |

---

## 🗄️ Base de Datos

### accounts_db (Port 5432)
```sql
users (id, name, email, balance, created_at, updated_at)
```

### processor_db (Port 5433)
```sql
transactions (id, sender_id, receiver_id, amount, status, 
              error_message, created_at, updated_at)
```

### Datos Iniciales
- Usuario 1: $1000.00 (Rico)
- Usuario 2: $50.00 (Pobre)
- Usuario 3: $0.00 (Nuevo)

---

## 🔧 Stack Tecnológico

- **Lenguaje:** Kotlin 1.9.23
- **Framework:** Ktor 2.3.11
- **Base de Datos:** PostgreSQL 15
- **ORM:** Exposed
- **Contenedores:** Docker Compose
- **Logs:** Logback
- **Build:** Gradle 9.3.0

---

## 🛑 Detener Servicios

```bash
# Detener bases de datos
docker-compose down

# Detener servicios Kotlin
# Presiona Ctrl+C en cada terminal
```

---

## 📝 Ejemplos de Uso

### Caso 1: Transferencia Exitosa
```json
POST /api/transfer
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100
}

Response: 200 OK
{
  "message": "Transferencia exitosa",
  "transactionId": 1
}
```

### Caso 2: Fondos Insuficientes
```json
POST /api/transfer
{
  "senderId": 2,
  "receiverId": 1,
  "amount": 5000
}

Response: 400 Bad Request
{
  "error": "Falló el débito. Fondos insuficientes."
}
```

### Caso 3: Compensación (Rollback)
```json
POST /api/transfer
{
  "senderId": 1,
  "receiverId": 999,  // Usuario no existe
  "amount": 100
}

Response: 500 Internal Server Error
{
  "error": "Error con el destinatario. Se devolvió tu dinero."
}

// El dinero se devuelve automáticamente al emisor
// Estado de transacción: ROLLED_BACK
```

---

## 🎓 Conceptos Implementados

- **Microservicios:** Servicios independientes con bases de datos separadas
- **Patrón Saga:** Transacciones distribuidas con compensación
- **Consistencia Eventual:** Garantía de integridad de datos
- **API REST:** Comunicación HTTP entre servicios
- **Health Checks:** Monitoreo de disponibilidad
- **Logs Estructurados:** Trazabilidad completa

---

## 📞 Soporte

Para más información, consulta:
- `openapi-spec.yaml` - Especificación completa de APIs
- `CasosPrueba_NeoWallet_CORRECTO.md` - Casos de prueba detallados
- `test.http` - Ejemplos ejecutables

---

**Versión:** 1.0.0  
**Estado:** ✅ Producción Ready  
**Última actualización:** Junio 2026
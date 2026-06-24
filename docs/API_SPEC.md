# 📡 Especificación de API - NeoWallet

Documentación completa de los endpoints disponibles en el sistema NeoWallet.

---

## 🏗️ Arquitectura

El sistema consta de dos microservicios independientes:

- **Accounts Service** (Puerto 3000): Gestión de usuarios y saldos
- **Processor Service** (Puerto 3001): Procesamiento de transferencias P2P

---

## 📍 Accounts Service (Port 3000)

Base URL: `http://localhost:3000`

### 1. Health Check

**Endpoint:** `GET /health`

**Descripción:** Verifica el estado del servicio y la conexión a la base de datos.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "service": "accounts-service",
  "status": "healthy",
  "timestamp": "2026-06-23T10:00:00.000Z",
  "uptime": 123.45,
  "database": "connected"
}
```

---

### 2. Obtener Usuario por ID

**Endpoint:** `GET /accounts/{user_id}`

**Descripción:** Consulta la información y saldo de un usuario específico.

**Parámetros:**
- `user_id` (path, required): ID numérico del usuario

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Usuario A (Rico)",
    "email": "usuario.a@neowallet.com",
    "balance": 1000.00,
    "created_at": "2026-06-23T10:00:00.000Z",
    "updated_at": "2026-06-23T10:00:00.000Z"
  }
}
```

**Errores:**
- `400`: ID inválido (no numérico)
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

---

### 3. Listar Todos los Usuarios

**Endpoint:** `GET /accounts`

**Descripción:** Obtiene la lista completa de usuarios (para debugging).

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "Usuario A (Rico)",
      "email": "usuario.a@neowallet.com",
      "balance": 1000.00,
      "created_at": "...",
      "updated_at": "..."
    },
    ...
  ]
}
```

---

### 4. Recargar Saldo

**Endpoint:** `POST /api/recharge`

**Descripción:** Recarga saldo en la cuenta de un usuario (simulado, sin procesador real).

**Body (JSON):**
```json
{
  "user_id": 1,
  "amount": 100.00,
  "payment_method": "credit_card"
}
```

**Campos:**
- `user_id` (integer, required): ID del usuario
- `amount` (float, required): Monto a recargar (positivo, máx 2 decimales)
- `payment_method` (string, required): Método de pago (ej: "credit_card", "bank_transfer")

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Recarga exitosa",
  "data": {
    "user_id": 1,
    "amount": 100.00,
    "payment_method": "credit_card",
    "balance_before": 1000.00,
    "balance_after": 1100.00,
    "timestamp": "2026-06-23T10:00:00.000Z"
  }
}
```

**Errores:**
- `400`: Validación fallida (monto negativo, cero, más de 2 decimales)
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

---

### 5. Actualizar Balance (Interno)

**Endpoint:** `POST /accounts/update-balance`

**Descripción:** Actualiza el balance de un usuario (débito o crédito). Este endpoint es interno y usado por el Processor Service.

**Body (JSON):**
```json
{
  "user_id": 1,
  "amount": 50.00,
  "operation": "debit"
}
```

**Campos:**
- `user_id` (integer, required): ID del usuario
- `amount` (float, required): Monto a modificar
- `operation` (string, required): "debit" o "credit"

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Balance debitado exitosamente",
  "data": {
    "user_id": 1,
    "operation": "debit",
    "amount": 50.00,
    "balance_before": 1000.00,
    "balance_after": 950.00,
    "timestamp": "2026-06-23T10:00:00.000Z"
  }
}
```

**Errores:**
- `400`: Validación fallida o fondos insuficientes (en débitos)
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

---

## 📍 Processor Service (Port 3001)

Base URL: `http://localhost:3001`

### 1. Health Check

**Endpoint:** `GET /health`

**Descripción:** Verifica el estado del servicio, la base de datos y la conectividad con Accounts Service.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "service": "processor-service",
  "status": "healthy",
  "timestamp": "2026-06-23T10:00:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "accounts_service": "connected"
}
```

---

### 2. Transferencia P2P

**Endpoint:** `POST /api/transfer`

**Descripción:** Ejecuta una transferencia peer-to-peer entre dos usuarios. Implementa el patrón Saga para consistencia distribuida.

**Body (JSON):**
```json
{
  "sender_id": 1,
  "receiver_id": 2,
  "amount": 50.00
}
```

**Campos:**
- `sender_id` (integer, required): ID del usuario que envía
- `receiver_id` (integer, required): ID del usuario que recibe
- `amount` (float, required): Monto a transferir (positivo, máx 2 decimales)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Transferencia completada exitosamente",
  "data": {
    "transaction_id": 1,
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 50.00,
    "status": "COMPLETED",
    "timestamp": "2026-06-23T10:00:00.000Z"
  }
}
```

**Validaciones:**
- ✅ `sender_id != receiver_id` (no auto-transferencias)
- ✅ `amount > 0` (monto positivo)
- ✅ Máximo 2 decimales
- ✅ Sender y receiver deben existir
- ✅ Sender debe tener fondos suficientes

**Errores:**
- `400`: Validación fallida
  - `SELF_TRANSFER_NOT_ALLOWED`: Intento de auto-transferencia
  - `INVALID_AMOUNT`: Monto inválido
  - `INSUFFICIENT_FUNDS`: Fondos insuficientes
  - `INVALID_DECIMAL_PRECISION`: Más de 2 decimales
- `404`: Usuario no encontrado (`USER_NOT_FOUND`)
- `500`: Error en el procesamiento
  - `TRANSFER_ROLLED_BACK`: Transferencia revertida
  - `CRITICAL_COMPENSATION_FAILED`: Fallo crítico en compensación

---

### 3. Historial de Transacciones

**Endpoint:** `GET /api/transactions/{user_id}`

**Descripción:** Obtiene el historial de transacciones de un usuario (enviadas y recibidas).

**Parámetros:**
- `user_id` (path, required): ID del usuario

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "transaction_count": 2,
    "transactions": [
      {
        "transaction_id": 1,
        "type": "sent",
        "amount": 50.00,
        "counterparty_id": 2,
        "status": "COMPLETED",
        "created_at": "2026-06-23T10:00:00.000Z",
        "error_message": null
      },
      {
        "transaction_id": 2,
        "type": "received",
        "amount": 100.00,
        "counterparty_id": 3,
        "status": "COMPLETED",
        "created_at": "2026-06-23T09:00:00.000Z",
        "error_message": null
      }
    ]
  }
}
```

**Campos de transacción:**
- `transaction_id`: ID único de la transacción
- `type`: "sent" (enviada) o "received" (recibida)
- `amount`: Monto de la transacción
- `counterparty_id`: ID del otro usuario (sender o receiver)
- `status`: Estado de la transacción
- `created_at`: Fecha de creación
- `error_message`: Mensaje de error (si aplica)

**Errores:**
- `400`: ID inválido
- `404`: Usuario no encontrado
- `500`: Error interno del servidor

---

### 4. Estadísticas de Transacciones

**Endpoint:** `GET /api/statistics`

**Descripción:** Obtiene estadísticas generales del sistema (para debugging).

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "status_counts": {
      "PENDING": 0,
      "DEBITED": 0,
      "COMPLETED": 10,
      "FAILED": 2,
      "ROLLED_BACK": 1
    },
    "recent_transactions": [
      {
        "id": 10,
        "sender_id": 1,
        "receiver_id": 2,
        "amount": 50.00,
        "status": "COMPLETED",
        "created_at": "2026-06-23T10:00:00.000Z"
      },
      ...
    ]
  }
}
```

---

## 📊 Estados de Transacción

Las transacciones pasan por los siguientes estados:

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Transacción iniciada, aún no se ha debitado |
| `DEBITED` | Dinero debitado del sender, pendiente de acreditar |
| `COMPLETED` | Transacción completada exitosamente |
| `FAILED` | Transacción falló antes del débito |
| `ROLLED_BACK` | Débito revertido después de fallar el crédito |

---

## 🔒 Códigos de Error

### Errores Comunes

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Errores de validación de campos |
| `USER_NOT_FOUND` | 404 | Usuario no encontrado |
| `INVALID_USER_ID` | 400 | ID de usuario inválido |
| `INVALID_AMOUNT` | 400 | Monto inválido (negativo o cero) |
| `INVALID_DECIMAL_PRECISION` | 400 | Monto con más de 2 decimales |
| `INSUFFICIENT_FUNDS` | 400 | Fondos insuficientes para la operación |
| `SELF_TRANSFER_NOT_ALLOWED` | 400 | Intento de auto-transferencia |
| `INTERNAL_SERVER_ERROR` | 500 | Error interno del servidor |

### Errores Específicos de Transferencias

| Código | HTTP | Descripción |
|--------|------|-------------|
| `TRANSFER_ROLLED_BACK` | 500 | Transferencia revertida por fallo |
| `CRITICAL_COMPENSATION_FAILED` | 500 | Fallo crítico en compensación |
| `TRANSFER_PROCESSING_ERROR` | 500 | Error genérico en procesamiento |

---

## 🎯 Flujo del Patrón Saga

### Transferencia Exitosa
```
1. CREATE TRANSACTION (status: PENDING)
2. DEBIT SENDER (status: DEBITED)
3. CREDIT RECEIVER (status: COMPLETED)
   ✅ Success
```

### Transferencia con Rollback
```
1. CREATE TRANSACTION (status: PENDING)
2. DEBIT SENDER (status: DEBITED)
3. CREDIT RECEIVER ❌ FAILS
4. COMPENSATE: CREDIT SENDER (revert debit)
5. UPDATE STATUS (status: ROLLED_BACK)
```

---

## 📝 Notas Importantes

1. **Consistencia de Datos**: El sistema garantiza que no se pierde dinero bajo ninguna circunstancia gracias al patrón Saga.

2. **Idempotencia**: Las operaciones no son idempotentes por diseño. Ejecutar la misma transferencia dos veces resultará en dos transacciones.

3. **Timeouts**: Las peticiones HTTP entre servicios tienen un timeout de 5 segundos.

4. **Precisión Decimal**: Todos los montos se manejan con precisión de 2 decimales.

5. **Validaciones**: Las validaciones se realizan tanto a nivel de endpoint como a nivel de servicio para mayor robustez.

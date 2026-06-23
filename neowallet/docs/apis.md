# Especificación de APIs — NeoWallet

**Swagger UI:**
- Accounts Service: http://localhost:3000/swagger-ui.html
- Processor Service: http://localhost:3001/swagger-ui.html

---

## Autenticación

Todos los endpoints (excepto `/auth/token` y `/actuator/*`) requieren:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Accounts Service — Puerto 3000

### POST /auth/token
Obtener JWT token.

**Request:**
```json
{ "email": "usuario.a@neowallet.com", "password": "password123" }
```
**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "userId": 1,
  "email": "usuario.a@neowallet.com"
}
```
**Errores:** 401 credenciales inválidas

---

### GET /accounts/{userId}
Consultar saldo (RF-001).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": 1,
  "name": "Usuario A (Rico)",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00,
  "createdAt": "2026-06-23T10:00:00"
}
```
**Errores:** 401 sin auth | 404 usuario no encontrado | 400 ID inválido

---

### POST /api/recharge
Recargar saldo (RF-002).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "userId": 1,
  "amount": 200.00,
  "paymentMethod": "CREDIT_CARD"
}
```
**Response 200:**
```json
{
  "userId": 1,
  "newBalance": 1200.00,
  "message": "Recarga exitosa",
  "timestamp": "2026-06-23T10:05:00"
}
```
**Errores:** 400 monto ≤ 0 | 400 monto > 50000 | 404 usuario no encontrado

---

### POST /accounts/update-balance
Actualizar balance interno (RF-004). **Solo para Processor Service.**

**Headers:** `X-Internal-Api-Key: internal-neowallet-key-2026`

**Request:**
```json
{
  "userId": 1,
  "amount": 100.00,
  "operation": "debit"
}
```
**Response 200:**
```json
{
  "userId": 1,
  "previousBalance": 1000.00,
  "newBalance": 900.00,
  "operation": "debit",
  "status": "SUCCESS"
}
```
**Errores:** 400 fondos insuficientes | 403 API key inválida | 404 usuario no encontrado

---

## Processor Service — Puerto 3001

### POST /api/transfer
Transferencia P2P (RF-003).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00
}
```
**Response 200:**
```json
{
  "transactionId": 42,
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00,
  "status": "COMPLETED",
  "message": "Transferencia completada exitosamente",
  "timestamp": "2026-06-23T10:10:00"
}
```
**Errores:**

| HTTP | Error Code | Descripción |
|------|------------|-------------|
| 400  | self_transfer_not_allowed | sender == receiver |
| 400  | invalid_amount | monto ≤ 0 |
| 400  | insufficient_funds | saldo insuficiente |
| 404  | user_not_found | sender o receiver no existen |
| 503  | accounts_service_error | fallo de comunicación |

---

### GET /api/transactions/{userId}
Historial de transacciones (RF-005 Bonus).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
[
  {
    "id": 42,
    "senderId": 1,
    "receiverId": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "type": "SENT",
    "createdAt": "2026-06-23T10:10:00"
  }
]
```

---

## Estados de Transacción

| Estado | Descripción |
|--------|-------------|
| PENDING | Transacción iniciada |
| DEBITED | Sender debitado, crédito pendiente |
| COMPLETED | Exitosa |
| FAILED | Falló antes del débito |
| ROLLED_BACK | Débito revertido por compensación |

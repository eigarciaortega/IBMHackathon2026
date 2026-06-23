# Contrato de API — NeoWallet

## accounts-service (puerto 3000)

### `GET /health`
Health check.

**Respuesta:** `200`
```json
{ "status": "ok", "servicio": "accounts-service" }
```

---

### `GET /accounts/{user_id}`
Consultar datos y saldo de un usuario.

**Parámetros:** `user_id` (path, int, requerido)

**Respuesta 200:**
```json
{
  "id": 1,
  "name": "Usuario A (Rico)",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Errores:**
| Código | `error` | Significado |
|--------|---------|-------------|
| 400 | `bad_request` | `user_id` no es numérico |
| 404 | `user_not_found` | El usuario no existe |

---

### `POST /api/recharge`
Recargar saldo (simulada, entrada de dinero externo).

**Body:**
```json
{
  "user_id": 1,
  "amount": 200.50,
  "payment_method": "simulada"
}
```

**Respuesta 200:**
```json
{ "new_balance": 1200.50 }
```

**Errores:**
| Código | `error` | Significado |
|--------|---------|-------------|
| 400 | `invalid_amount` | Monto ≤0, no numérico o más de 2 decimales |
| 404 | `user_not_found` | El usuario no existe |

---

### `POST /accounts/update-balance` (INTERNO)
Actualizar saldo con débito o crédito atómico e idempotente. **Requiere header `X-Internal-Key`.**

**Headers:**
- `Content-Type: application/json`
- `X-Internal-Key: <INTERNAL_API_KEY>`

**Body:**
```json
{
  "user_id": 1,
  "amount": 50.00,
  "operation": "debit",
  "idempotency_key": "tx-uuid-123:debit"
}
```

**Respuesta 200:**
```json
{
  "previous_balance": 1000.00,
  "new_balance": 950.00
}
```

**Errores:**
| Código | `error` | Significado |
|--------|---------|-------------|
| 400 | `insufficient_funds` | Saldo insuficiente para débito |
| 400 | `invalid_amount` | Monto inválido u operación no reconocida |
| 401 | `unauthorized` | Falta `X-Internal-Key` o es inválido |
| 404 | `user_not_found` | El usuario no existe |

**Idempotencia:** Si ya existe una operación con el mismo `idempotency_key`, se devuelve el resultado previo sin volver a modificar el saldo.

---

## processor-service (puerto 3001)

### `GET /health`
Health check.

**Respuesta:** `200`
```json
{ "status": "ok", "servicio": "processor-service" }
```

---

### `POST /api/transfer`
Transferencia P2P con Saga orquestada y compensación.

**Body:**
```json
{
  "sender_id": 1,
  "receiver_id": 2,
  "amount": 100.00,
  "idempotency_key": "opcional-clave-cliente"
}
```

**Respuesta 200:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED"
}
```

**Errores:**
| Código | `error` | Significado |
|--------|---------|-------------|
| 400 | `self_transfer_not_allowed` | sender_id == receiver_id |
| 400 | `invalid_amount` | Monto ≤0, no numérico o más de 2 decimales |
| 400 | `insufficient_funds` | Remitente sin fondos suficientes |
| 404 | `user_not_found` | Remitente o destinatario no existe |
| 500 | `transfer_failed` | Fallo en crédito, compensación ejecutada (ROLLED_BACK) |

**Estados de la saga:**
| Estado | Significado |
|--------|-------------|
| `PENDING` | Transacción creada, sin movimientos |
| `DEBITED` | Débito al remitente exitoso |
| `COMPLETED` | Crédito al destinatario exitoso |
| `FAILED` | Fallo sin movimientos (validación o débito fallido) |
| `ROLLED_BACK` | Débito ejecutado, crédito falló → compensación aplicada |

---

### `GET /api/transactions/{user_id}`
Historial de transacciones donde el usuario participó.

**Respuesta 200:**
```json
[
  {
    "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "tipo": "sent",
    "counterparty": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "created_at": "2026-06-23T12:00:00Z"
  }
]
```

**Errores:**
| Código | `error` | Significado |
|--------|---------|-------------|
| 400 | `bad_request` | `user_id` no es numérico |
| 404 | `user_not_found` | El usuario no existe |

---

## Formato estándar de error

Todas las respuestas de error usan este sobre:

```json
{
  "error": "insufficient_funds",
  "mensaje": "El remitente no tiene saldo suficiente.",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Códigos de error

| Código | Categoría |
|--------|-----------|
| `self_transfer_not_allowed` | Validación |
| `invalid_amount` | Validación |
| `user_not_found` | Recurso |
| `insufficient_funds` | Negocio |
| `bad_request` | Validación |
| `unauthorized` | Seguridad |
| `internal_error` | Sistema |
| `transfer_failed` | Sistema (con compensación) |
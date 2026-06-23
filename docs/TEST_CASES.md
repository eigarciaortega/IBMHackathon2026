# Casos de Prueba — NeoWallet

> Precondiciones generales: seed data con Usuario A ($1000), Usuario B ($50), Usuario C ($0).

---

## CU-001: Transferencia exitosa (happy path)

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A tiene $1000, B tiene $50 |
| **Pasos** | 1. POST /api/transfer { sender_id: 1, receiver_id: 2, amount: 100 } |
| **Resultado esperado** | 200. A queda con $900, B con $150. transaction_id no vacío, status "COMPLETED". |

---

## CU-002: Fondos insuficientes

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | B tiene $50 |
| **Pasos** | 1. POST /api/transfer { sender_id: 2, receiver_id: 1, amount: 200 } |
| **Resultado esperado** | 400. error: "insufficient_funds". A y B mantienen sus saldos originales. |

---

## CU-003: Auto-transferencia no permitida

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A existe |
| **Pasos** | 1. POST /api/transfer { sender_id: 1, receiver_id: 1, amount: 50 } |
| **Resultado esperado** | 400. error: "self_transfer_not_allowed". |

---

## CU-004: Monto inválido (negativo o cero)

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | — |
| **Pasos** | 1. POST /api/transfer { sender_id: 1, receiver_id: 2, amount: -10 }<br>2. POST /api/transfer { sender_id: 1, receiver_id: 2, amount: 0 } |
| **Resultado esperado** | 400 en ambos casos. error: "invalid_amount". |

---

## CU-005: Usuario no encontrado (remitente)

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | No existe usuario con ID 999 |
| **Pasos** | 1. POST /api/transfer { sender_id: 999, receiver_id: 1, amount: 50 } |
| **Resultado esperado** | 404. error: "user_not_found". |

---

## CU-006: Usuario no encontrado (destinatario)

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | No existe usuario con ID 777 |
| **Pasos** | 1. POST /api/transfer { sender_id: 1, receiver_id: 777, amount: 50 } |
| **Resultado esperado** | 404. error: "user_not_found". |

---

## CU-007: Consulta de saldo exitosa

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A existe con $1000 |
| **Pasos** | 1. GET /accounts/1 |
| **Resultado esperado** | 200. balance: 1000.00, name, email correctos. |

---

## CU-008: Recarga exitosa

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | C tiene $0 |
| **Pasos** | 1. POST /api/recharge { user_id: 3, amount: 200.50, payment_method: "simulada" } |
| **Resultado esperado** | 200. new_balance: 200.50. GET /accounts/3 devuelve balance 200.50. |

---

## CU-009: Recarga con monto inválido

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A existe |
| **Pasos** | 1. POST /api/recharge { user_id: 1, amount: -50, payment_method: "simulada" } |
| **Resultado esperado** | 400. error: "invalid_amount". Saldo de A sin cambios. |

---

## CU-010: Invariante de conservación del dinero

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A=1000, B=50, C=0. Total = 1050 |
| **Pasos** | 1. Consultar saldos de A, B, C y registrar suma<br>2. Transferir A→B $100 (OK)<br>3. Transferir B→C $50 (OK)<br>4. Transferir B→A $200 (FAIL: insufficient_funds)<br>5. Transferir A→C $150 (OK)<br>6. Transferir A→B $50 (OK)<br>7. Consultar saldos de A, B, C y registrar suma |
| **Resultado esperado** | La suma total de saldos es igual antes y después (descontando recargas). Si hubo recargas en el medio, la suma aumenta exactamente en la cantidad recargada. |

---

## CU-011: Concurrencia sin oversell

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | Usuario con balance de $300 |
| **Pasos** | 1. Ejecutar 20 débitos concurrentes de $50 c/u<br>2. Verificar saldo final |
| **Resultado esperado** | Máximo 6 débitos exitosos (300/50). Saldo nunca negativo. |

---

## CU-012: Idempotencia en update-balance

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | Usuario con $300 |
| **Pasos** | 1. POST /accounts/update-balance { debit, 50, idempotency_key: "test-123" }<br>2. POST /accounts/update-balance { debit, 50, idempotency_key: "test-123" } (mismo key) |
| **Resultado esperado** | 200 en ambos. Saldo final: $250 (no $200). |

---

## CU-013: Idempotencia en transferencia

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | A=1000, B=50 |
| **Pasos** | 1. POST /api/transfer { sender_id: 1, receiver_id: 2, amount: 100, idempotency_key: "transfer-001" }<br>2. Reenviar la misma petición |
| **Resultado esperado** | 200 en ambos. El dinero solo se mueve una vez. |

---

## CU-014: update-balance sin secreto interno

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | Servicio corriendo |
| **Pasos** | 1. POST /accounts/update-balance SIN header X-Internal-Key |
| **Resultado esperado** | 401. error: "unauthorized". |

---

## CU-015: Health check de ambos servicios

| Campo | Descripción |
|-------|-------------|
| **Precondiciones** | Ambos servicios corriendo |
| **Pasos** | 1. GET /health en accounts-service (3000)<br>2. GET /health en processor-service (3001) |
| **Resultado esperado** | 200 en ambos. status: "ok". servicio: "accounts-service" / "processor-service". |
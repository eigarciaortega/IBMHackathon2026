# Casos de Uso Detallados — NeoWallet P2P Payments

---

## CU-001: Autenticación de Usuario

**Actor:** Usuario  
**Precondición:** El usuario existe en la BD con email y password  
**Flujo principal:**
1. Usuario envía `POST /auth/token` con email y password
2. Sistema valida formato del email y password
3. Sistema busca usuario por email
4. Sistema compara password con hash BCrypt
5. Sistema genera JWT con userId y email (válido 24h)
6. Sistema retorna token con metadata

**Flujos alternativos:**
- Email no existe → 401 "Credenciales inválidas"
- Password incorrecta → 401 "Credenciales inválidas"
- Email con formato inválido → 400 "Email inválido"

---

## CU-002: Consulta de Saldo (RF-001)

**Actor:** Usuario autenticado  
**Precondición:** Token JWT válido  
**Flujo principal:**
1. Usuario envía `GET /accounts/{userId}` con Bearer token
2. Sistema valida JWT
3. Sistema busca usuario por ID
4. Sistema retorna nombre, email, saldo (2 decimales), fecha creación

**Flujos alternativos:**
- Sin token → 401
- Token inválido → 401
- userId no numérico → 400 "Parámetro inválido"
- Usuario no existe → 404 "user_not_found"

---

## CU-003: Recarga de Saldo (RF-002)

**Actor:** Usuario autenticado  
**Precondición:** Token JWT válido, usuario existe, monto válido  
**Flujo principal:**
1. Usuario envía `POST /api/recharge` con userId, amount, paymentMethod
2. Sistema valida JWT
3. Sistema valida: amount > 0, amount ≤ 50000, campos no nulos
4. Sistema busca usuario por userId
5. Sistema aplica crédito al saldo (@Transactional)
6. Sistema guarda usuario con nuevo saldo
7. Sistema retorna confirmación con nuevo saldo

**Flujos alternativos:**
- amount ≤ 0 → 400 "invalid_amount"
- amount > 50000 → 400 "Monto máximo de recarga"
- userId no existe → 404 "user_not_found"

---

## CU-004: Transferencia P2P (RF-003) — Flujo Completo

**Actor:** Usuario autenticado (Sender)  
**Precondición:** JWT válido, sender y receiver existen, sender tiene fondos  

**Flujo principal (Saga):**

| Paso | Acción | Estado TX |
|------|--------|-----------|
| 1 | Validar: senderId ≠ receiverId, amount > 0 | - |
| 2 | Verificar saldo sender (GET /accounts/senderId) | - |
| 3 | Verificar receiver existe (GET /accounts/receiverId) | - |
| 4 | Crear registro en processor_db | PENDING |
| 5 | Debitar sender (POST /accounts/update-balance) | DEBITED |
| 6 | Acreditar receiver (POST /accounts/update-balance) | COMPLETED |
| 7 | Retornar transactionId + status COMPLETED | - |

**Flujos alternativos:**

| Escenario | Acción | Estado Final |
|-----------|--------|-------------|
| senderId == receiverId | Rechazar inmediatamente | - (sin TX) |
| amount ≤ 0 | Rechazar inmediatamente | - (sin TX) |
| Sender no existe | Rechazar inmediatamente | - (sin TX) |
| Saldo insuficiente | Rechazar inmediatamente | - (sin TX) |
| Receiver no existe | Rechazar inmediatamente | - (sin TX) |
| Falla el débito | Marcar FAILED | FAILED |
| Falla el crédito | Compensar: devolver dinero al sender | ROLLED_BACK |

**Garantía crítica (RN-004):**  
La suma total de dinero en el sistema SIEMPRE se conserva. El patrón Saga garantiza que si el crédito al receiver falla, el débito del sender se revierte.

---

## CU-005: Actualización de Balance Interno (RF-004)

**Actor:** Processor Service  
**Precondición:** Header `X-Internal-Api-Key` válido, usuario existe  
**Flujo principal:**
1. Processor envía `POST /accounts/update-balance` con API Key
2. Sistema valida API Key
3. Sistema adquiere lock pesimista sobre el registro del usuario
4. Si `operation = debit`: verifica saldo ≥ amount, sustrae
5. Si `operation = credit`: suma al saldo
6. Guarda con transacción @Transactional
7. Retorna saldo anterior y nuevo saldo

**Protección contra Race Conditions:**  
Se usa `@Lock(PESSIMISTIC_WRITE)` en la query JPA, evitando que dos operaciones concurrentes modifiquen el saldo simultáneamente.

---

## CU-006: Historial de Transacciones (RF-005 Bonus)

**Actor:** Usuario autenticado  
**Flujo principal:**
1. Usuario envía `GET /api/transactions/{userId}`
2. Sistema valida JWT
3. Sistema consulta transactions donde sender_id = userId OR receiver_id = userId
4. Sistema ordena por created_at DESC
5. Sistema enriquece cada TX con tipo: SENT (si fue sender) o RECEIVED (si fue receiver)
6. Retorna lista de transacciones

---

## Diagrama de Secuencia — Transferencia Exitosa

```
Client          Processor-Service         Accounts-Service         processor_db
  │                    │                         │                       │
  │─POST /transfer────►│                         │                       │
  │                    │─GET /accounts/1─────────►│                       │
  │                    │◄──{balance:1000}─────────│                       │
  │                    │─GET /accounts/2─────────►│                       │
  │                    │◄──{balance:50}───────────│                       │
  │                    │─INSERT TX PENDING────────────────────────────────►│
  │                    │─POST update-balance─────►│                       │
  │                    │  {debit, sender=1}        │                       │
  │                    │◄──{prev:1000,new:900}─────│                       │
  │                    │─UPDATE TX DEBITED────────────────────────────────►│
  │                    │─POST update-balance─────►│                       │
  │                    │  {credit, receiver=2}     │                       │
  │                    │◄──{prev:50,new:150}───────│                       │
  │                    │─UPDATE TX COMPLETED──────────────────────────────►│
  │◄──{txId, COMPLETED}│                         │                       │
```

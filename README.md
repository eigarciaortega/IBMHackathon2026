# NeoWallet — Billetera Digital P2P

MVP de billetera digital con transferencias P2P instantáneas. Dos microservicios Spring Boot 4.1 comunicados por HTTP/REST, orquestados con Docker Compose, y un frontend Angular 22 + Tailwind CSS.

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Inicio rápido](#inicio-rápido)
3. [Frontend](#frontend)
4. [Referencia de API](#referencia-de-api)
5. [Casos de prueba](#casos-de-prueba)
6. [Tests unitarios](#tests-unitarios)
7. [Notas técnicas](#notas-técnicas)

---

## Arquitectura

```
Cliente (Browser / Postman)
    │
    ├── GET/POST :3000 ──► accountService  ──► accounts_db  (PostgreSQL)
    │                            ▲
    └── POST     :3001 ──► processorService ──► processor_db (PostgreSQL)
                          (Saga orchestrator)
```

### Microservicios

| Servicio | Puerto | Responsabilidad |
|----------|--------|-----------------|
| `accountService` | 3000 | Gestión de usuarios y saldos |
| `processorService` | 3001 | Transferencias P2P (patrón Saga) |

### Stack

- **Backend**: Spring Boot 4.1.0 · Java 21 · Spring Data JPA · PostgreSQL 16
- **Frontend**: Angular 22 · Tailwind CSS v4 · Lucide Icons
- **Infraestructura**: Docker Compose

---

## Inicio rápido

### Prerrequisitos

- Docker Desktop o Docker Engine + Compose v2
- Node.js 20+ y pnpm (solo para el frontend)

### Levantar los servicios con Docker

```bash
# Primera vez — construye las imágenes
docker compose up --build -d

# Inicios posteriores
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Detener (datos persisten en volúmenes)
docker compose down

# Detener y borrar datos (reinicia saldos)
docker compose down -v
```

> **Nota**: Los puertos 5432 y 5433 del host pueden estar ocupados por otras instancias de PostgreSQL. El `docker-compose.yml` incluido usa 5435 y 5436 para evitar conflictos.

### Verificar que los servicios están activos

```bash
curl http://localhost:3000/accounts   # debe devolver los 3 usuarios seed
curl http://localhost:3001/api/transactions/<uuid>  # historial vacío al inicio
```

---

## Frontend

```bash
cd neoWallet
pnpm install      # solo la primera vez
pnpm start        # inicia en http://localhost:4200
```

El dev server incluye un proxy que enruta las llamadas al backend:

| Ruta Angular | Destino |
|---|---|
| `/accounts/*` | `accountService :3000` |
| `/api/recharge` | `accountService :3000` |
| `/api/transfer` | `processorService :3001` |
| `/api/transactions/*` | `processorService :3001` |

### Funcionalidades

- **Selector de sesión** — alterna entre los 3 usuarios seed sin login real
- **Tarjeta de saldo** — muestra balance, titular e ID de cuenta
- **Transferir** — selecciona destinatario, ingresa monto, confirma
- **Recargar** — ingresa monto con chips rápidos (+$10/25/50/100), elige método de pago
- **Historial** — lista de transacciones con tipo (enviado/recibido), monto y estado

---

## Referencia de API

### accountService — puerto 3000

#### `GET /accounts`
Lista todos los usuarios. Útil para obtener los UUIDs de los usuarios seed.

**Response 200**
```json
[
  {
    "id": "0af865ce-cb30-4021-8a51-692b7de84cd1",
    "name": "Usuario A (Rico)",
    "email": "usuario.a@neowallet.com",
    "balance": 1000.00,
    "created_at": null
  }
]
```

---

#### `GET /accounts/{publicId}`
Obtiene un usuario por su UUID público.

**Response 200**
```json
{
  "id": "0af865ce-cb30-4021-8a51-692b7de84cd1",
  "name": "Usuario A (Rico)",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00,
  "created_at": null
}
```

**Response 404**
```json
{ "error": "user_not_found", "message": "User not found: <uuid>", "status": 404 }
```

---

#### `POST /api/recharge`
Añade fondos al saldo de un usuario.

**Request**
```json
{ "user_id": "<uuid>", "amount": 100.00, "payment_method": "Tarjeta de crédito" }
```

**Response 200**
```json
{ "user_id": "<uuid>", "new_balance": 1100.00, "message": "Recharge successful" }
```

**Errores**
| Código | `error` | Causa |
|--------|---------|-------|
| 400 | `validation_error` | `amount` nulo o ≤ 0 |
| 404 | `user_not_found` | UUID no existe |

---

#### `POST /accounts/update-balance` *(interno)*
Usado exclusivamente por `processorService`. Acepta `operation: "debit" | "credit"`.

---

### processorService — puerto 3001

#### `POST /api/transfer`
Inicia una transferencia P2P mediante el patrón Saga.

**Request**
```json
{ "sender_id": "<uuid>", "receiver_id": "<uuid>", "amount": 200.00 }
```

**Response 200**
```json
{
  "transaction_id": "5243c16a-3103-4d2d-ba61-397149c7209d",
  "sender_id": "<uuid>",
  "receiver_id": "<uuid>",
  "amount": 200.00,
  "status": "COMPLETED",
  "message": "Transfer successful"
}
```

**Errores**
| Código | `error` | Causa |
|--------|---------|-------|
| 400 | `insufficient_funds` | Saldo del sender menor al monto |
| 400 | `self_transfer_not_allowed` | `sender_id` == `receiver_id` |
| 404 | `user_not_found` | UUID de sender o receiver no existe |
| 500 | `transfer_failed` | Fallo en crédito al receiver (fondos devueltos) |

---

#### `GET /api/transactions/{userId}`
Historial de transacciones de un usuario (enviadas y recibidas), ordenado por fecha descendente.

**Response 200**
```json
[
  {
    "id": "5243c16a-3103-4d2d-ba61-397149c7209d",
    "type": "sent",
    "counterparty_id": "<uuid-receiver>",
    "amount": 200.00,
    "status": "COMPLETED",
    "created_at": "2026-06-23T20:05:15.997307"
  }
]
```

**Estados de transacción**

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Transacción creada, aún no procesada |
| `DEBITED` | Débito al sender completado |
| `COMPLETED` | Crédito al receiver completado — exitosa |
| `FAILED` | Falló el débito (sender no afectado) |
| `ROLLED_BACK` | Crédito falló, débito revertido — fondos devueltos |

---

## Casos de prueba

> Los UUIDs cambian cada vez que se reinicia con `docker compose down -v`. Obtén los actuales con:
>
> ```bash
> curl http://localhost:3000/accounts
> ```
>
> En los ejemplos siguientes se usan estas variables:
> ```bash
> UUID_A="<id de Usuario A (Rico)>"
> UUID_B="<id de Usuario B (Pobre)>"
> UUID_C="<id de Usuario C (Nuevo)>"
> ```
>
> O asígnalas automáticamente:
> ```bash
> UUID_A=$(curl -s http://localhost:3000/accounts | python3 -c "import sys,json;[print(u['id']) for u in json.load(sys.stdin) if 'Rico' in u['name']]")
> UUID_B=$(curl -s http://localhost:3000/accounts | python3 -c "import sys,json;[print(u['id']) for u in json.load(sys.stdin) if 'Pobre' in u['name']]")
> UUID_C=$(curl -s http://localhost:3000/accounts | python3 -c "import sys,json;[print(u['id']) for u in json.load(sys.stdin) if 'Nuevo' in u['name']]")
> ```

---

### TC-01 — Transferencia exitosa

**Objetivo**: Transferir $200 de Usuario A (saldo $1000) a Usuario B (saldo $50).

```bash
curl -s -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d "{\"sender_id\":\"$UUID_A\",\"receiver_id\":\"$UUID_B\",\"amount\":200}"
```

**Resultado esperado** — HTTP 200
```json
{
  "transaction_id": "...",
  "sender_id": "...",
  "receiver_id": "...",
  "amount": 200.0,
  "status": "COMPLETED",
  "message": "Transfer successful"
}
```

**Verificación de saldos**
```bash
curl -s http://localhost:3000/accounts/$UUID_A | python3 -c "import sys,json; u=json.load(sys.stdin); print(f'A: ${u[\"balance\"]}')"
curl -s http://localhost:3000/accounts/$UUID_B | python3 -c "import sys,json; u=json.load(sys.stdin); print(f'B: ${u[\"balance\"]}')"
# A: $800.00  ·  B: $250.00
```

---

### TC-02 — Fondos insuficientes

**Objetivo**: Intentar transferir $50 desde Usuario C (saldo $0).

```bash
curl -s -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d "{\"sender_id\":\"$UUID_C\",\"receiver_id\":\"$UUID_A\",\"amount\":50}"
```

**Resultado esperado** — HTTP 400
```json
{
  "error": "insufficient_funds",
  "message": "Insufficient funds: available=0.00, required=50.00",
  "status": 400
}
```

*El saldo de Usuario C permanece en $0. No se crea ninguna transacción.*

---

### TC-03 — Auto-transferencia rechazada

**Objetivo**: Verificar que no se puede transferir a uno mismo.

```bash
curl -s -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d "{\"sender_id\":\"$UUID_A\",\"receiver_id\":\"$UUID_A\",\"amount\":100}"
```

**Resultado esperado** — HTTP 400
```json
{
  "error": "self_transfer_not_allowed",
  "message": "Sender and receiver must be different users",
  "status": 400
}
```

---

### TC-04 — Recarga de saldo

**Objetivo**: Añadir $100 al saldo de Usuario C.

```bash
curl -s -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$UUID_C\",\"amount\":100,\"payment_method\":\"Tarjeta de crédito\"}"
```

**Resultado esperado** — HTTP 200
```json
{
  "user_id": "...",
  "new_balance": 100.0,
  "message": "Recharge successful"
}
```

---

### TC-05 — Historial de transacciones

**Objetivo**: Ver el historial de Usuario A después de haber realizado transferencias.

```bash
curl -s http://localhost:3001/api/transactions/$UUID_A | python3 -m json.tool
```

**Resultado esperado** — HTTP 200, lista con una entrada por cada operación
```json
[
  {
    "id": "...",
    "type": "sent",
    "counterparty_id": "...",
    "amount": 200.0,
    "status": "COMPLETED",
    "created_at": "2026-06-23T20:05:15.997307"
  }
]
```

El campo `type` es `"sent"` cuando Usuario A envió dinero y `"received"` cuando lo recibió.

---

### TC-06 — Usuario no encontrado

**Objetivo**: Consultar un UUID que no existe.

```bash
curl -s http://localhost:3000/accounts/00000000-0000-0000-0000-000000000000
```

**Resultado esperado** — HTTP 404
```json
{
  "error": "user_not_found",
  "message": "User not found: 00000000-0000-0000-0000-000000000000",
  "status": 404
}
```

---

### TC-07 — Validación de monto inválido

**Objetivo**: Intentar recargar con monto cero.

```bash
curl -s -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$UUID_A\",\"amount\":0}"
```

**Resultado esperado** — HTTP 400
```json
{
  "error": "validation_error",
  "message": "amount: must be greater than 0",
  "status": 400
}
```

---

### TC-08 — Transferencias concurrentes (prueba de integridad)

**Objetivo**: Verificar que el pessimistic lock evita saldos negativos bajo carga concurrente. Envía 10 transferencias de $100 simultáneas desde Usuario A (saldo $800 tras TC-01).

```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:3001/api/transfer \
    -H "Content-Type: application/json" \
    -d "{\"sender_id\":\"$UUID_A\",\"receiver_id\":\"$UUID_B\",\"amount\":100}" &
done
wait

# Verificar saldo — nunca debe quedar negativo
curl -s http://localhost:3000/accounts/$UUID_A | python3 -c "import sys,json; u=json.load(sys.stdin); print(f'Saldo A: \${u[\"balance\"]}')"
```

**Resultado esperado**: Las primeras 8 transferencias se completan (`COMPLETED`), las 2 restantes fallan con `insufficient_funds`. El saldo de A nunca baja de $0.

---

## Tests unitarios

### Spring Boot

```bash
# accountService
cd accountService && ./mvnw test

# processorService
cd processorService && ./mvnw test
```

Los tests usan H2 en memoria (`src/test/resources/application.properties`) para no requerir PostgreSQL. `@SpringBootTest` carga el contexto completo y verifica que todos los beans se inicialicen correctamente.

### Angular

```bash
cd neoWallet && pnpm test
```

El `WalletService` se mockea con `of([])` para aislar el componente de llamadas HTTP reales. Los tests verifican creación del componente y que el `<h1>` renderice `Mi billetera`.

---

## Notas técnicas

### Patrón Saga (transferencias)

`TransferService.transfer()` no es `@Transactional`. Cada `save()` hace commit inmediato para que el estado de la transacción persista ante fallos del proceso:

```
PENDING → (debit) → DEBITED → (credit) → COMPLETED
                                  │
                           falla credit
                                  ↓
                      (compensación: credit sender)
                                  ↓
                           ROLLED_BACK
```

Si la compensación también falla, el estado queda en `FAILED` y se registra un log `CRITICAL` para intervención manual.

### Concurrencia — Pessimistic Lock

`AccountService.updateBalance()` usa `PESSIMISTIC_WRITE` al leer la fila del usuario, serializando débitos concurrentes sobre la misma cuenta. La restricción `CHECK (balance >= 0)` a nivel de BD actúa como red de seguridad final.

### Dual-ID Strategy

Cada entidad tiene dos identificadores:
- `id` (Long) — clave primaria interna, nunca expuesta en la API
- `publicId` (UUID) — único identificador externo, aceptado en todas las rutas y cuerpos de request

Esto previene ataques de enumeración: un atacante que pruebe `id=1,2,3,...` no obtiene resultados porque la API solo acepta UUIDs.

### Seed data

Al iniciar con volúmenes vacíos, `data.sql` inserta tres usuarios de prueba con `gen_random_uuid()`:

| Usuario | Email | Saldo inicial |
|---------|-------|---------------|
| Usuario A (Rico) | usuario.a@neowallet.com | $1,000.00 |
| Usuario B (Pobre) | usuario.b@neowallet.com | $50.00 |
| Usuario C (Nuevo) | usuario.c@neowallet.com | $0.00 |

> Los UUIDs se regeneran cada vez que se destruyen los volúmenes (`docker compose down -v`).

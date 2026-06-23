# Demo Guide - NeoWallet P2P Payments

## 1. Levantar el proyecto

Desde la raiz del proyecto:

```bash
docker compose down -v
docker compose up --build
```

## 2. URLs

- Accounts Swagger: `http://localhost:3000/api-docs`
- Processor Swagger: `http://localhost:3001/api-docs`
- Accounts health: `http://localhost:3000/health`
- Processor health: `http://localhost:3001/health`

## 3. Flujo principal

1. Consultar Usuario A:

```bash
curl http://localhost:3000/accounts/1
```

2. Consultar Usuario B:

```bash
curl http://localhost:3000/accounts/2
```

3. Transferir `100.00` de A a B:

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":100.00}"
```

4. Verificar saldos:

```bash
curl http://localhost:3000/accounts/1
curl http://localhost:3000/accounts/2
```

5. Consultar historial:

```bash
curl http://localhost:3001/api/transactions/1
```

## 4. Flujo de bonus

### Idempotencia

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: demo-idem-001" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":25.00}"

curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: demo-idem-001" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":25.00}"
```

Mostrar que el segundo intento devuelve `idempotent_replay: true` y no mueve dinero dos veces.

### Fallo simulado y rollback

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Credit-Failure: true" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":10.00}"
```

Mostrar que la transaccion queda `ROLLED_BACK`.

### Auditoria

```bash
curl http://localhost:3001/api/audit/money-conservation
```

Debe responder `CONSISTENT`.

### Reconciliacion

```bash
curl http://localhost:3001/api/audit/reconciliation
```

Mostrar conteos por estado y `OK` o `WARNING`.

## 5. Frases para explicar

- "La regla critica es no perder dinero."
- "Processor no toca directamente accounts_db; se comunica con accounts-service."
- "Idempotencia evita doble procesamiento por reintentos."
- "Saga compensa cuando falla el credito despues del debito."
- "La auditoria verifica que la suma total de dinero se conserve."


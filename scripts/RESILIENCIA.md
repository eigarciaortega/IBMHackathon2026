# 🛡️ Demostración de Resiliencia (Saga + Reconciliación)

Comprueba, en vivo, que **NUNCA se pierde dinero** aunque la Saga se interrumpa
a mitad. Requiere el stack arriba (`docker compose up`). Los endpoints
administrativos/internos exigen la cabecera `x-internal-key`.

```bash
KEY=neowallet-internal-key-change-me
```

## Reconciliación de una transacción "atascada"

Simulamos un crash entre el débito y el crédito: inyectamos una transacción
`DEBITED` en `processor_db` y su débito en el libro mayor de `accounts_db`, sin
el crédito al receiver. El job de reconciliación debe **devolver el dinero al
sender** (estado `ROLLED_BACK`).

### Paso A — Saldo inicial del sender (Usuario A, id=1)

```bash
curl -s http://localhost:3000/accounts/1 -H "x-internal-key: $KEY" | jq '{name, balance}'
```

### Paso B — Inyectar el "crash" (débito sin crédito)

```bash
docker exec neowallet-accounts-db psql -U neowallet -d accounts_db -c "
  WITH u AS (SELECT balance FROM users WHERE id=1)
  INSERT INTO balance_ledger (user_id,operation,amount,balance_before,balance_after,reference)
  SELECT 1,'debit',80,(SELECT balance FROM u),(SELECT balance FROM u)-80,'transfer:9999';
  UPDATE users SET balance=balance-80 WHERE id=1;"

docker exec neowallet-processor-db psql -U neowallet -d processor_db -c "
  INSERT INTO transactions (id,sender_id,receiver_id,amount,status,updated_at)
  VALUES (9999,1,2,80,'DEBITED', now() - interval '5 minutes')
  ON CONFLICT (id) DO UPDATE SET status='DEBITED', updated_at=now()-interval '5 minutes';"
```

### Paso C — Ejecutar la reconciliación (clave interna)

```bash
curl -s -X POST http://localhost:3001/api/admin/reconcile -H "x-internal-key: $KEY" | jq
# Esperado: { "checked": 1, "results": [ { "txId": 9999, "action": "compensated" } ] }
```

> El job también corre solo cada `RECONCILE_INTERVAL_MS` (15s), así que si
> esperas, se resuelve sin tocar nada.

### Paso D — Verificar que el dinero volvió

```bash
curl -s http://localhost:3000/accounts/1 -H "x-internal-key: $KEY" | jq '{name, balance}'   # saldo restaurado
docker exec neowallet-processor-db psql -U neowallet -d processor_db -c \
  "SELECT id,status,error_message FROM transactions WHERE id=9999;"                          # ROLLED_BACK
```

La reconciliación consultó el libro mayor (`transfer:9999` con débito pero sin
crédito), aplicó la **compensación** (`compensation:9999`) y cerró la
transacción como `ROLLED_BACK`. **Cero dinero perdido.**

## Conservación global

```bash
curl -s http://localhost:3000/accounts/admin/total-balance -H "x-internal-key: $KEY" | jq
```

El total solo cambia por **recargas** (entradas externas legítimas); ninguna
transferencia —exitosa, fallida o revertida— lo altera.

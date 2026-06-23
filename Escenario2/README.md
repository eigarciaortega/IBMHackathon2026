# Fintech P2P Backend — Microservicios

Backend de microservicios en **Python + FastAPI** con **PostgreSQL** (una instancia por servicio), orquestado con **Docker Compose**.

## Arquitectura

```
                    ┌──────────────────────┐
   Cliente  ──────▶ │  Processor Service   │ ──────▶ Processor DB (postgres)
                    │  (orquesta sagas)     │
                    └──────────┬───────────┘
                               │ HTTP (httpx)
                               ▼
                    ┌──────────────────────┐
                    │  Accounts Service     │ ──────▶ Accounts DB (postgres)
                    │  (saldo, ledger)      │
                    └──────────────────────┘
```

- **Accounts Service** (`:8001`): dueño de la cuenta y el saldo. Expone créditos/débitos **idempotentes** (vía `reference_id` + tabla `ledger_entries` con constraint único) y consulta de saldo/histórico de movimientos.
- **Processor Service** (`:8002`): dueño de las reglas de negocio (recargas, transferencias P2P). Implementa **patrón Saga** orquestada llamando al Accounts Service, con **compensación** automática si un paso falla, y un **job de reconciliación** en background que reintenta/resuelve transacciones que quedaron a medias (timeout o caída momentánea de un servicio).

## Por qué dos bases de datos

Cada microservicio es dueño exclusivo de su esquema/datos (database-per-service). Esto obliga a que toda comunicación entre Accounts y Processor pase por la API HTTP, nunca por SQL directo entre servicios.

## Patrón Saga (transferencia P2P)

1. Se crea la transacción en estado `PENDING`.
2. **Debitar origen** (`reference_id={tx_id}:debit`) → `DEBIT_COMPLETED`.
   - Fondos insuficientes / cuenta inexistente → `FAILED` (no se debitó nada).
   - Accounts Service inalcanzable → se deja en `PENDING` para que la reconciliación reintente.
3. **Acreditar destino** (`reference_id={tx_id}:credit`) → `COMPLETED`.
   - Cuenta destino inexistente → se dispara **compensación**: se acredita de vuelta el origen (`reference_id={tx_id}:compensate`) → `COMPENSATED`.
   - Accounts Service inalcanzable → queda en `DEBIT_COMPLETED`, la reconciliación reintenta el crédito (idempotente, no duplica saldo).
   - Si la compensación misma falla → `FAILED_COMPENSATION` (requiere intervención manual, queda registrado con `error_message`).

La idempotencia de cada paso (mismo `reference_id` nunca se aplica dos veces) es lo que permite que la reconciliación reintente sin riesgo de doble cobro/doble abono.

## Job de reconciliación

Tarea en background (`processor-service/app/reconciliation.py`) que corre cada `RECONCILIATION_INTERVAL_SECONDS` (default 30s) y busca transacciones en `PENDING`, `DEBIT_COMPLETED` o `COMPENSATING` cuya `updated_at` supere `PENDING_TIMEOUT_SECONDS` (default 60s), reanudando el saga desde el punto donde quedó.

## Levantar el entorno

```bash
docker compose up --build
```

Servicios expuestos:
- Accounts Service: http://localhost:8011/docs
- Processor Service: http://localhost:8012/docs

## Flujo de prueba rápido

```bash
# 1. Crear dos cuentas
curl -X POST http://localhost:8011/accounts -H "Content-Type: application/json" \
  -d '{"owner_name":"Alice","email":"alice@test.com","initial_balance":100}'
curl -X POST http://localhost:8011/accounts -H "Content-Type: application/json" \
  -d '{"owner_name":"Bob","email":"bob@test.com","initial_balance":0}'

# 2. Consultar saldo
curl http://localhost:8011/accounts/{account_id}/balance

# 3. Recargar saldo (simulado)
curl -X POST http://localhost:8012/transactions/recharge -H "Content-Type: application/json" \
  -d '{"account_id":"<alice_id>","amount":50}'

# 4. Transferencia P2P
curl -X POST http://localhost:8012/transactions/transfer -H "Content-Type: application/json" \
  -d '{"from_account_id":"<alice_id>","to_account_id":"<bob_id>","amount":30}'

# 5. Historial de transacciones de una cuenta
curl http://localhost:8012/accounts/{account_id}/transactions

# 6. Health checks
curl http://localhost:8011/health
curl http://localhost:8012/health
```

## Validaciones de negocio

- Fondos insuficientes → débito rechazado (`422`), transacción marcada `FAILED`.
- Cuenta inexistente (origen, destino o recarga) → `404` en Accounts Service, transacción `FAILED`.
- Transferencia a la misma cuenta → rechazada (`FAILED` inmediato).
- Accounts Service caído → Processor responde `502` o deja la transacción `PENDING`/`DEBIT_COMPLETED` para que la reconciliación la resuelva.

## Logs estructurados

Ambos servicios emiten logs JSON a stdout (`logging_config.py`) con `timestamp`, `level`, `service`, `logger`, `message` y campos extra (`transaction_id`, `account_id`, `duration_ms`, etc.), aptos para ingestión en un stack de observabilidad (ELK, Loki, CloudWatch).

## Documentación de APIs

Swagger/OpenAPI autogenerado por FastAPI en `/docs` (y `/redoc`) de cada servicio.

## Estructura del repo

```
accounts-service/
  app/
    main.py            # FastAPI app, middleware de logging
    config.py           # Settings (env vars)
    database.py          # engine/session async SQLAlchemy
    models.py            # Account, LedgerEntry
    schemas.py           # Pydantic DTOs
    crud.py               # credit/debit idempotentes, validación de fondos
    routers/
      accounts.py
      health.py
processor-service/
  app/
    main.py             # FastAPI app + arranque del job de reconciliación
    config.py
    database.py
    models.py             # Transaction (tipo/estado)
    schemas.py
    clients.py             # HTTP client hacia accounts-service
    saga.py                  # orquestación saga + compensación
    crud.py
    reconciliation.py        # job en background
    routers/
      transactions.py
      health.py
docker-compose.yml
.env
```

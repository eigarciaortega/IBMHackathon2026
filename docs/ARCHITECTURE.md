# Architecture

NeoWallet usa una arquitectura de microservicios ligera con dos servicios Node.js/Express y dos bases de datos PostgreSQL separadas.

```mermaid
flowchart LR
    Client["Client / Postman / Swagger"] --> AccountsApi["accounts-service<br/>Port 3000"]
    Client --> ProcessorApi["processor-service<br/>Port 3001"]
    ProcessorApi -->|HTTP REST| AccountsApi
    AccountsApi --> AccountsDb[("accounts_db<br/>users")]
    ProcessorApi --> ProcessorDb[("processor_db<br/>transactions")]
```

## Componentes

### accounts-service

Responsabilidades:

- Consultar usuarios y saldos.
- Recargar saldo de forma simulada.
- Ejecutar debitos y creditos internos con transacciones SQL.
- Proteger contra saldos negativos con validaciones y constraints.

### processor-service

Responsabilidades:

- Orquestar transferencias P2P.
- Registrar transacciones y estados.
- Aplicar idempotencia.
- Ejecutar compensacion tipo Saga.
- Exponer historial, auditoria y reconciliacion.

## Bases de datos

`accounts_db` contiene `users`, con `balance DECIMAL(10,2)` y `CHECK (balance >= 0)`.

`processor_db` contiene `transactions`, con:

- `transaction_id` unico.
- `sender_id` y `receiver_id`.
- `amount DECIMAL(10,2)` con `CHECK (amount > 0)`.
- `status` restringido a `PENDING`, `DEBITED`, `COMPLETED`, `FAILED`, `ROLLED_BACK`.
- `idempotency_key` con indice unico parcial cuando no es `NULL`.
- Indices para `sender_id`, `receiver_id` y `created_at`.

## Flujo de transferencia

```mermaid
sequenceDiagram
    participant C as Client
    participant P as processor-service
    participant A as accounts-service
    participant DBP as processor_db
    participant DBA as accounts_db

    C->>P: POST /api/transfer
    P->>P: Validate input
    P->>A: GET sender
    P->>A: GET receiver
    P->>P: Validate funds
    P->>DBP: Insert PENDING
    P->>A: Debit sender
    A->>DBA: SELECT FOR UPDATE + UPDATE
    A-->>P: Debit ok
    P->>DBP: Mark DEBITED
    P->>A: Credit receiver
    A->>DBA: SELECT FOR UPDATE + UPDATE
    A-->>P: Credit ok
    P->>DBP: Mark COMPLETED
    P-->>C: transaction_id
```

## Flujo de idempotencia

```mermaid
sequenceDiagram
    participant C as Client
    participant P as processor-service
    participant DBP as processor_db

    C->>P: POST /api/transfer + X-Idempotency-Key
    P->>DBP: Search by idempotency_key
    alt transaction exists
        DBP-->>P: Existing transaction
        P-->>C: 200 idempotent_replay true
    else new key
        P->>DBP: Insert transaction with key
        P-->>C: Process normal transfer
    end
```

## Flujo de compensacion Saga

```mermaid
sequenceDiagram
    participant P as processor-service
    participant A as accounts-service
    participant DBP as processor_db

    P->>A: Debit sender
    A-->>P: Debit ok
    P->>DBP: Mark DEBITED
    P->>A: Credit receiver
    A-->>P: Credit failed
    P->>A: Compensate sender with credit
    A-->>P: Compensation ok
    P->>DBP: Mark ROLLED_BACK
```

## Flujo de auditoria y reconciliacion

```mermaid
flowchart TD
    Audit["GET /api/audit/money-conservation"] --> Users["Read seed users 1, 2, 3 via accounts-service"]
    Users --> Sum["Sum balances"]
    Sum --> Compare["Compare against 1050.00"]
    Compare --> Result["CONSISTENT or INCONSISTENT"]

    Reco["GET /api/audit/reconciliation"] --> Counts["Count transactions by status"]
    Counts --> Warn["Warn when PENDING or DEBITED exist"]
    Warn --> RecoResult["OK or WARNING"]
```

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Perdida de dinero | Saga con compensacion y auditoria de total |
| Duplicidad por reintentos | `X-Idempotency-Key` e indice unico parcial |
| Race conditions | `SELECT ... FOR UPDATE` en updates de balance |
| Fallos de comunicacion | Estados `FAILED`/`ROLLED_BACK`, health checks y logs |
| Inputs invalidos | Validadores estrictos y SQL parametrizado |
| Baja observabilidad | Logs JSON, Swagger, Postman y reconciliacion |

## Decisiones tecnicas

- Node.js y Express mantienen el codigo simple para hackathon.
- PostgreSQL aporta transacciones, constraints e indices.
- Docker Compose levanta todo localmente.
- Swagger y Postman facilitan demo y QA.
- GitHub Actions ejecuta checks ligeros sin levantar toda la app.


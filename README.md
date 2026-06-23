# NeoWallet P2P Payments

NeoWallet P2P Payments es un MVP API-first para FastPay, una startup fintech que necesita una billetera digital simple para pagos peer-to-peer.

El objetivo del proyecto es permitir consultar saldos, preparar recargas simuladas, preparar transferencias P2P y consultar historial de transacciones, priorizando consistencia financiera y trazabilidad sobre una interfaz visual.

## Regla critica del negocio

Durante una transferencia P2P no se puede perder, crear, duplicar ni destruir dinero. La suma total de dinero del sistema debe conservarse.

## Propuesta de valor

NeoWallet ofrece una base de API REST clara, trazable y defendible para construir pagos P2P simples. Cada transferencia futura tendra `transaction_id`, estados de transaccion, validaciones de negocio, idempotencia y compensacion ante fallos parciales.

## Arquitectura

El proyecto usa una arquitectura de microservicios ligera:

- `accounts-service`: gestiona usuarios, saldos, recargas simuladas y el endpoint interno de actualizacion de balance.
- `processor-service`: orquesta transferencias P2P, registra transacciones y expone historial.
- `accounts-db`: PostgreSQL separado para usuarios y balances.
- `processor-db`: PostgreSQL separado para transacciones.

Se usan dos bases de datos para respetar el principio de "database per service". Esto permite que cada servicio tenga su propio modelo, responsabilidad y ciclo de vida sin compartir tablas directamente.

## Estructura

```text
neowallet-p2p-payments/
├── accounts-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── db.js
│   │   ├── index.js
│   │   └── swagger.js
│   ├── Dockerfile
│   └── package.json
├── processor-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── db.js
│   │   ├── index.js
│   │   └── swagger.js
│   ├── Dockerfile
│   └── package.json
├── shared-infra/
│   ├── accounts-init.sql
│   └── processor-init.sql
├── docs/
│   ├── ARCHITECTURE.md
│   └── MARKET_REFERENCE.md
├── postman/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Levantar el proyecto

```bash
docker compose up --build
```

Para validar la configuracion sin levantar contenedores:

```bash
docker compose config
```

## URLs locales

- Accounts Service: `http://localhost:3000`
- Processor Service: `http://localhost:3001`
- Swagger Accounts: `http://localhost:3000/api-docs`
- Swagger Processor: `http://localhost:3001/api-docs`
- Health Accounts: `http://localhost:3000/health`
- Health Processor: `http://localhost:3001/health`

## Usuarios semilla

| id | name | email | balance |
| --- | --- | --- | --- |
| 1 | Usuario A (Rico) | usuario.a@neowallet.com | 1000.00 |
| 2 | Usuario B (Pobre) | usuario.b@neowallet.com | 50.00 |
| 3 | Usuario C (Nuevo) | usuario.c@neowallet.com | 0.00 |

## Endpoints principales

### Accounts Service

- `GET /health`
- `GET /api-docs`
- `GET /accounts/:id`
- `POST /api/recharge`
- `POST /accounts/update-balance`

### Processor Service

- `GET /health`
- `GET /api-docs`
- `POST /api/transfer`
- `GET /api/transactions/:user_id`

## Alcance actual: fase 1.3

Esta fase incluye:

- Estructura base del repositorio.
- Dos servicios Express.
- Dos Dockerfiles.
- Docker Compose con dos instancias PostgreSQL.
- Scripts SQL de inicializacion.
- Datos semilla para usuarios.
- Health checks con conexion real a base de datos.
- Swagger basico en ambos servicios.
- Endpoint `GET /accounts/:id` funcional para consulta de saldos.
- Endpoint `POST /api/recharge` funcional para recargas simuladas atomicas.
- Endpoint `POST /accounts/update-balance` funcional para debitos y creditos internos atomicos.
- Validacion de montos positivos con maximo 2 decimales.
- Prevencion de saldo negativo en debitos.
- Bloqueo `SELECT ... FOR UPDATE` para reducir race conditions simples en operaciones de balance.
- Endpoint `POST /api/transfer` funcional para transferencias P2P.
- Validacion de usuarios existentes consultando `accounts-service`.
- Validacion de fondos suficientes antes de debitar.
- Bloqueo de auto-transferencias.
- Estados de transaccion `PENDING`, `DEBITED`, `COMPLETED`, `FAILED` y `ROLLED_BACK`.
- Idempotencia real con `X-Idempotency-Key`: si se repite la misma key, se devuelve la transaccion existente con `idempotent_replay: true` y no se mueve dinero otra vez.
- Compensacion tipo Saga: si falla el credito despues del debito, el sender recibe una compensacion y la transaccion queda `ROLLED_BACK`.
- Simulacion demo de fallo de credito con `X-Simulate-Credit-Failure: true`.
- Endpoint `GET /api/audit/money-conservation` para verificar que el total de dinero en usuarios seed sigue siendo `1050.00`.
- Endpoint `GET /api/audit/reconciliation` para conteos por estado y alertas de transacciones abiertas.
- Manejo uniforme de errores con `error`, `message`, `statusCode`, `timestamp` y `service`.
- Logs estructurados JSON para auditoria de operaciones monetarias y errores.
- Health checks mejorados: `processor-service` valida base de datos y conectividad hacia `accounts-service`.
- Validaciones reforzadas contra ids invalidos, montos no numericos, arrays, objetos, `NaN`, montos con mas de 2 decimales y operaciones internas invalidas.
- Prevencion de SQL Injection mediante consultas parametrizadas.
- Indices en `transactions` para `sender_id`, `receiver_id`, `created_at` e `idempotency_key`.
- Comunicacion HTTP de `processor-service` hacia `accounts-service`.
- Endpoint `GET /api/transactions/:user_id` funcional para historial enviado/recibido.

## Fuera de alcance en fase 1.3

- Frontend.
- JWT u OAuth.
- KYC real.
- Pagos reales.
- Integracion con Stripe, PayPal, SPEI, Pix, PSE, tarjetas u otros procesadores.
- Multiples monedas.
- Retiros bancarios.
- Job de reconciliacion.
- Tests completos.
- Coleccion final de Postman.

## Pruebas de resiliencia fintech

Idempotencia:

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: idem-001" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":100.00}"
```

Repetir la misma peticion debe devolver `idempotent_replay: true` y no debe mover dinero dos veces.

Compensacion Saga:

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Credit-Failure: true" \
  -d "{\"sender_id\":1,\"receiver_id\":2,\"amount\":10.00}"
```

El sistema debita, simula fallo de credito, compensa al sender y marca la transaccion como `ROLLED_BACK`.

Auditoria:

```bash
curl http://localhost:3001/api/audit/money-conservation
```

Debe devolver `CONSISTENT` cuando el total de balances de usuarios seed sea `1050.00`.

## Bonus planeados

- Historial de transacciones completo.
- Saga con compensacion.
- Idempotencia con `X-Idempotency-Key`.
- Logs estructurados JSON.
- Health checks.
- Swagger/OpenAPI.
- Coleccion Postman.

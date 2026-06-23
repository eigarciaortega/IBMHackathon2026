# NeoWallet

Sistema de pagos **P2P** (peer-to-peer) como billetera digital. Dos microservicios **Go** con arquitectura **database-per-service**: `accounts-service` (usuarios y saldos) y `processor-service` (orquestador de transferencias con **Saga** y compensación).

> ⚡ **Garantía central:** bajo ninguna circunstancia se crea ni se pierde dinero. Cada transferencia es una saga orquestada con débito atómico, crédito y, si algo falla, compensación automática. Todo movimiento es **idempotente** — un reintento nunca duplica una operación.

---

## 🚀 Levantar en 1 minuto

```bash
cp .env.example .env
docker-compose up --build
```

Esto levanta:
| Contenedor | Puerto | Descripción |
|------------|--------|-------------|
| `accounts-db` | 5432 | PostgreSQL con usuarios, saldos y ledger |
| `processor-db` | 5433 | PostgreSQL con transacciones y máquina de estados |
| `accounts-service` | 3000 | API de cuentas (Go, `chi`, `pgx`) |
| `processor-service` | 3001 | Orquestador de transferencias (Go, Saga) |

## 📖 Documentación

- **Swagger UI:** [accounts-service](http://localhost:3000/api-docs) · [processor-service](http://localhost:3001/api-docs)
- [Arquitectura y decisiones](./docs/ARCHITECTURE.md) — diagramas Mermaid de la Saga y ERD
- [Contrato de API](./docs/API_CONTRACT.md) — todos los endpoints y códigos de error
- [Casos de prueba](./docs/TEST_CASES.md) — 15 casos documentados
- [Guía de despliegue](./docs/DEPLOYMENT.md)
- [Guion del pitch](./docs/PITCH.md) — video de 3 min

## 💸 Endpoints principales

### accounts-service

```bash
# Consultar saldo
curl http://localhost:3000/accounts/1

# Recargar
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id": 3, "amount": 200.50, "payment_method": "simulada"}'
```

### processor-service

```bash
# Transferir (Saga orquestada con compensación)
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 100}'

# Historial
curl http://localhost:3001/api/transactions/1
```

## 📐 Arquitectura

```
                  ┌──────────────────────┐
                  │   processor-service  │
                  │   (orquestador Saga) │
                  └──────┬───────────────┘
                         │ HTTP REST
                  ┌──────▼───────────────┐
                  │   accounts-service   │
                  │   (dueño del dinero) │
                  └──────┬───────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
   ┌──────▼──────┐              ┌───────▼──────┐
   │ accounts_db │              │ processor_db │
   │ (usuarios,  │              │ (transacc.,  │
   │  saldos,    │              │  estados)    │
   │  ledger)    │              │              │
   └─────────────┘              └──────────────┘
```

- **Database-per-service estricto:** `processor-service` jamás toca `accounts_db`. Todo movimiento de saldo pasa por HTTP a `accounts-service`.
- **Saga orquestada:** `PENDING → DEBITED → COMPLETED` o `ROLLED_BACK` (compensación).
- **Idempotencia:** tabla `balance_operations` con clave única. Un reintento devuelve el resultado previo sin duplicar el movimiento.
- **Dinero como DECIMAL:** `shopspring/decimal` en Go, `DECIMAL(10,2)` en PostgreSQL. Cero `float` en todo el flujo.
- **Débito atómico:** `UPDATE ... WHERE balance >= $1 RETURNING balance` — sin lectura-luego-escritura.

## 🔬 Pruebas

```bash
# Tests unitarios (requiere BD local)
cd accounts-service && go test ./internal/services -v
cd processor-service && go test ./internal/services -v

# Postman / Newman
cd qa/postman
newman run NeoWallet.postman_collection.json -e NeoWallet.postman_environment.json
```

Los tests verifican:
- ✅ Transferencia feliz (A→B)
- ✅ Fondos insuficientes
- ✅ Auto-transferencia bloqueada
- ✅ Concurrencia sin oversell (20 débitos simultáneos, jamás saldo negativo)
- ✅ Idempotencia (reintentos no duplican)
- ✅ **Invariante del dinero** (batería de transferencias con fallos → suma total constante)

## 📂 Estructura del proyecto

```
NeoWallet/
├── accounts-service/        # Dueño de usuarios y saldos
│   ├── cmd/server/          # Entry point
│   ├── internal/            # handlers, services, repository, models, middleware
│   └── docs/                # Swagger auto-generado
├── processor-service/       # Orquestador Saga
│   ├── cmd/server/
│   ├── internal/            # handlers, services, repository, clients, models, middleware
│   └── docs/
├── shared-infra/            # init-*.sql (esquemas + semilla)
├── docs/                    # ARCHITECTURE, API_CONTRACT, TEST_CASES, DEPLOYMENT, PITCH
├── qa/                      # Postman, Gherkin
├── docker-compose.yml       # Orquestación local
├── docker-compose.prod.yml  # Producción (Dokploy/Hetzner)
├── go.work                  # Go workspace (ambos servicios)
└── .env.example             # Variables de entorno requeridas
```

## 🛡️ Códigos de error

| Error | HTTP | Significado |
|-------|------|-------------|
| `self_transfer_not_allowed` | 400 | sender == receiver |
| `invalid_amount` | 400 | Monto ≤0 o más de 2 decimales |
| `user_not_found` | 404 | Usuario no existe |
| `insufficient_funds` | 400 | Saldo insuficiente |
| `unauthorized` | 401 | Falta X-Internal-Key |
| `transfer_failed` | 500 | Compensación ejecutada |

## 🔑 Stack

| Capa | Tecnología |
|------|-----------|
| Lenguaje | Go 1.22+ (router `chi`, driver `pgx/v5`) |
| Base de datos | PostgreSQL 16 ×2 instancias |
| Dinero | `shopspring/decimal` + `DECIMAL(10,2)` |
| Orquestación | Docker Compose |
| Documentación | Swagger (`swaggo/swag`) |
| Logs | `slog` JSON estructurado |
| QA | Postman, Newman, Gherkin |

## Licencia

MIT — ver archivo [LICENSE](./LICENSE).
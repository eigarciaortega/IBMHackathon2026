# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NeoWallet** — MVP de billetera digital P2P. Dos microservicios Spring Boot 4.1.0 (Java 21) que se comunican via HTTP/REST.

- **`accountService/`** (port 3000) — gestión de usuarios y saldos
- **`processorService/`** (port 3001) — lógica de transferencias P2P con patrón Saga

## Commands

Run from within each service directory.

```bash
# Build (sin tests)
./mvnw package -DskipTests

# Run local
./mvnw spring-boot:run

# Single test class
./mvnw test -Dtest=AccountServiceApplicationTests

# Docker (from root case2/)
docker-compose up --build       # first run
docker-compose up               # subsequent runs
docker-compose down             # stop (data persists in volumes)
docker-compose down -v          # stop + delete volumes (fresh DB — seed users get NEW UUIDs)
```

## Architecture

```
Client (Postman)
    │
    ├─ GET/POST :3000  ──▶  accountService  ──▶  accounts_db (PG :5432)
    │                              ▲
    └─ POST :3001      ──▶  processorService ──▶  processor_db (PG :5433)
                             (Saga orchestrator)
```

### Dual-ID Strategy

Both entities use two IDs to prevent enumeration attacks:
- `id` (Long) — internal primary key, never exposed externally
- `publicId` (UUID) — exposed in all API responses and accepted as path/body parameter

All external endpoints accept and return UUIDs.

### Saga Pattern (Transfer)

`TransferService.transfer()` is **not** `@Transactional` — each `transactionRepository.save()` commits immediately so the state machine survives process failures.

Flow: validate → create PENDING tx → debit sender → mark DEBITED → credit receiver → mark COMPLETED.
Compensation: if credit fails → credit sender back → mark ROLLED_BACK. If compensation also fails → mark FAILED and log CRITICAL (requires manual intervention).

### Concurrency Safety

`UserRepository.findByPublicIdWithLock()` uses `PESSIMISTIC_WRITE` lock so concurrent debits on the same user are serialized at the DB level. `AccountService` also has an application-level balance check before deducting. The DB-level `CHECK (balance >= 0)` constraint acts as a last-resort safety net.

### Security

Both services have a `SecurityConfig` that disables Spring Security's default authentication — all endpoints are publicly accessible (no auth layer in the MVP).

## API Endpoints

### accountService (port 3000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts/{publicId}` | Get user and balance |
| POST | `/api/recharge` | Add funds to wallet |
| POST | `/accounts/update-balance` | Internal — called only by processorService |

**Swagger UI**: `http://localhost:3000/swagger-ui.html`

Request bodies:
```jsonc
// POST /api/recharge
{ "userId": "<UUID>", "amount": 100.00 }

// POST /accounts/update-balance
{ "userId": "<UUID>", "amount": 50.00, "operation": "debit" | "credit" }
```

### processorService (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transfer` | P2P transfer (Saga) |
| GET | `/api/transactions/{userId}` | Transaction history |

```jsonc
// POST /api/transfer
{ "senderId": "<UUID>", "receiverId": "<UUID>", "amount": 25.00 }
```

### Error response shape (both services)

```json
{ "error": "error_code", "message": "Human-readable detail", "status": 400 }
```

## Data Models

**accounts_db.users**: `id`, `public_id` (UUID, auto-generated on insert), `name`, `email` (unique), `balance` (DECIMAL 10,2, ≥ 0), `created_at`, `updated_at`

**processor_db.transactions**: `id`, `public_id` (UUID), `sender_public_id`, `receiver_public_id`, `amount`, `status` (PENDING/DEBITED/COMPLETED/FAILED/ROLLED_BACK), `error_message`, `created_at`, `updated_at`

Seed users are inserted via `accountService/src/main/resources/data.sql` (ON CONFLICT on `email` — safe on restart). After `docker-compose down -v`, seed users get new `public_id` values since the INSERT does not specify UUIDs.

## Configuration

Both services use env vars with local fallbacks:

| Variable | accountService local default | processorService local default |
|----------|------------------------------|-------------------------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/accountsDB` | `jdbc:postgresql://localhost:5432/accountsDB` |
| `DB_USERNAME` | `postgres` | `postgres` |
| `DB_PASSWORD` | `KqXoH*8Dvg4G` | `KqXoH*8Dvg4G` |
| `ACCOUNT_SERVICE_URL` | — | `http://localhost:3000` |

> **Note**: The processorService local fallback points to the same host/port as accountService. When running locally without Docker, both services share one PostgreSQL instance and must use separate databases manually. Docker Compose overrides all env vars and gives each service its own container (`accounts-db:5432` / `processor-db:5432`).

`spring.jpa.hibernate.ddl-auto=update` — Hibernate creates tables automatically on first run.
`spring.jpa.defer-datasource-initialization=true` — ensures `data.sql` runs after Hibernate schema setup (accountService only).

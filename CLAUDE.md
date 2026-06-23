# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

NeoWallet is a P2P payments MVP built as two decoupled Node.js/Express microservices, each owning its own PostgreSQL database. Communication between services is synchronous HTTP/REST. The full functional spec (in Spanish) lives in `README.md`.

- **accounts-service** (port 3000) — owns users and balances. Source of truth for money.
- **processor-service** (port 3001) — orchestrates P2P transfers via a Saga; persists a transaction ledger. Holds no balances itself; it mutates balances by calling accounts-service over HTTP.

The processor never touches the accounts DB. The only path to changing a balance is the accounts-service `POST /accounts/update-balance` endpoint.

## Commands

Both services use **pnpm** (`pnpm@10.24.0`). Run commands from inside the relevant service directory.

```bash
docker compose up --build      # build + run both services and both DBs (from repo root)

cd accounts-service            # or processor-service
pnpm install
pnpm dev                       # nodemon, hot reload
pnpm start                     # node src/index.js
pnpm test                      # jest with --coverage --runInBand (serial: tests share real DBs)
pnpm test -- account.unit      # run a single test file by name fragment
pnpm test -- -t "insufficient" # run tests matching a name pattern
```

Jest picks up any `**/tests/**/*.test.js`.

## Test strategy & required infrastructure

There are two distinct kinds of test, distinguished by filename:

- **`*.unit.test.js`** — mock the external boundary. `account.unit.test.js` mocks the service layer (`jest.mock('../src/services/accountService')`) to drive controller error paths. `transfer.unit.test.js` mocks `axios` (so accounts-service need not be running) but **connects to a real processor DB** to assert saga transaction state.
- **`*.integration.test.js`** — no mocks. `transfer.integration.test.js` drives the real processor end-to-end against a **running accounts-service** and resets balances by writing directly to the accounts DB.

Because tests hit real databases, the Postgres containers (and, for integration tests, accounts-service) must be up before running them. Tests `DELETE FROM transactions` and reset seed user balances in `beforeEach`, so **never run them against a production DB**. Suites run with `--runInBand` because the unit and integration files share `processor_db` and would otherwise wipe each other's rows in parallel. Each test file closes both its own test pool and the app's pool (`require('../src/db/connection').end()`) in `afterAll` to avoid leaked handles.

Note: DB host/port in tests come from env vars (loaded via `dotenv` from each service's `.env`) with hardcoded fallbacks. The fallback ports across test files are inconsistent, but the `.env` values override them; set `DB_HOST`/`DB_PORT`/`DB_NAME` explicitly when running outside Docker (see port mapping below).

## Architecture notes

### The Saga (processor-service/src/services/transactionService.js)
`executeTransfer` implements a synchronous orchestration saga — this is the heart of the system:

1. Pre-saga validation (no self-transfer, positive amount, both users exist via `validateUser`, sender has funds).
2. Create a `transactions` row as `PENDING`.
3. Debit sender → status `DEBITED`. On failure → `FAILED` (no compensation needed, no money moved).
4. Credit receiver → status `COMPLETED`. On failure → **compensate** by crediting the sender back → status `ROLLED_BACK`.
5. If compensation itself fails, the transaction is left `ROLLED_BACK` with an `error_message` prefixed `COMPENSATION_FAILED:` and logged at `[Saga][CRITICAL]` — this is the manual-intervention case (money debited but not credited or returned).

Transaction status values are constrained in the DB: `PENDING`, `DEBITED`, `COMPLETED`, `FAILED`, `ROLLED_BACK`. Error codes thrown by the saga map to HTTP status codes in `transferController.js` via `errorMap`.

### Atomic balance updates (accounts-service/src/services/accountService.js)
`updateBalance` is the only money-mutating primitive and runs inside a transaction using `SELECT ... FOR UPDATE` to lock the row, preventing race conditions on concurrent transfers. Insufficient-funds and user-not-found are signalled via `err.code` (`INSUFFICIENT_FUNDS`, `USER_NOT_FOUND`), which controllers translate to 400/404.

### App vs server split
Each service separates `src/app.js` (exports the configured Express app, no `listen`) from `src/index.js` (requires the app and calls `listen`). Tests import `app.js` directly via supertest — **keep this separation**; do not add `app.listen` to `app.js`.

### Layering
Both services follow `routes → controllers → services → db`. Controllers handle HTTP parsing/validation and error-code-to-status mapping; services hold business logic and all SQL/HTTP; `db/connection.js` exports a shared `pg` Pool.

## Endpoints

accounts-service: `GET /accounts/:id`, `POST /api/recharge`, `POST /accounts/update-balance` (internal, used by processor), `GET /health`.

processor-service: `POST /api/transfer`, `GET /api/transactions/:userId`, `GET /health`.

## Schemas & seed data

DB schemas are in each service's `src/db/schema.sql` and are auto-applied by Postgres on first container start (mounted into `/docker-entrypoint-initdb.d/`). The accounts schema seeds three users — id 1 ("Rich", 1000), id 2 ("Poor", 50), id 3 ("New", 0) — which the integration tests depend on.

## Docker port mapping

Host → container: accounts-db `5435→5432`, processor-db `5433→5432`, accounts-service `3000`, processor-service `3001`. Inside the compose network services reach each other by name (e.g. processor uses `ACCOUNTS_SERVICE_URL=http://accounts-service:3000`).

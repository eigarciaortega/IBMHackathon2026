# 🔁 NeoWallet · Processor Service

Microservicio de **transferencias P2P** con **patrón Saga**. No toca saldos
directamente: orquesta débitos y créditos vía HTTP contra accounts-service y
compensa si algo falla, garantizando que **nunca se pierde dinero**.

- **Puerto:** `3001`
- **Base de datos:** `processor_db` (PostgreSQL, puerto host `5433`)
- **Docs:** http://localhost:3001/api-docs

## Endpoints

| Método | Ruta | Descripción | RF |
|--------|------|-------------|----|
| POST | `/api/transfer` | Transferencia P2P (Saga + idempotencia) | RF-003 |
| GET  | `/api/transactions/:id` | Historial (enviadas/recibidas/recargas) | RF-005 |
| POST | `/api/transactions/:id/statement` | Estado de cuenta por correo | extra |
| POST | `/api/admin/reconcile` | Reconciliación manual | bonus |
| GET  | `/health` | Health check (BD + accounts) | RNF-002 |

## Patrón Saga (RF-003 · CU-005)

```
PENDING ─debitar→ DEBITED ─acreditar→ COMPLETED
   │                  │
   │ falla débito     │ falla crédito → COMPENSAR (devolver al sender)
   ▼                  ▼
 FAILED           ROLLED_BACK
```

Si la compensación también falla, la transacción queda en `DEBITED` y el
**job de reconciliación** la cierra de forma segura consultando el libro
mayor de accounts-service (fuente de verdad).

## Idempotencia

Envía la cabecera `Idempotency-Key` (o `idempotency_key` en el body) para que
un reintento no ejecute la transferencia dos veces.

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
npm test     # 20 tests: estados Saga, validaciones y orquestación (con dobles)
```

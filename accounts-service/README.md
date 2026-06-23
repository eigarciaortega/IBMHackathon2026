# 💰 NeoWallet · Accounts Service

Microservicio de **cuentas y saldos**. Es el único componente autorizado a
mover dinero; cada movimiento es atómico y queda auditado en un libro mayor.

- **Puerto:** `8000`
- **Base de datos:** `accounts_db` (PostgreSQL, puerto host `5432`)
- **Docs:** http://localhost:8000/api-docs

## Endpoints

| Método | Ruta | Descripción | RF |
|--------|------|-------------|----|
| GET  | `/accounts/:id` | Consultar saldo | RF-001 |
| GET  | `/accounts` | Listar cuentas (demo) | — |
| POST | `/api/recharge` | Recargar saldo (simulado) | RF-002 |
| POST | `/accounts/update-balance` | Débito/crédito interno | RF-004 |
| GET  | `/accounts/:id/ledger` | Libro mayor de auditoría | bonus |
| GET  | `/accounts/admin/total-balance` | Conservación del dinero | RNF-006 |
| GET  | `/health` | Health check (verifica BD) | RNF-002 |

## Garantías clave

- **Atomicidad y anti-carrera:** toda mutación de saldo ocurre dentro de una
  transacción con `SELECT ... FOR UPDATE`.
- **Auditoría:** cada recarga/débito/crédito inserta un asiento inmutable en
  `balance_ledger` con saldo antes y después.
- **Notificaciones:** tras una recarga, dispara confirmación por SMS y correo
  (fire-and-forget; nunca revierte la operación si la notificación falla).

## Desarrollo local

```bash
npm install
cp .env.example .env   # ajusta PGHOST/credenciales si hace falta
npm run dev
npm test               # tests unitarios (sin BD)
```

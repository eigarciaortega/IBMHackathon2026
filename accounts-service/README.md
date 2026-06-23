# accounts-service

Dueño de usuarios y saldos (`accounts_db`). Operaciones atómicas de recarga, débito y crédito con idempotencia.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/accounts/{user_id}` | Consultar saldo |
| POST | `/api/recharge` | Recargar saldo (simulada) |
| POST | `/accounts/update-balance` | Actualizar saldo (interno, requiere `X-Internal-Key`) |
| GET | `/api-docs` | Swagger UI |

## Ejecución

```bash
cd accounts-service
go run ./cmd/server
```
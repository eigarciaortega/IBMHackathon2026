# processor-service

Orquestador de transferencias P2P (`processor_db`). Implementa una Saga orquestada con compensación ante fallos.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/transfer` | Transferencia P2P (Saga) |
| GET | `/api/transactions/{user_id}` | Historial de transacciones |
| GET | `/api-docs` | Swagger UI |

## Ejecución

```bash
cd processor-service
go run ./cmd/server
```
# NeoWallet P2P

MVP de billetera digital con arquitectura de microservicios y Patrón Saga para resiliencia financiera.

## Arquitectura

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   index.html    │────▶│  Accounts Service     │     │  Processor Service   │
│  (Interfaz Web) │     │  localhost:3000        │◀───│  localhost:3001       │
└─────────────────┘     │                      │     │                      │
                        │  - Consultar saldo   │     │  - Transferencias P2P│
                        │  - Recargar saldo    │     │  - Historial de txs  │
                        │  - Update balance    │     │  - Patrón Saga       │
                        └──────────┬───────────┘     └──────────┬───────────┘
                                   │                            │
                            ┌──────▼──────┐             ┌──────▼──────┐
                            │ accounts_db │             │ processor_db│
                            │  (pg:5432)  │             │  (pg:5433)  │
                            └─────────────┘             └─────────────┘
```

## Endpoints

### Accounts Service (puerto 3000)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/accounts/:id` | Consultar saldo de usuario |
| POST | `/api/recharge` | Recargar saldo |
| POST | `/accounts/update-balance` | Actualizar balance (uso interno) |

### Processor Service (puerto 3001)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/transfer` | Transferir dinero entre usuarios (P2P) |
| GET | `/api/transactions/:user_id` | Historial de transacciones |

## Patrón Saga (Transferencia P2P)

La transferencia sigue estos pasos con compensación automática en caso de fallo:

```
1. Registrar transacción como PENDING
2. Debitar al sender → DEBITED
3. Acreditar al receiver → COMPLETED
   └── Si falla: compensar (re-acreditar al sender) → ROLLED_BACK
```

## Usuarios semilla

| ID | Nombre | Saldo inicial |
|----|--------|---------------|
| 1 | Usuario A (Rico) | $1,000.00 |
| 2 | Usuario B (Pobre) | $50.00 |
| 3 | Usuario C (Nuevo) | $0.00 |

## Requisitos

- Docker y Docker Compose
- Node.js 20+ (manejado por Docker)

## Cómo correr el proyecto

```bash
# Levantar todos los servicios (bases de datos + microservicios)
docker-compose up

# En segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener todo
docker-compose down
```

Una vez activos los servicios, abre `index.html` en tu navegador.

## Estados de transacción

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Transacción registrada, en proceso |
| `DEBITED` | Dinero debitado al sender, pendiente de acreditar |
| `COMPLETED` | Transferencia exitosa |
| `ROLLED_BACK` | Crédito falló, fondos devueltos al sender |
| `FAILED` | Error irrecuperable |

# NeoWallet MVP — P2P Payments Platform

Plataforma fintech de pagos Peer-to-Peer construida con arquitectura de microservicios.

## Arquitectura

```
┌─────────────────────┐        HTTP/REST        ┌──────────────────────┐
│  Processor Service  │ ──────────────────────▶ │  Accounts Service    │
│     (Port 3001)     │                          │     (Port 3000)      │
└─────────┬───────────┘                          └────────────┬─────────┘
          │                                                   │
          ▼                                                   ▼
   ┌─────────────┐                                   ┌─────────────┐
   │ processor_db│                                   │ accounts_db │
   │ (Port 5433) │                                   │ (Port 5432) │
   └─────────────┘                                   └─────────────┘
```

## Stack Tecnológico

- **Runtime:** Node.js 20 + Express
- **Base de Datos:** PostgreSQL 15 (instancia independiente por servicio)
- **Orquestación:** Docker Compose
- **Seguridad:** Prepared Statements, `express-validator`, variables de entorno
- **Patrón Saga:** Rollback automático ante fallas en crédito al receptor

---

## Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose instalados

### 1. Configurar variables de entorno
```bash
cp .env.example .env
```

### 2. Levantar todos los servicios
```bash
docker compose up --build
```

### 3. Verificar que estén corriendo
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

---

## API Reference

### Accounts Service (Port 3000)

#### `GET /accounts/:user_id` — Consultar saldo
```bash
curl http://localhost:3000/accounts/1
# 200: {"id":1,"name":"Alice","email":"alice@neowallet.com","balance":1000.00,...}
# 404: {"error":"user_not_found"}
# 400: (user_id no numérico)
```

#### `POST /api/recharge` — Recargar saldo
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"amount":150.50,"payment_method":"credit_card"}'
# 200: {"user_id":1,"new_balance":1150.50}
```

#### `POST /accounts/update-balance` — (Interno) Actualizar balance
```bash
curl -X POST http://localhost:3000/accounts/update-balance \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"amount":100.00,"operation":"debit"}'
# 200: {"user_id":1,"previous_balance":1000.00,"new_balance":900.00}
```

---

### Processor Service (Port 3001)

#### `POST /api/transfer` — Transferencia P2P
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id":1,"receiver_id":2,"amount":100.00}'
# 200: {"transaction_id":1,"status":"COMPLETED","message":"Transfer completed successfully"}
# 400: {"error":"insufficient_funds"} | {"error":"self_transfer_not_allowed"} | {"error":"invalid_amount"}
# 404: {"error":"user_not_found"}
```

#### `GET /api/transactions/:user_id` — Historial de transacciones (Bonus)
```bash
curl http://localhost:3001/api/transactions/1
# 200: [ ...transacciones ordenadas por fecha desc... ]
```

---

## Ejecutar Tests

```bash
# Accounts Service
cd accounts-service
npm install
npm test
npm run test:coverage

# Processor Service
cd processor-service
npm install
npm test
npm run test:coverage
```

---

## Reglas de Negocio Implementadas

| Regla | Implementación |
|---|---|
| Montos > 0 y máx 2 decimales | `express-validator` en todos los endpoints |
| No auto-transferencias | Validación en `transferService` antes de cualquier operación |
| Verificación de fondos | `UPDATE ... WHERE balance >= amount` atómico en PostgreSQL |
| Conservación del dinero | Débito atómico + crédito atómico; sin creación de dinero |
| Saga / Rollback | Si el crédito falla → revertir débito → estado `ROLLED_BACK` |
| SQL Injection | Prepared Statements (`$1, $2, ...`) en todas las queries |
| Credenciales | Únicamente via variables de entorno |

---

## Logs (Observabilidad)

Formato estructurado JSON con ISO 8601:

```json
{
  "level": "INFO",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "processor-service",
  "message": "Transaction completed",
  "transaction_id": 42,
  "senderId": 1,
  "receiverId": 2,
  "amount": 100
}
```

Niveles disponibles: `INFO`, `WARN`, `ERROR`

---

## Datos de Prueba (Seed)

El `accounts_db` viene con tres usuarios preconfigurados:

| ID | Nombre | Email | Saldo |
|---|---|---|---|
| 1 | Alice | alice@neowallet.com | $1,000.00 |
| 2 | Bob | bob@neowallet.com | $500.00 |
| 3 | Carol | carol@neowallet.com | $250.00 |

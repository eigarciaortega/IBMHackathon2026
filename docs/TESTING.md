# 🧪 Guía de Testing - NeoWallet

Esta guía contiene ejemplos de peticiones para probar todos los endpoints del sistema.

## 📋 Prerequisitos

1. Asegúrate de que el sistema esté corriendo:
```bash
docker-compose up -d
```

2. Verifica que ambos servicios estén saludables:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

---

## 🧪 Casos de Prueba

### 1. Health Checks

#### Accounts Service
```bash
curl http://localhost:3000/health
```

#### Processor Service
```bash
curl http://localhost:3001/health
```

---

### 2. Consultar Usuarios (Estado Inicial)

#### Obtener Usuario 1 (Rico - $1000)
```bash
curl http://localhost:3000/accounts/1
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Usuario A (Rico)",
    "email": "usuario.a@neowallet.com",
    "balance": 1000.00,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### Obtener Usuario 2 (Pobre - $50)
```bash
curl http://localhost:3000/accounts/2
```

#### Obtener Usuario 3 (Nuevo - $0)
```bash
curl http://localhost:3000/accounts/3
```

#### Listar Todos los Usuarios
```bash
curl http://localhost:3000/accounts
```

---

### 3. Recargar Saldo

#### Recargar $100 al Usuario 2
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "amount": 100.00,
    "payment_method": "credit_card"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Recarga exitosa",
  "data": {
    "user_id": 2,
    "amount": 100,
    "payment_method": "credit_card",
    "balance_before": 50.00,
    "balance_after": 150.00,
    "timestamp": "..."
  }
}
```

#### Recargar $500 al Usuario 3
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "amount": 500.00,
    "payment_method": "bank_transfer"
  }'
```

---

### 4. Transferencias P2P Exitosas

#### Caso 1: Usuario 1 envía $100 a Usuario 2
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 100.00
  }'
```

**Resultado esperado:**
- Usuario 1: $1000 → $900
- Usuario 2: $50 → $150
- Transacción: COMPLETED

#### Caso 2: Usuario 2 envía $50 a Usuario 3
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 2,
    "receiver_id": 3,
    "amount": 50.00
  }'
```

---

### 5. Casos de Error

#### Error: Auto-transferencia (sender == receiver)
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 1,
    "amount": 50.00
  }'
```

**Respuesta esperada:** HTTP 400
```json
{
  "success": false,
  "error": {
    "code": "SELF_TRANSFER_NOT_ALLOWED",
    "message": "No puedes transferir dinero a ti mismo"
  }
}
```

#### Error: Fondos insuficientes
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 2,
    "receiver_id": 1,
    "amount": 10000.00
  }'
```

**Respuesta esperada:** HTTP 400
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Fondos insuficientes"
  }
}
```

#### Error: Usuario no existe
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 999,
    "amount": 50.00
  }'
```

**Respuesta esperada:** HTTP 404
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Usuario no encontrado"
  }
}
```

#### Error: Monto negativo
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": -50.00
  }'
```

#### Error: Monto cero
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 0
  }'
```

---

### 6. Historial de Transacciones (Bonus)

#### Ver historial del Usuario 1
```bash
curl http://localhost:3001/api/transactions/1
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "transaction_count": 2,
    "transactions": [
      {
        "transaction_id": 1,
        "type": "sent",
        "amount": 100.00,
        "counterparty_id": 2,
        "status": "COMPLETED",
        "created_at": "...",
        "error_message": null
      }
    ]
  }
}
```

#### Ver historial del Usuario 2
```bash
curl http://localhost:3001/api/transactions/2
```

---

### 7. Estadísticas (Debugging)

```bash
curl http://localhost:3001/api/statistics
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "status_counts": {
      "COMPLETED": 5,
      "FAILED": 2,
      "ROLLED_BACK": 1
    },
    "recent_transactions": [...]
  }
}
```

---

## 🎯 Escenario de Prueba Completo

### Estado Inicial:
- Usuario 1: $1000
- Usuario 2: $50
- Usuario 3: $0

### Secuencia de Pruebas:

```bash
# 1. Verificar saldos iniciales
curl http://localhost:3000/accounts/1
curl http://localhost:3000/accounts/2
curl http://localhost:3000/accounts/3

# 2. Recargar $500 al Usuario 3
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id": 3, "amount": 500.00, "payment_method": "credit_card"}'

# 3. Usuario 1 envía $200 a Usuario 2
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 200.00}'

# 4. Usuario 2 envía $100 a Usuario 3
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 2, "receiver_id": 3, "amount": 100.00}'

# 5. Verificar saldos finales
curl http://localhost:3000/accounts/1  # Debe tener $800
curl http://localhost:3000/accounts/2  # Debe tener $150
curl http://localhost:3000/accounts/3  # Debe tener $600

# 6. Ver historial
curl http://localhost:3001/api/transactions/1
curl http://localhost:3001/api/transactions/2
curl http://localhost:3001/api/transactions/3
```

### Estado Final Esperado:
- Usuario 1: $800 (enviados -$200)
- Usuario 2: $150 (recibidos +$200, enviados -$100)
- Usuario 3: $600 (recarga +$500, recibidos +$100)
- **Total en el sistema: $1550** (igual al inicio + recargas)

---

## 🔍 Verificación de Consistencia

Para verificar que no se pierde dinero en el sistema:

```bash
# Consultar todos los usuarios
curl http://localhost:3000/accounts | jq '.data | map(.balance) | add'
```

La suma total debe ser:
- **Inicio:** $1050 (1000 + 50 + 0)
- **Después de recargas:** $1050 + suma de todas las recargas
- **Después de transferencias:** Igual que después de recargas (las transferencias solo mueven dinero)

---

## 🐛 Debugging

### Ver logs de los servicios
```bash
docker-compose logs -f accounts-service
docker-compose logs -f processor-service
```

### Conectarse a las bases de datos
```bash
# Accounts DB
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Processor DB
docker exec -it neowallet-processor-db psql -U postgres -d processor_db
```

### Queries útiles

#### Ver todos los usuarios y saldos
```sql
SELECT id, name, balance FROM users ORDER BY id;
```

#### Ver todas las transacciones
```sql
SELECT id, sender_id, receiver_id, amount, status, created_at 
FROM transactions 
ORDER BY created_at DESC;
```

#### Verificar suma total de dinero
```sql
SELECT SUM(balance) as total_money FROM users;
```

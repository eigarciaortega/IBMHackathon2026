# 💰 Accounts Service

Microservicio de gestión de cuentas y saldos para NeoWallet.

## 🎯 Responsabilidades

- Gestión de usuarios y sus saldos
- Recarga de saldo (simulada)
- Actualización de balances (débitos y créditos)
- Validación de fondos suficientes

## 🔌 Endpoints

### GET /accounts/:id
Obtiene la información de un usuario por ID.

**Ejemplo:**
```bash
curl http://localhost:3000/accounts/1
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Usuario A (Rico)",
    "email": "usuario.a@neowallet.com",
    "balance": 1000.00,
    "created_at": "2026-06-23T10:00:00.000Z",
    "updated_at": "2026-06-23T10:00:00.000Z"
  }
}
```

### POST /api/recharge
Recarga saldo en la cuenta de un usuario.

**Body:**
```json
{
  "user_id": 1,
  "amount": 100.00,
  "payment_method": "credit_card"
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "amount": 100.00,
    "payment_method": "credit_card"
  }'
```

### POST /accounts/update-balance (Interno)
Actualiza el balance de un usuario. Usado por Processor Service.

**Body:**
```json
{
  "user_id": 1,
  "amount": 50.00,
  "operation": "debit"
}
```

## 🚀 Desarrollo Local

### Instalar dependencias
```bash
npm install
```

### Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

### Iniciar en modo desarrollo
```bash
npm run dev
```

### Ejecutar tests
```bash
npm test
```

## 🐳 Docker

### Construir imagen
```bash
docker build -t neowallet-accounts-service .
```

### Ejecutar contenedor
```bash
docker run -p 3000:3000 --env-file .env neowallet-accounts-service
```

## 📊 Base de Datos

### Tabla: users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 Health Check

```bash
curl http://localhost:3000/health
```

## 📝 Notas

- El saldo nunca puede ser negativo (constraint a nivel de BD)
- Todas las operaciones monetarias son atómicas
- Se usa `SELECT FOR UPDATE` para evitar race conditions

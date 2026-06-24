# 🔄 Processor Service

Microservicio de procesamiento de transferencias P2P con patrón Saga para NeoWallet.

## 🎯 Responsabilidades

- Procesamiento de transferencias P2P entre usuarios
- Implementación del patrón Saga para consistencia distribuida
- Gestión de estados de transacciones (PENDING → DEBITED → COMPLETED)
- Compensación automática en caso de fallos (ROLLED_BACK)
- Historial de transacciones por usuario

## 🏗️ Patrón Saga Implementado

El servicio implementa el patrón Saga para garantizar consistencia en operaciones distribuidas:

```
1. CREATE TRANSACTION (PENDING)
2. DEBIT SENDER (DEBITED)
3. CREDIT RECEIVER (COMPLETED)
   └─ Si falla → COMPENSATE: Credit Sender (ROLLED_BACK)
```

### Estados de Transacción:
- **PENDING**: Transacción iniciada
- **DEBITED**: Dinero debitado del sender
- **COMPLETED**: Transacción completada exitosamente
- **FAILED**: Transacción falló antes del débito
- **ROLLED_BACK**: Transacción revertida después del débito

## 🔌 Endpoints

### POST /api/transfer
Ejecuta una transferencia P2P entre usuarios.

**Body:**
```json
{
  "sender_id": 1,
  "receiver_id": 2,
  "amount": 50.00
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 50.00
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Transferencia completada exitosamente",
  "data": {
    "transaction_id": 1,
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 50.00,
    "status": "COMPLETED",
    "timestamp": "2026-06-23T10:00:00.000Z"
  }
}
```

### GET /api/transactions/:user_id
Obtiene el historial de transacciones de un usuario.

**Ejemplo:**
```bash
curl http://localhost:3001/api/transactions/1
```

### GET /api/statistics
Obtiene estadísticas de transacciones (debugging).

**Ejemplo:**
```bash
curl http://localhost:3001/api/statistics
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

## 🐳 Docker

### Construir imagen
```bash
docker build -t neowallet-processor-service .
```

### Ejecutar contenedor
```bash
docker run -p 3001:3001 --env-file .env neowallet-processor-service
```

## 📊 Base de Datos

### Tabla: transactions
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);
```

## 🔍 Health Check

```bash
curl http://localhost:3001/health
```

## 🛡️ Validaciones Implementadas

- ✅ No permite auto-transferencias (sender != receiver)
- ✅ Valida montos positivos y mayores a cero
- ✅ Verifica fondos suficientes del sender
- ✅ Valida existencia de ambos usuarios
- ✅ Máximo 2 decimales en los montos
- ✅ Compensación automática si falla el crédito

## 📝 Notas Importantes

- **Garantía de consistencia**: El patrón Saga garantiza que no se pierda dinero
- **Operaciones atómicas**: Cada paso es atómico a nivel de base de datos
- **Compensación automática**: Si falla el crédito, el débito se revierte automáticamente
- **Trazabilidad completa**: Cada transacción tiene un ID único para auditoría

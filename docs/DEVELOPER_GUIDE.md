# 👨‍💻 Guía para Desarrolladores - NeoWallet

## 📄 Información del Documento

**Proyecto:** NeoWallet - Sistema de Pagos P2P  
**Audiencia:** Desarrolladores nuevos en el proyecto  
**Nivel:** Junior a Senior  
**Tiempo de Lectura:** 30 minutos  
**Última Actualización:** Junio 2026

---

## 📖 Tabla de Contenidos

1. [Bienvenida](#bienvenida)
2. [Configuración del Entorno](#configuración-del-entorno)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Flujo de Desarrollo](#flujo-de-desarrollo)
5. [Guías de Código](#guías-de-código)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Despliegue](#despliegue)
9. [FAQ](#faq)

---

## Bienvenida

### ¡Hola Desarrollador! 👋

Bienvenido al equipo de NeoWallet. Esta guía te ayudará a ponerte al día rápidamente y ser productivo desde el primer día.

### ¿Qué es NeoWallet?

NeoWallet es un sistema de pagos peer-to-peer (P2P) construido con arquitectura de microservicios. Permite a los usuarios:
- Transferir dinero entre ellos instantáneamente
- Recargar saldo en sus cuentas
- Consultar su historial de transacciones

### Stack Tecnológico

```
Backend:     Node.js 18+ + Express.js
Database:    PostgreSQL 15
DevOps:      Docker + Docker Compose
Testing:     Jest (futuro)
Logging:     Morgan + Console
```

### Arquitectura en 30 Segundos

```
Cliente → Accounts Service (3000) → accounts_db (5432)
       ↘ Processor Service (3001) → processor_db (5433)
                ↓ HTTP
         Accounts Service
```

---

## Configuración del Entorno

### Prerequisitos

Antes de empezar, asegúrate de tener instalado:

```bash
# Verificar versiones
node --version    # v18.0.0 o superior
npm --version     # v9.0.0 o superior
docker --version  # 20.0.0 o superior
docker-compose --version  # 2.0.0 o superior
```

### Paso 1: Clonar el Repositorio

```bash
git clone <repository-url>
cd neowallet
```

### Paso 2: Entender la Estructura

```
neowallet/
├── accounts-service/      # Servicio de cuentas
├── processor-service/     # Servicio de procesamiento
├── docs/                  # Documentación
├── docker-compose.yml     # Orquestación
└── Makefile              # Comandos útiles
```

### Paso 3: Iniciar el Sistema

**Opción A: Con Docker (Recomendado)**
```bash
docker-compose up --build
```

**Opción B: Con Makefile**
```bash
make start
```

**Opción C: Desarrollo Local (sin Docker)**
```bash
# Terminal 1: Accounts DB
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres123 postgres:15

# Terminal 2: Processor DB
docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=postgres123 postgres:15

# Terminal 3: Accounts Service
cd accounts-service
npm install
npm run dev

# Terminal 4: Processor Service
cd processor-service
npm install
npm run dev
```

### Paso 4: Verificar que Todo Funciona

```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health

# Consultar usuarios
curl http://localhost:3000/accounts

# Hacer una transferencia de prueba
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 10.00
  }'
```

Si todo responde correctamente, ¡estás listo! 🎉

---

## Estructura del Proyecto

### Accounts Service

```
accounts-service/
├── src/
│   ├── config/
│   │   └── database.js           # Configuración de PostgreSQL
│   ├── models/
│   │   └── userModel.js          # CRUD de usuarios
│   ├── services/
│   │   └── accountService.js     # Lógica de negocio
│   ├── controllers/
│   │   └── accountController.js  # Manejo de HTTP
│   ├── routes/
│   │   └── accountRoutes.js      # Definición de endpoints
│   └── app.js                    # Aplicación Express
├── init-scripts/
│   └── 01-init.sql               # Schema + datos semilla
├── .env                          # Variables de entorno
├── Dockerfile                    # Imagen Docker
└── package.json                  # Dependencias
```

### Processor Service

```
processor-service/
├── src/
│   ├── config/
│   │   └── database.js           # Configuración de PostgreSQL
│   ├── models/
│   │   └── transactionModel.js   # CRUD de transacciones
│   ├── services/
│   │   └── transferService.js    # Lógica Saga
│   ├── controllers/
│   │   └── transferController.js # Manejo de HTTP
│   ├── routes/
│   │   └── transferRoutes.js     # Definición de endpoints
│   ├── utils/
│   │   └── httpClient.js         # Cliente HTTP
│   └── app.js                    # Aplicación Express
├── init-scripts/
│   └── 01-init.sql               # Schema
├── .env                          # Variables de entorno
├── Dockerfile                    # Imagen Docker
└── package.json                  # Dependencias
```

### Patrón MVC

Seguimos el patrón Model-View-Controller:

```
Request → Routes → Controller → Service → Model → Database
                                    ↓
                                Response
```

**Ejemplo de flujo:**
1. **Route:** Define endpoint y validaciones
2. **Controller:** Parsea request, llama service
3. **Service:** Lógica de negocio
4. **Model:** Acceso a base de datos
5. **Controller:** Formatea y retorna respuesta

---

## Flujo de Desarrollo

### Agregar un Nuevo Endpoint

**Ejemplo:** Agregar endpoint para obtener balance total del sistema

**Paso 1: Crear función en Model**
```javascript
// accounts-service/src/models/userModel.js
async getTotalBalance() {
  const query = 'SELECT SUM(balance) as total FROM users';
  const result = await pool.query(query);
  return parseFloat(result.rows[0].total);
}
```

**Paso 2: Crear función en Service**
```javascript
// accounts-service/src/services/accountService.js
async getSystemBalance() {
  try {
    const total = await userModel.getTotalBalance();
    return {
      total_balance: total,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting system balance:', error);
    throw error;
  }
}
```

**Paso 3: Crear Controller**
```javascript
// accounts-service/src/controllers/accountController.js
async getSystemBalance(req, res) {
  try {
    const result = await accountService.getSystemBalance();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
}
```

**Paso 4: Agregar Route**
```javascript
// accounts-service/src/routes/accountRoutes.js
router.get('/system/balance', accountController.getSystemBalance);
```

**Paso 5: Probar**
```bash
curl http://localhost:3000/system/balance
```

### Modificar Lógica Existente

**⚠️ IMPORTANTE:** Si vas a modificar lógica de transferencias:

1. **Lee el código actual completamente**
2. **Entiende el patrón Saga**
3. **Prueba exhaustivamente**
4. **No rompas la garantía de consistencia**

**Ejemplo: Agregar comisión a transferencias**

```javascript
// processor-service/src/services/transferService.js
async executeTransfer(senderId, receiverId, amount) {
  // Calcular comisión (2%)
  const commission = amount * 0.02;
  const totalAmount = amount + commission;
  
  // Validar fondos suficientes (incluyendo comisión)
  const sender = await this.validateSender(senderId, totalAmount);
  
  // Crear transacción
  const transaction = await transactionModel.create({
    sender_id: senderId,
    receiver_id: receiverId,
    amount: amount,
    commission: commission,
    status: 'PENDING'
  });
  
  try {
    // Debitar monto + comisión
    await this.debitSender(senderId, totalAmount);
    await transactionModel.updateStatus(transaction.id, 'DEBITED');
    
    // Acreditar solo el monto (sin comisión)
    await this.creditReceiver(receiverId, amount);
    await transactionModel.updateStatus(transaction.id, 'COMPLETED');
    
    return { success: true, transaction };
  } catch (error) {
    // Compensación: devolver monto + comisión
    if (transaction.status === 'DEBITED') {
      await this.compensateDebit(senderId, totalAmount, transaction.id);
    }
    throw error;
  }
}
```

---

## Guías de Código

### Estilo de Código

**Nombres de Variables:**
```javascript
// ✅ Bueno
const userId = 1;
const balanceBefore = 100.00;
const transactionId = 123;

// ❌ Malo
const uid = 1;
const bb = 100.00;
const tid = 123;
```

**Funciones Async/Await:**
```javascript
// ✅ Bueno
async function getUserById(userId) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// ❌ Malo (callbacks)
function getUserById(userId, callback) {
  pool.query('SELECT * FROM users WHERE id = $1', [userId], (error, result) => {
    if (error) return callback(error);
    callback(null, result.rows[0]);
  });
}
```

**Manejo de Errores:**
```javascript
// ✅ Bueno
try {
  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'Usuario no encontrado'
    });
  }
  // Continuar...
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: error.message
  });
}

// ❌ Malo
const user = await userModel.findById(userId);
// No valida si user existe
```

### Queries SQL

**Siempre usar Prepared Statements:**
```javascript
// ✅ Bueno
const query = 'SELECT * FROM users WHERE id = $1';
const result = await pool.query(query, [userId]);

// ❌ Malo (SQL Injection)
const query = `SELECT * FROM users WHERE id = ${userId}`;
const result = await pool.query(query);
```

**Usar Transacciones para Operaciones Críticas:**
```javascript
// ✅ Bueno
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Operaciones...
  await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Usar SELECT FOR UPDATE para Evitar Race Conditions:**
```javascript
// ✅ Bueno
const query = 'SELECT * FROM users WHERE id = $1 FOR UPDATE';
const result = await client.query(query, [userId]);

// ❌ Malo (puede causar race conditions)
const query = 'SELECT * FROM users WHERE id = $1';
const result = await client.query(query, [userId]);
```

### Validaciones

**Validar en Múltiples Capas:**
```javascript
// 1. Validación en Routes (express-validator)
const validateTransfer = [
  body('sender_id').isInt({ min: 1 }),
  body('receiver_id').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01 })
];

// 2. Validación en Service
if (senderId === receiverId) {
  throw new Error('SELF_TRANSFER_NOT_ALLOWED');
}

// 3. Validación en BD (constraints)
CHECK (balance >= 0)
```

### Logs

**Logs Informativos:**
```javascript
console.log(`[${new Date().toISOString()}] [INFO] Transfer initiated: sender=${senderId}, receiver=${receiverId}, amount=${amount}`);
```

**Logs de Error:**
```javascript
console.error(`[${new Date().toISOString()}] [ERROR] Transfer failed: ${error.message}`, {
  transactionId: transaction.id,
  error: error.stack
});
```

---

## Testing

### Tests Manuales

**Caso 1: Transferencia Exitosa**
```bash
# 1. Ver saldos iniciales
curl http://localhost:3000/accounts/1
curl http://localhost:3000/accounts/2

# 2. Hacer transferencia
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 50.00
  }'

# 3. Verificar saldos finales
curl http://localhost:3000/accounts/1
curl http://localhost:3000/accounts/2

# 4. Verificar transacción
curl http://localhost:3001/api/transactions/1
```

**Caso 2: Fondos Insuficientes**
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 3,
    "receiver_id": 1,
    "amount": 100.00
  }'

# Debe retornar error 400 INSUFFICIENT_FUNDS
```

**Caso 3: Auto-transferencia**
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 1,
    "amount": 50.00
  }'

# Debe retornar error 400 SELF_TRANSFER_NOT_ALLOWED
```

### Tests Automatizados (Futuro)

```javascript
// accounts-service/tests/accountService.test.js
describe('Account Service', () => {
  test('should get user by id', async () => {
    const user = await accountService.getUserById(1);
    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  });

  test('should recharge balance', async () => {
    const result = await accountService.rechargeBalance(1, 100.00, 'credit_card');
    expect(result.balance_after).toBe(result.balance_before + 100.00);
  });
});
```

---

## Debugging

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Solo Accounts Service
docker-compose logs -f accounts-service

# Solo Processor Service
docker-compose logs -f processor-service

# Últimas 100 líneas
docker-compose logs --tail=100 processor-service
```

### Conectarse a la Base de Datos

```bash
# Accounts DB
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Processor DB
docker exec -it neowallet-processor-db psql -U postgres -d processor_db
```

**Queries Útiles:**
```sql
-- Ver todos los usuarios
SELECT * FROM users;

-- Ver saldo total del sistema
SELECT SUM(balance) as total_money FROM users;

-- Ver transacciones recientes
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- Ver transacciones por estado
SELECT status, COUNT(*) FROM transactions GROUP BY status;

-- Ver transacciones de un usuario
SELECT * FROM transactions WHERE sender_id = 1 OR receiver_id = 1;
```

### Debugging con Node.js

**Agregar breakpoints:**
```javascript
// Agregar debugger statement
async executeTransfer(senderId, receiverId, amount) {
  debugger; // Pausa aquí
  const transaction = await transactionModel.create(...);
  // ...
}
```

**Ejecutar con inspector:**
```bash
node --inspect src/app.js
```

### Problemas Comunes

**Problema: "Cannot connect to database"**
```bash
# Solución: Verificar que la BD esté corriendo
docker-compose ps

# Reiniciar servicios
docker-compose restart accounts-db
```

**Problema: "Port already in use"**
```bash
# Solución: Matar proceso en el puerto
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Problema: "Transaction stuck in DEBITED"**
```sql
-- Solución: Verificar en BD
SELECT * FROM transactions WHERE status = 'DEBITED';

-- Si es necesario, revertir manualmente
UPDATE transactions SET status = 'ROLLED_BACK' WHERE id = <transaction_id>;
UPDATE users SET balance = balance + <amount> WHERE id = <sender_id>;
```

---

## Despliegue

### Desarrollo Local
```bash
docker-compose up --build
```

### Producción (Ejemplo con Docker)
```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Variables de Entorno

**Desarrollo (.env):**
```bash
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
LOG_LEVEL=debug
```

**Producción (.env.production):**
```bash
NODE_ENV=production
PORT=3000
DB_HOST=production-db.example.com
DB_PORT=5432
LOG_LEVEL=info
```

---

## FAQ

### ¿Cómo agrego un nuevo campo a la tabla users?

1. Modificar `accounts-service/init-scripts/01-init.sql`
2. Agregar migración SQL
3. Resetear BD: `docker-compose down -v && docker-compose up --build`

### ¿Cómo cambio el puerto de un servicio?

1. Modificar `.env` del servicio
2. Modificar `docker-compose.yml`
3. Reiniciar: `docker-compose up --build`

### ¿Cómo agrego una nueva validación?

Ver sección [Agregar un Nuevo Endpoint](#agregar-un-nuevo-endpoint)

### ¿Qué hago si una transferencia falla?

1. Ver logs: `docker-compose logs processor-service`
2. Verificar estado en BD: `SELECT * FROM transactions WHERE id = <id>`
3. Si está en DEBITED, el sistema debería compensar automáticamente
4. Si no, revisar logs de error y compensar manualmente si es necesario

### ¿Cómo pruebo el rollback del Saga?

Simula un fallo en el crédito:
```javascript
// Temporalmente en transferService.js
async creditReceiver(receiverId, amount) {
  throw new Error('SIMULATED_FAILURE'); // Agregar esta línea
  // ... resto del código
}
```

---

## Recursos Adicionales

### Documentación del Proyecto
- [README.md](../README.md) - Documentación principal
- [API_SPEC.md](./API_SPEC.md) - Especificación de API
- [TESTING.md](./TESTING.md) - Guía de testing
- [ARCHITECTURE_DECISION.md](./ARCHITECTURE_DECISION.md) - Decisiones arquitectónicas

### Recursos Externos
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Comunidad
- Slack: #neowallet-dev
- Email: dev@neowallet.com

---

## Conclusión

¡Felicidades! Ahora tienes todo lo necesario para ser productivo en NeoWallet.

**Próximos Pasos:**
1. ✅ Configura tu entorno
2. ✅ Explora el código
3. ✅ Haz tu primera contribución
4. ✅ Pide ayuda cuando la necesites

**Recuerda:**
- 💡 Lee el código antes de modificar
- 🧪 Prueba exhaustivamente
- 📝 Documenta tus cambios
- 🤝 Pide code review

¡Bienvenido al equipo! 🚀

---

**Documento Controlado - Versión 1.0**  
**Última Actualización:** Junio 2026  
**Mantenido por:** NeoWallet Dev Team
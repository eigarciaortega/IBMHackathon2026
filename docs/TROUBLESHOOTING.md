# 🔧 Guía de Troubleshooting - NeoWallet

## 📄 Información del Documento

**Proyecto:** NeoWallet - Sistema de Pagos P2P  
**Propósito:** Resolver problemas comunes rápidamente  
**Última Actualización:** Junio 2026

---

## 📖 Tabla de Contenidos

1. [Problemas de Inicio](#problemas-de-inicio)
2. [Problemas de Base de Datos](#problemas-de-base-de-datos)
3. [Problemas de Transferencias](#problemas-de-transferencias)
4. [Problemas de Performance](#problemas-de-performance)
5. [Problemas de Docker](#problemas-de-docker)
6. [Errores Comunes](#errores-comunes)
7. [Herramientas de Diagnóstico](#herramientas-de-diagnóstico)

---

## Problemas de Inicio

### ❌ Error: "Port already in use"

**Síntoma:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa:** Otro proceso está usando el puerto 3000 o 3001.

**Solución:**

**Opción 1: Matar el proceso**
```bash
# En Linux/Mac
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# En Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

**Opción 2: Cambiar el puerto**
```bash
# Editar .env
PORT=3002  # Cambiar a puerto disponible

# Reiniciar
docker-compose up --build
```

**Verificación:**
```bash
# Ver qué está usando el puerto
lsof -i :3000
netstat -ano | findstr :3000  # Windows
```

---

### ❌ Error: "Cannot connect to Docker daemon"

**Síntoma:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Causa:** Docker no está corriendo.

**Solución:**

**En Linux/Mac:**
```bash
sudo systemctl start docker
```

**En Windows:**
- Abrir Docker Desktop
- Esperar a que inicie completamente

**Verificación:**
```bash
docker ps
```

---

### ❌ Error: "docker-compose: command not found"

**Síntoma:**
```bash
bash: docker-compose: command not found
```

**Causa:** Docker Compose no está instalado o no está en PATH.

**Solución:**

**Opción 1: Instalar Docker Compose**
```bash
# Linux
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Mac (con Homebrew)
brew install docker-compose

# Windows: Viene incluido con Docker Desktop
```

**Opción 2: Usar docker compose (sin guión)**
```bash
docker compose up --build
```

---

## Problemas de Base de Datos

### ❌ Error: "Connection refused" a PostgreSQL

**Síntoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa:** La base de datos no está lista o no está corriendo.

**Diagnóstico:**
```bash
# Verificar estado de contenedores
docker-compose ps

# Ver logs de la BD
docker-compose logs accounts-db
docker-compose logs processor-db
```

**Solución 1: Esperar a que la BD esté lista**
```bash
# Las BDs pueden tardar 10-30 segundos en iniciar
# Esperar y reintentar
```

**Solución 2: Reiniciar servicios de BD**
```bash
docker-compose restart accounts-db processor-db
```

**Solución 3: Recrear contenedores**
```bash
docker-compose down
docker-compose up --build
```

**Verificación:**
```bash
# Conectarse a la BD
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Dentro de psql
\dt  # Listar tablas
SELECT * FROM users;  # Ver usuarios
```

---

### ❌ Error: "relation 'users' does not exist"

**Síntoma:**
```
error: relation "users" does not exist
```

**Causa:** Las tablas no se crearon correctamente.

**Solución:**
```bash
# 1. Detener todo
docker-compose down -v  # -v elimina volúmenes

# 2. Verificar que init-scripts existe
ls accounts-service/init-scripts/01-init.sql
ls processor-service/init-scripts/01-init.sql

# 3. Reiniciar
docker-compose up --build

# 4. Verificar que las tablas se crearon
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db -c "\dt"
```

**Verificación Manual:**
```bash
# Conectarse a la BD
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Crear tabla manualmente si es necesario
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Insertar datos semilla
INSERT INTO users (name, email, balance) VALUES 
('Usuario A (Rico)', 'usuario.a@neowallet.com', 1000.00),
('Usuario B (Pobre)', 'usuario.b@neowallet.com', 50.00),
('Usuario C (Nuevo)', 'usuario.c@neowallet.com', 0.00);
```

---

### ❌ Error: "Too many connections"

**Síntoma:**
```
error: sorry, too many clients already
```

**Causa:** Pool de conexiones agotado.

**Solución Inmediata:**
```bash
# Reiniciar servicios
docker-compose restart accounts-service processor-service
```

**Solución Permanente:**
```javascript
// Aumentar max connections en database.js
const pool = new Pool({
  max: 30,  // Aumentar de 20 a 30
  // ...
});
```

**Verificación:**
```sql
-- Ver conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Ver conexiones por aplicación
SELECT application_name, count(*) 
FROM pg_stat_activity 
GROUP BY application_name;
```

---

## Problemas de Transferencias

### ❌ Error: "INSUFFICIENT_FUNDS" pero el usuario tiene saldo

**Síntoma:**
```json
{
  "error": "INSUFFICIENT_FUNDS",
  "message": "Fondos insuficientes"
}
```

**Diagnóstico:**
```bash
# Verificar saldo real en BD
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# En psql
SELECT id, name, balance FROM users WHERE id = 1;
```

**Posibles Causas:**

**1. Race Condition (transferencias concurrentes)**
```sql
-- Ver transacciones recientes del usuario
SELECT * FROM transactions 
WHERE sender_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

**Solución:** El sistema ya usa `SELECT FOR UPDATE`, pero verifica que esté implementado:
```javascript
// Debe tener FOR UPDATE
const query = 'SELECT * FROM users WHERE id = $1 FOR UPDATE';
```

**2. Transacción en estado DEBITED**
```sql
-- Ver si hay transacciones stuck
SELECT * FROM transactions WHERE status = 'DEBITED';
```

**Solución:** Ejecutar compensación manual o esperar a reconciliación automática.

---

### ❌ Transacción Stuck en Estado "DEBITED"

**Síntoma:**
```sql
SELECT * FROM transactions WHERE status = 'DEBITED';
-- Retorna transacciones de hace más de 1 minuto
```

**Causa:** El crédito al receiver falló y la compensación no se ejecutó.

**Diagnóstico:**
```bash
# Ver logs del momento del fallo
docker-compose logs --since 10m processor-service | grep "transaction_id"
```

**Solución Manual:**

**Opción 1: Completar la transferencia**
```sql
-- 1. Verificar que receiver existe
SELECT * FROM users WHERE id = <receiver_id>;

-- 2. Acreditar al receiver
UPDATE users SET balance = balance + <amount> WHERE id = <receiver_id>;

-- 3. Actualizar transacción
UPDATE transactions SET status = 'COMPLETED' WHERE id = <transaction_id>;
```

**Opción 2: Revertir (Rollback)**
```sql
-- 1. Devolver dinero al sender
UPDATE users SET balance = balance + <amount> WHERE id = <sender_id>;

-- 2. Actualizar transacción
UPDATE transactions 
SET status = 'ROLLED_BACK', 
    error_message = 'Manual rollback' 
WHERE id = <transaction_id>;
```

**Prevención:**
- Implementar job de reconciliación (ver BONUS_RESILIENCE.md)
- Monitorear transacciones DEBITED > 5 minutos

---

### ❌ Error: "SELF_TRANSFER_NOT_ALLOWED"

**Síntoma:**
```json
{
  "error": "SELF_TRANSFER_NOT_ALLOWED",
  "message": "No puedes transferirte dinero a ti mismo"
}
```

**Causa:** sender_id == receiver_id

**Solución:** Esto es comportamiento esperado. Verificar que el cliente esté enviando IDs diferentes.

**Verificación:**
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 10.00
  }'
```

---

### ❌ Suma Total de Dinero No es Constante

**Síntoma:**
```sql
-- Antes: 1050.00
-- Después: 1040.00
SELECT SUM(balance) as total FROM users;
```

**🚨 CRÍTICO:** Esto indica pérdida de dinero.

**Diagnóstico Inmediato:**
```sql
-- 1. Ver todas las transacciones recientes
SELECT * FROM transactions 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 2. Ver cambios en balances
SELECT id, name, balance FROM users;

-- 3. Buscar transacciones DEBITED sin COMPLETED
SELECT * FROM transactions 
WHERE status = 'DEBITED' 
AND created_at < NOW() - INTERVAL '5 minutes';
```

**Solución:**

**1. Identificar transacción problemática**
```sql
SELECT * FROM transactions WHERE status IN ('DEBITED', 'FAILED');
```

**2. Revertir manualmente**
```sql
-- Para cada transacción DEBITED
UPDATE users SET balance = balance + <amount> WHERE id = <sender_id>;
UPDATE transactions SET status = 'ROLLED_BACK' WHERE id = <transaction_id>;
```

**3. Verificar suma total**
```sql
SELECT SUM(balance) as total FROM users;
-- Debe ser 1050.00 (valor inicial)
```

**Prevención:**
- Revisar logs de compensación
- Implementar alertas para transacciones DEBITED > 5 min
- Agregar tests de consistencia

---

## Problemas de Performance

### ❌ Transferencias Lentas (> 1 segundo)

**Diagnóstico:**
```bash
# Medir tiempo de respuesta
time curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 10.00}'
```

**Posibles Causas:**

**1. Base de datos lenta**
```sql
-- Ver queries lentas
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Solución:** Agregar índices
```sql
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_transactions_sender ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_id);
```

**2. Pool de conexiones agotado**
```javascript
// Aumentar pool size
const pool = new Pool({
  max: 30,  // Aumentar
  // ...
});
```

**3. Timeout muy alto**
```javascript
// Reducir timeout HTTP
const axiosInstance = axios.create({
  timeout: 3000,  // Reducir de 5000 a 3000
});
```

---

### ❌ Alto Uso de Memoria

**Diagnóstico:**
```bash
# Ver uso de memoria de contenedores
docker stats

# Ver uso de memoria de Node.js
curl http://localhost:3000/health
# Revisar campo "memory"
```

**Solución:**

**1. Limitar memoria de contenedores**
```yaml
# docker-compose.yml
services:
  accounts-service:
    mem_limit: 512m
```

**2. Limpiar pool de conexiones**
```javascript
// Reducir idle timeout
const pool = new Pool({
  idleTimeoutMillis: 10000,  // 10 segundos
});
```

**3. Reiniciar servicios periódicamente**
```bash
# Cron job para reiniciar cada 24 horas
0 0 * * * docker-compose restart accounts-service processor-service
```

---

## Problemas de Docker

### ❌ Error: "No space left on device"

**Síntoma:**
```
Error: ENOSPC: no space left on device
```

**Causa:** Disco lleno, usualmente por imágenes/contenedores viejos.

**Solución:**
```bash
# Ver uso de disco de Docker
docker system df

# Limpiar todo lo no usado
docker system prune -a --volumes

# Limpiar solo imágenes
docker image prune -a

# Limpiar solo volúmenes
docker volume prune
```

---

### ❌ Contenedor se Reinicia Constantemente

**Diagnóstico:**
```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs --tail=50 accounts-service
```

**Posibles Causas:**

**1. Error en el código**
```bash
# Ver error específico en logs
docker-compose logs accounts-service | grep "Error"
```

**2. Health check fallando**
```bash
# Probar health check manualmente
curl http://localhost:3000/health
```

**3. Puerto no disponible**
```bash
# Verificar que el puerto esté libre
lsof -i :3000
```

---

## Errores Comunes

### Error: "USER_NOT_FOUND"

**Solución:**
```bash
# Verificar que el usuario existe
curl http://localhost:3000/accounts/1

# Si no existe, verificar datos semilla
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db -c "SELECT * FROM users;"
```

---

### Error: "INVALID_AMOUNT"

**Causa:** Monto negativo, cero, o más de 2 decimales.

**Solución:**
```bash
# ✅ Correcto
curl -X POST http://localhost:3001/api/transfer \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 10.50}'

# ❌ Incorrecto (3 decimales)
curl -X POST http://localhost:3001/api/transfer \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 10.555}'
```

---

### Error: "VALIDATION_ERROR"

**Causa:** Campos faltantes o tipos incorrectos.

**Solución:**
```bash
# Verificar que todos los campos requeridos estén presentes
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,      # Requerido, integer
    "receiver_id": 2,    # Requerido, integer
    "amount": 10.00      # Requerido, float
  }'
```

---

## Herramientas de Diagnóstico

### Script de Verificación de Salud

```bash
#!/bin/bash
# health-check.sh

echo "=== NeoWallet Health Check ==="

# 1. Verificar servicios
echo -e "\n1. Checking services..."
curl -s http://localhost:3000/health | jq .
curl -s http://localhost:3001/health | jq .

# 2. Verificar usuarios
echo -e "\n2. Checking users..."
curl -s http://localhost:3000/accounts | jq '.data[] | {id, name, balance}'

# 3. Verificar suma total
echo -e "\n3. Checking total balance..."
docker exec neowallet-accounts-db psql -U postgres -d accounts_db -t -c "SELECT SUM(balance) FROM users;"

# 4. Verificar transacciones stuck
echo -e "\n4. Checking stuck transactions..."
docker exec neowallet-processor-db psql -U postgres -d processor_db -t -c "SELECT COUNT(*) FROM transactions WHERE status = 'DEBITED' AND created_at < NOW() - INTERVAL '5 minutes';"

echo -e "\n=== Health Check Complete ==="
```

**Uso:**
```bash
chmod +x health-check.sh
./health-check.sh
```

---

### Queries SQL Útiles

```sql
-- Ver estado del sistema
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT SUM(balance) FROM users) as total_money,
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM transactions WHERE status = 'COMPLETED') as completed_transactions,
  (SELECT COUNT(*) FROM transactions WHERE status = 'DEBITED') as stuck_transactions;

-- Ver actividad reciente
SELECT 
  t.id,
  t.sender_id,
  t.receiver_id,
  t.amount,
  t.status,
  t.created_at,
  EXTRACT(EPOCH FROM (NOW() - t.created_at)) as seconds_ago
FROM transactions t
ORDER BY t.created_at DESC
LIMIT 10;

-- Ver usuarios con más transacciones
SELECT 
  u.id,
  u.name,
  u.balance,
  COUNT(t.id) as transaction_count
FROM users u
LEFT JOIN transactions t ON u.id = t.sender_id OR u.id = t.receiver_id
GROUP BY u.id, u.name, u.balance
ORDER BY transaction_count DESC;
```

---

## Contacto de Soporte

Si ninguna de estas soluciones funciona:

1. 📧 Email: support@neowallet.com
2. 💬 Slack: #neowallet-support
3. 🐛 GitHub Issues: [Crear Issue](https://github.com/neowallet/issues)

**Al reportar un problema, incluye:**
- Logs completos (`docker-compose logs`)
- Pasos para reproducir
- Versión del sistema (`docker --version`, `node --version`)
- Sistema operativo

---

**Documento Controlado - Versión 1.0**  
**Última Actualización:** Junio 2026  
**Mantenido por:** NeoWallet DevOps Team
# 🚀 INSTRUCCIONES DE INICIO - NeoWallet

## ✅ Checklist de Pre-requisitos

Antes de iniciar, verifica que tengas:
- [ ] **Docker Desktop instalado** (ya está ✅)
- [ ] **Docker Desktop corriendo** (verifica el icono en la bandeja del sistema)
- [ ] **Puertos disponibles:** 3000, 3001, 5432, 5433

---

## 📋 **PASO A PASO PARA INICIAR**

### **Paso 1: Verificar Docker Desktop** 🐳

1. **Abre Docker Desktop** desde el menú de inicio o haz doble clic en el icono
2. **Espera a que aparezca** "Docker Desktop is running" en la ventana
3. **Verifica el ícono** en la bandeja del sistema (debe estar verde y sin parpadear)

**💡 Tip:** Docker Desktop puede tardar 1-2 minutos en iniciar completamente.

---

### **Paso 2: Verificar que Docker está listo**

Abre PowerShell o CMD y ejecuta:

```powershell
docker version
```

**Deberías ver algo como:**
```
Client: Docker Engine - Community
 Version:           29.5.3
 API version:       1.54
 ...

Server: Docker Desktop
 Engine:
  Version:          29.5.3
  API version:      1.54 (minimum version 1.24)
  ...
```

Si ves información tanto del **Client** como del **Server**, ¡Docker está listo! ✅

---

### **Paso 3: Navegar al proyecto**

```powershell
cd C:\Users\lesli\OneDrive\Escritorio\neowallet
```

---

### **Paso 4: Iniciar los servicios** 🚀

Ejecuta uno de estos comandos:

#### **Opción A: Con Docker Compose (Recomendado)**
```powershell
docker-compose up --build
```

Este comando:
- 📦 Construye las imágenes Docker
- 🗄️ Crea y configura las bases de datos
- 🚀 Inicia todos los servicios
- 📊 Muestra los logs en tiempo real

#### **Opción B: En modo "detached" (sin logs)**
```powershell
docker-compose up -d --build
```

Este comando hace lo mismo pero no muestra los logs, dejándote libre la terminal.

#### **Opción C: Con Makefile**
```powershell
make start
```

---

### **Paso 5: Verificar que todo está corriendo** ✅

#### **Ver el estado de los contenedores:**
```powershell
docker-compose ps
```

**Deberías ver algo como:**
```
NAME                           STATUS    PORTS
neowallet-accounts-db          Up        0.0.0.0:5432->5432/tcp
neowallet-processor-db         Up        0.0.0.0:5433->5432/tcp
neowallet-accounts-service     Up        0.0.0.0:3000->3000/tcp
neowallet-processor-service    Up        0.0.0.0:3001->3001/tcp
```

Todos deben mostrar **"Up"** o **"healthy"** ✅

---

### **Paso 6: Verificar los Health Checks** 💚

#### **En PowerShell:**
```powershell
# Accounts Service
curl http://localhost:3000/health

# Processor Service
curl http://localhost:3001/health
```

#### **En tu navegador:**
- Accounts Service: http://localhost:3000/health
- Processor Service: http://localhost:3001/health

**Respuesta esperada:**
```json
{
  "success": true,
  "service": "accounts-service",
  "status": "healthy",
  "database": "connected"
}
```

---

### **Paso 7: Ver los usuarios iniciales** 👥

```powershell
curl http://localhost:3000/accounts
```

**Deberías ver:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "Usuario A (Rico)",
      "balance": 1000.00,
      ...
    },
    {
      "id": 2,
      "name": "Usuario B (Pobre)",
      "balance": 50.00,
      ...
    },
    {
      "id": 3,
      "name": "Usuario C (Nuevo)",
      "balance": 0.00,
      ...
    }
  ]
}
```

---

### **Paso 8: ¡Haz tu primera transferencia!** 💸

```powershell
curl -X POST http://localhost:3001/api/transfer `
  -H "Content-Type: application/json" `
  -d '{\"sender_id\":1,\"receiver_id\":2,\"amount\":100.00}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Transferencia completada exitosamente",
  "data": {
    "transaction_id": 1,
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 100.00,
    "status": "COMPLETED"
  }
}
```

---

### **Paso 9: Verificar que funcionó** ✅

```powershell
# Ver nuevo saldo del Usuario 1 (debería tener $900)
curl http://localhost:3000/accounts/1

# Ver nuevo saldo del Usuario 2 (debería tener $150)
curl http://localhost:3000/accounts/2
```

---

## 🎉 **¡LISTO!** Tu sistema NeoWallet está funcionando

---

## 📊 **Ver Logs en Tiempo Real**

Si iniciaste en modo detached y quieres ver los logs:

```powershell
# Todos los servicios
docker-compose logs -f

# Solo Accounts Service
docker-compose logs -f accounts-service

# Solo Processor Service
docker-compose logs -f processor-service

# Solo las bases de datos
docker-compose logs -f accounts-db processor-db
```

**Presiona Ctrl+C para salir de los logs**

---

## 🛑 **Detener los Servicios**

```powershell
# Detener sin eliminar datos
docker-compose stop

# Detener y eliminar contenedores (conserva los datos)
docker-compose down

# Detener y eliminar TODO (incluye datos de BD)
docker-compose down -v
```

---

## 🔄 **Reiniciar el Sistema**

```powershell
# Detener
docker-compose down

# Iniciar de nuevo
docker-compose up -d --build
```

O simplemente:
```powershell
make restart
```

---

## 🐛 **Troubleshooting - Problemas Comunes**

### **1. "Docker is not running"**
**Solución:** Abre Docker Desktop y espera a que inicie completamente (1-2 minutos)

### **2. "Port already in use" (Puerto en uso)**
**Solución:** 
```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar el proceso (reemplaza PID con el número que aparece)
taskkill /PID [número] /F
```

### **3. "Cannot connect to database"**
**Solución:**
```powershell
# Ver logs de las bases de datos
docker-compose logs accounts-db
docker-compose logs processor-db

# Reiniciar todo desde cero
docker-compose down -v
docker-compose up --build
```

### **4. "Service unhealthy"**
**Solución:**
```powershell
# Ver qué está pasando
docker-compose logs [nombre-del-servicio]

# Reconstruir el servicio
docker-compose up --build [nombre-del-servicio]
```

### **5. Los servicios inician pero no responden**
**Solución:**
```powershell
# Verificar que las redes estén bien
docker network ls
docker network inspect neowallet_neowallet-network

# Reiniciar Docker Desktop
# Menú: Docker Desktop > Troubleshoot > Restart Docker Desktop
```

---

## 📚 **Próximos Pasos**

Una vez que todo esté funcionando:

1. **Lee la documentación completa:** [README.md](./README.md)
2. **Prueba todos los casos de uso:** [docs/TESTING.md](./docs/TESTING.md)
3. **Explora la API:** [docs/API_SPEC.md](./docs/API_SPEC.md)
4. **Verifica los requerimientos:** [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md)

---

## 🎯 **Comandos Rápidos de Referencia**

```powershell
# Iniciar
docker-compose up -d --build

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health

# Ver usuarios
curl http://localhost:3000/accounts

# Hacer transferencia
curl -X POST http://localhost:3001/api/transfer `
  -H "Content-Type: application/json" `
  -d '{\"sender_id\":1,\"receiver_id\":2,\"amount\":50.00}'

# Detener
docker-compose down
```

---

## 💡 **Tips Útiles**

1. **Usa `make help`** para ver todos los comandos disponibles
2. **Los datos persisten** entre reinicios (a menos que uses `docker-compose down -v`)
3. **Puedes acceder a las bases de datos** con:
   ```powershell
   docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db
   docker exec -it neowallet-processor-db psql -U postgres -d processor_db
   ```
4. **Verifica la suma de dinero** en el sistema:
   ```sql
   SELECT SUM(balance) as total_money FROM users;
   ```

---

## 🎊 **¡Disfruta de NeoWallet!**

Si tienes algún problema, revisa:
- Los logs: `docker-compose logs`
- El checklist de requerimientos: [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md)
- La guía de troubleshooting arriba

**¡Todo está listo para que empieces a desarrollar!** 🚀

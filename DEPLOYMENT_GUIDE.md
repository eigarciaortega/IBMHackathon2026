# 🚀 Guía de Despliegue - NeoWallet

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Puertos disponibles: 80, 3000, 3001, 5432, 5433
- Node.js 20+ (solo para desarrollo local)

## 🐳 Despliegue con Docker Compose

### Paso 1: Verificar Configuración

```bash
# Verificar que Docker está corriendo
docker --version
docker-compose --version

# Verificar puertos disponibles (Windows PowerShell)
netstat -ano | findstr ":80 "
netstat -ano | findstr ":3000 "
netstat -ano | findstr ":3001 "
```

### Paso 2: Construir y Levantar Servicios

```bash
# Desde la raíz del proyecto
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de servicios
docker-compose ps
```

**Salida esperada:**
```
NAME                          STATUS    PORTS
neowallet_accounts_db         Up        0.0.0.0:5432->5432/tcp
neowallet_processor_db        Up        0.0.0.0:5433->5432/tcp
neowallet_accounts_service    Up        0.0.0.0:3000->3000/tcp
neowallet_processor_service   Up        0.0.0.0:3001->3001/tcp
neowallet_frontend            Up        0.0.0.0:80->80/tcp
```

### Paso 3: Verificar Health Checks

```bash
# Verificar Accounts Service
curl http://localhost:3000/health

# Verificar Processor Service
curl http://localhost:3001/health

# Verificar Frontend
curl http://localhost/
```

### Paso 4: Acceder a la Aplicación

Abrir en el navegador: **http://localhost**

## 🔧 Desarrollo Local (Sin Docker)

### Opción A: Backend en Docker, Frontend Local

```bash
# Terminal 1: Levantar solo backend
docker-compose up accounts_db processor_db accounts-service processor-service

# Terminal 2: Frontend en desarrollo
cd frontend
npm install
npm run dev
# Abre http://localhost:5173
```

### Opción B: Todo Local

```bash
# Terminal 1: Accounts DB
docker run -d -p 5432:5432 -e POSTGRES_DB=accounts_db -e POSTGRES_PASSWORD=postgres postgres:15-alpine

# Terminal 2: Processor DB
docker run -d -p 5433:5432 -e POSTGRES_DB=processor_db -e POSTGRES_PASSWORD=postgres postgres:15-alpine

# Terminal 3: Accounts Service
cd apps/accounts-service
npm install
npm run start:dev

# Terminal 4: Processor Service
cd apps/processor-service
npm install
npm run start:dev

# Terminal 5: Frontend
cd frontend
npm install
npm run dev
```

## 🐛 Troubleshooting

### Error: "Unable to connect to the server"

**Causa:** El frontend no puede conectarse a los servicios backend.

**Soluciones:**

1. **Verificar que los servicios backend estén corriendo:**
   ```bash
   docker-compose ps
   # Todos deben estar "Up"
   ```

2. **Verificar logs de servicios:**
   ```bash
   docker-compose logs accounts-service
   docker-compose logs processor-service
   ```

3. **Reiniciar servicios:**
   ```bash
   docker-compose restart accounts-service processor-service
   ```

4. **Verificar conectividad:**
   ```bash
   # Desde dentro del contenedor frontend
   docker exec neowallet_frontend wget -O- http://accounts-service:3000/health
   docker exec neowallet_frontend wget -O- http://processor-service:3001/health
   ```

5. **Verificar red Docker:**
   ```bash
   docker network ls
   docker network inspect neowallet_network
   ```

### Error: "Port already in use"

**Solución:**
```bash
# Windows PowerShell (como administrador)
# Encontrar proceso usando el puerto
netstat -ano | findstr ":80 "
netstat -ano | findstr ":3000 "

# Matar proceso (reemplazar PID)
taskkill /PID <PID> /F

# O cambiar puertos en docker-compose.yml
```

### Error: "Database connection failed"

**Solución:**
```bash
# Esperar a que las bases de datos estén listas
docker-compose logs accounts_db
docker-compose logs processor_db

# Verificar health checks
docker-compose ps

# Reiniciar servicios
docker-compose restart accounts-service processor-service
```

### Error: "Build failed" en Frontend

**Solución:**
```bash
cd frontend

# Limpiar y reinstalar
rm -rf node_modules package-lock.json dist
npm install

# Verificar build local
npm run build

# Reconstruir imagen Docker
docker-compose build frontend
```

### Frontend muestra página en blanco

**Solución:**
```bash
# Verificar logs de Nginx
docker-compose logs frontend

# Verificar que los archivos estén en el contenedor
docker exec neowallet_frontend ls -la /usr/share/nginx/html

# Reconstruir frontend
docker-compose up -d --build frontend
```

## 📊 Verificación Completa del Sistema

### Script de Verificación (PowerShell)

```powershell
# verificar-sistema.ps1

Write-Host "=== Verificando NeoWallet ===" -ForegroundColor Green

# 1. Verificar Docker
Write-Host "`n1. Docker Status:" -ForegroundColor Yellow
docker --version

# 2. Verificar servicios
Write-Host "`n2. Servicios Docker:" -ForegroundColor Yellow
docker-compose ps

# 3. Health checks
Write-Host "`n3. Health Checks:" -ForegroundColor Yellow

Write-Host "Accounts Service:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    Write-Host "✓ OK - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Processor Service:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "✓ OK - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Frontend:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing
    Write-Host "✓ OK - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Verificar red
Write-Host "`n4. Red Docker:" -ForegroundColor Yellow
docker network inspect neowallet_network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'

Write-Host "`n=== Verificación Completa ===" -ForegroundColor Green
Write-Host "Si todos los checks son ✓, el sistema está funcionando correctamente." -ForegroundColor Green
Write-Host "Accede a: http://localhost" -ForegroundColor Cyan
```

### Script de Verificación (Bash)

```bash
#!/bin/bash
# verificar-sistema.sh

echo "=== Verificando NeoWallet ==="

# 1. Verificar Docker
echo -e "\n1. Docker Status:"
docker --version

# 2. Verificar servicios
echo -e "\n2. Servicios Docker:"
docker-compose ps

# 3. Health checks
echo -e "\n3. Health Checks:"

echo "Accounts Service:"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAIL"
fi

echo "Processor Service:"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAIL"
fi

echo "Frontend:"
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAIL"
fi

# 4. Verificar red
echo -e "\n4. Red Docker:"
docker network inspect neowallet_network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'

echo -e "\n=== Verificación Completa ==="
echo "Si todos los checks son ✓, el sistema está funcionando correctamente."
echo "Accede a: http://localhost"
```

## 🔄 Comandos Útiles

### Gestión de Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Iniciar servicios específicos
docker-compose up -d accounts-service processor-service

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reiniciar un servicio
docker-compose restart frontend

# Ver logs
docker-compose logs -f frontend
docker-compose logs --tail=100 accounts-service

# Reconstruir un servicio
docker-compose up -d --build frontend
```

### Debugging

```bash
# Entrar a un contenedor
docker exec -it neowallet_frontend sh
docker exec -it neowallet_accounts_service sh

# Ver variables de entorno
docker exec neowallet_accounts_service env

# Ver archivos en frontend
docker exec neowallet_frontend ls -la /usr/share/nginx/html

# Verificar conectividad entre contenedores
docker exec neowallet_frontend ping accounts-service
docker exec neowallet_frontend wget -O- http://accounts-service:3000/health
```

### Limpieza

```bash
# Limpiar todo (cuidado: elimina datos)
docker-compose down -v
docker system prune -a

# Limpiar solo imágenes no usadas
docker image prune -a

# Limpiar volúmenes no usados
docker volume prune
```

## 📝 Checklist de Despliegue

- [ ] Docker y Docker Compose instalados
- [ ] Puertos 80, 3000, 3001, 5432, 5433 disponibles
- [ ] Clonar repositorio
- [ ] Ejecutar `docker-compose up -d --build`
- [ ] Esperar a que todos los servicios estén "Up"
- [ ] Verificar health checks
- [ ] Acceder a http://localhost
- [ ] Probar funcionalidades:
  - [ ] Seleccionar usuario
  - [ ] Ver saldo
  - [ ] Recargar saldo
  - [ ] Hacer transferencia
  - [ ] Ver historial
  - [ ] Cambiar tema

## 🆘 Soporte

Si los problemas persisten:

1. Revisar logs detallados:
   ```bash
   docker-compose logs > logs.txt
   ```

2. Verificar configuración de red:
   ```bash
   docker network inspect neowallet_network > network.txt
   ```

3. Verificar estado de contenedores:
   ```bash
   docker-compose ps > status.txt
   ```

4. Compartir archivos de log para análisis

## 🎯 Configuración de Producción

Para producción, considerar:

1. **Variables de entorno seguras**
2. **Certificados SSL/TLS**
3. **Reverse proxy (Nginx/Traefik)**
4. **Monitoreo y logging**
5. **Backups de bases de datos**
6. **Escalado horizontal**
7. **CI/CD pipeline**

---

**Última actualización:** 2026-06-23
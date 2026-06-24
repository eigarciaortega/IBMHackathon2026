# 🚀 Guía de Despliegue - NeoWallet

Esta guía proporciona instrucciones detalladas para desplegar NeoWallet en diferentes entornos.

---

## 📦 Prerequisitos

### Software Requerido
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (solo para desarrollo local sin Docker)
- PostgreSQL 15+ (solo para desarrollo local sin Docker)

### Puertos Requeridos
- `3000`: Accounts Service
- `3001`: Processor Service
- `5432`: PostgreSQL (Accounts DB)
- `5433`: PostgreSQL (Processor DB)

---

## 🐳 Despliegue con Docker (Recomendado)

### 1. Desarrollo Local

```bash
# Clonar el repositorio
git clone <repository-url>
cd neowallet

# Iniciar servicios
docker-compose up -d --build

# Verificar que todo esté corriendo
docker-compose ps
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### 2. Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f accounts-service
docker-compose logs -f processor-service
```

### 3. Detener Servicios

```bash
# Detener sin eliminar datos
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener y eliminar todo (incluye volúmenes)
docker-compose down -v
```

---

## 💻 Despliegue Local (Sin Docker)

### 1. Configurar Bases de Datos

```bash
# Instalar PostgreSQL
# En macOS: brew install postgresql
# En Ubuntu: sudo apt install postgresql

# Crear bases de datos
psql -U postgres
CREATE DATABASE accounts_db;
CREATE DATABASE processor_db;
\q

# Ejecutar scripts de inicialización
psql -U postgres -d accounts_db < accounts-service/init-scripts/01-init.sql
psql -U postgres -d processor_db < processor-service/init-scripts/01-init.sql
```

### 2. Instalar Dependencias

```bash
# Accounts Service
cd accounts-service
npm install
cd ..

# Processor Service
cd processor-service
npm install
cd ..
```

### 3. Configurar Variables de Entorno

```bash
# Accounts Service
cp accounts-service/.env.example accounts-service/.env
# Editar .env con las credenciales de tu BD local

# Processor Service
cp processor-service/.env.example processor-service/.env
# Editar .env con las credenciales de tu BD local
```

### 4. Iniciar Servicios

```bash
# Terminal 1: Accounts Service
cd accounts-service
npm start

# Terminal 2: Processor Service
cd processor-service
npm start
```

---

## ☁️ Despliegue en Producción

### Consideraciones de Seguridad

1. **Variables de Entorno**
```bash
# Usar variables de entorno seguras
export DB_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)
```

2. **HTTPS**
- Configurar un proxy inverso (Nginx, Traefik)
- Usar certificados SSL/TLS (Let's Encrypt)

3. **Bases de Datos**
- Usar bases de datos gestionadas (AWS RDS, Google Cloud SQL)
- Configurar backups automáticos
- Habilitar replicación

### Ejemplo con AWS ECS

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  accounts-service:
    image: your-registry/neowallet-accounts:latest
    environment:
      NODE_ENV: production
      DB_HOST: your-rds-endpoint.amazonaws.com
      DB_PASSWORD: ${DB_PASSWORD}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M

  processor-service:
    image: your-registry/neowallet-processor:latest
    environment:
      NODE_ENV: production
      DB_HOST: your-rds-endpoint.amazonaws.com
      DB_PASSWORD: ${DB_PASSWORD}
    deploy:
      replicas: 3
```

### Ejemplo con Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: accounts-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: accounts-service
  template:
    metadata:
      labels:
        app: accounts-service
    spec:
      containers:
      - name: accounts-service
        image: your-registry/neowallet-accounts:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "500m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 🔧 Configuración Avanzada

### Load Balancer (Nginx)

```nginx
upstream accounts_service {
    server accounts-service-1:3000;
    server accounts-service-2:3000;
    server accounts-service-3:3000;
}

upstream processor_service {
    server processor-service-1:3001;
    server processor-service-2:3001;
    server processor-service-3:3001;
}

server {
    listen 80;
    server_name api.neowallet.com;

    location /accounts {
        proxy_pass http://accounts_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/transfer {
        proxy_pass http://processor_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Monitoreo (Prometheus)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'accounts-service'
    static_configs:
      - targets: ['accounts-service:3000']

  - job_name: 'processor-service'
    static_configs:
      - targets: ['processor-service:3001']
```

---

## 🔍 Verificación Post-Despliegue

### Checklist de Verificación

```bash
# 1. Health Checks
curl https://api.neowallet.com/accounts/health
curl https://api.neowallet.com/api/health

# 2. Prueba de Consulta
curl https://api.neowallet.com/accounts/1

# 3. Prueba de Recarga
curl -X POST https://api.neowallet.com/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"amount":100,"payment_method":"test"}'

# 4. Prueba de Transferencia
curl -X POST https://api.neowallet.com/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id":1,"receiver_id":2,"amount":50}'

# 5. Verificar Logs
docker-compose logs --tail=100

# 6. Verificar Recursos
docker stats
```

---

## 📊 Métricas y Monitoreo

### Métricas Clave

1. **Disponibilidad**
   - Uptime de servicios
   - Health check success rate

2. **Performance**
   - Latencia de endpoints (p50, p95, p99)
   - Throughput (requests/sec)

3. **Errores**
   - Error rate (4xx, 5xx)
   - Failed transactions

4. **Base de Datos**
   - Connection pool utilization
   - Query duration
   - Transaction rollback rate

---

## 🐛 Troubleshooting

### Problema: Servicios no inician

```bash
# Ver logs detallados
docker-compose logs

# Verificar puertos
netstat -an | grep LISTEN

# Reiniciar desde cero
docker-compose down -v
docker-compose up --build
```

### Problema: Error de conexión a BD

```bash
# Verificar que la BD esté corriendo
docker-compose ps

# Conectarse manualmente
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Verificar variables de entorno
docker-compose config
```

### Problema: Servicios no se comunican

```bash
# Verificar red
docker network ls
docker network inspect neowallet_neowallet-network

# Verificar DNS interno
docker exec accounts-service ping processor-service
```

---

## 🔄 Actualización y Rollback

### Actualizar Servicios

```bash
# Pull nuevas imágenes
docker-compose pull

# Recrear servicios
docker-compose up -d --no-deps accounts-service
docker-compose up -d --no-deps processor-service
```

### Rollback

```bash
# Volver a versión anterior
docker-compose down
git checkout <previous-commit>
docker-compose up -d --build
```

---

## 📝 Backup y Restauración

### Backup de Bases de Datos

```bash
# Backup
docker exec neowallet-accounts-db pg_dump -U postgres accounts_db > accounts_backup.sql
docker exec neowallet-processor-db pg_dump -U postgres processor_db > processor_backup.sql

# Restauración
docker exec -i neowallet-accounts-db psql -U postgres -d accounts_db < accounts_backup.sql
docker exec -i neowallet-processor-db psql -U postgres -d processor_db < processor_backup.sql
```

---

## 🎯 Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] HTTPS habilitado
- [ ] Bases de datos gestionadas
- [ ] Backups automáticos configurados
- [ ] Monitoreo activo
- [ ] Logging centralizado
- [ ] Rate limiting configurado
- [ ] Health checks funcionando
- [ ] Documentación actualizada
- [ ] Tests pasando
- [ ] Alertas configuradas

# Docker Deployment Guide

## Architecture Overview

This project uses Docker containers to run all microservices and the PostgreSQL database in an isolated, reproducible environment.

## Container Structure

```mermaid
graph TB
    subgraph Docker Network: meeting-rooms-network
        US[User Service Container<br/>Port 8001]
        RS[Room Service Container<br/>Port 8002]
        RES[Reservation Service Container<br/>Port 8003]
        DB[(PostgreSQL Container<br/>Port 5432)]
    end
    
    Client[External Clients] -->|8001| US
    Client -->|8002| RS
    Client -->|8003| RES
    
    US -->|Internal Network| DB
    RS -->|Internal Network| DB
    RES -->|Internal Network| DB
```

## Docker Files Structure

```
back/
├── docker-compose.yml              # Orchestrates all services
├── .dockerignore                   # Exclude unnecessary files
├── database/
│   ├── init.sql                    # Database initialization
│   └── Dockerfile                  # PostgreSQL with init script
├── user-service/
│   ├── Dockerfile                  # User service container
│   ├── requirements.txt
│   ├── main.py
│   └── ...
├── room-service/
│   ├── Dockerfile                  # Room service container
│   ├── requirements.txt
│   ├── main.py
│   └── ...
└── reservation-service/
    ├── Dockerfile                  # Reservation service container
    ├── requirements.txt
    ├── main.py
    └── ...
```

## Dockerfile Templates

### User Service Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Room Service Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
```

### Reservation Service Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
```

## Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: meeting-rooms-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: meeting_rooms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - meeting-rooms-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  user-service:
    build:
      context: ./user-service
      dockerfile: Dockerfile
    container_name: user-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/meeting_rooms
      JWT_SECRET_KEY: your-secret-key-change-in-production
      JWT_ALGORITHM: HS256
      JWT_EXPIRATION_MINUTES: 30
    ports:
      - "8001:8001"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - meeting-rooms-network
    restart: unless-stopped

  room-service:
    build:
      context: ./room-service
      dockerfile: Dockerfile
    container_name: room-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/meeting_rooms
    ports:
      - "8002:8002"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - meeting-rooms-network
    restart: unless-stopped

  reservation-service:
    build:
      context: ./reservation-service
      dockerfile: Dockerfile
    container_name: reservation-service
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/meeting_rooms
      JWT_SECRET_KEY: your-secret-key-change-in-production
      JWT_ALGORITHM: HS256
    ports:
      - "8003:8003"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - meeting-rooms-network
    restart: unless-stopped

networks:
  meeting-rooms-network:
    driver: bridge

volumes:
  postgres_data:
```

## .dockerignore File

```
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv
.env
.git
.gitignore
*.md
.DS_Store
.vscode/
*.log
```

## Deployment Commands

### 1. Build and Start All Services
```bash
docker-compose up --build
```

### 2. Start Services in Background
```bash
docker-compose up -d
```

### 3. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service
docker-compose logs -f room-service
docker-compose logs -f reservation-service
docker-compose logs -f postgres
```

### 4. Stop All Services
```bash
docker-compose down
```

### 5. Stop and Remove Volumes (Clean Slate)
```bash
docker-compose down -v
```

### 6. Rebuild Specific Service
```bash
docker-compose up --build user-service
```

### 7. Execute Commands in Container
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d meeting_rooms

# Access service shell
docker-compose exec user-service /bin/bash
```

## Environment Variables

Each service uses environment variables for configuration. In production, use Docker secrets or external configuration management.

### User Service Environment
```env
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/meeting_rooms
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
```

### Room Service Environment
```env
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/meeting_rooms
```

### Reservation Service Environment
```env
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/meeting_rooms
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
```

## Health Checks

### Check Service Status
```bash
docker-compose ps
```

### Test Endpoints
```bash
# User Service
curl http://localhost:8001/docs

# Room Service
curl http://localhost:8002/docs

# Reservation Service
curl http://localhost:8003/docs
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Rebuild without cache
docker-compose build --no-cache service-name
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d meeting_rooms -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :8001

# Linux/Mac
lsof -i :8001

# Change port in docker-compose.yml
ports:
  - "8011:8001"  # External:Internal
```

## Production Considerations

### 1. Security
- Change default passwords
- Use Docker secrets for sensitive data
- Implement network policies
- Enable SSL/TLS

### 2. Performance
- Use multi-stage builds to reduce image size
- Implement connection pooling
- Add resource limits

```yaml
services:
  user-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 3. Monitoring
- Add health check endpoints
- Implement logging aggregation
- Use container monitoring tools

### 4. Backup
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres meeting_rooms > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres meeting_rooms < backup.sql
```

## Development vs Production

### Development (docker-compose.yml)
- Volume mounts for hot reload
- Debug mode enabled
- Exposed ports for direct access

### Production (docker-compose.prod.yml)
- No volume mounts
- Production-grade secrets
- Reverse proxy (nginx)
- SSL certificates
- Resource limits
- Restart policies

## Quick Start Guide

1. **Clone and Navigate**
   ```bash
   cd back/
   ```

2. **Start Everything**
   ```bash
   docker-compose up --build
   ```

3. **Wait for Services**
   - User Service: http://localhost:8001/docs
   - Room Service: http://localhost:8002/docs
   - Reservation Service: http://localhost:8003/docs

4. **Test the System**
   ```bash
   # Register user
   curl -X POST http://localhost:8001/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Test","correo":"test@test.com","contrasena":"test123"}'
   ```

5. **Stop Everything**
   ```bash
   docker-compose down
   ```

## Benefits of Docker Deployment

✅ **Consistency** - Same environment everywhere
✅ **Isolation** - Services don't interfere with each other
✅ **Portability** - Run anywhere Docker runs
✅ **Scalability** - Easy to scale services independently
✅ **Easy Setup** - One command to start everything
✅ **Clean Teardown** - Remove everything cleanly
✅ **Version Control** - Infrastructure as code
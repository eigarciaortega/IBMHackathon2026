# 🚀 Guía de Inicio Rápido

## Paso 1: Iniciar el Sistema

```bash
# Desde el directorio back/
docker-compose up --build
```

Espera a ver estos mensajes:
```
✅ User Service: Database connection successful
✅ Room Service: Database connection successful
✅ Reservation Service: Database connection successful
```

## Paso 2: Acceder a la Documentación

Abre tu navegador en:
- **User Service**: http://localhost:8001/docs
- **Room Service**: http://localhost:8002/docs
- **Reservation Service**: http://localhost:8003/docs

## Paso 3: Probar el Sistema

### 3.1 Registrar un Usuario

```bash
curl -X POST http://localhost:8001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "contrasena": "password123"
  }'
```

### 3.2 Hacer Login

```bash
curl -X POST http://localhost:8001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "juan@example.com",
    "contrasena": "password123"
  }'
```

**Guarda el `access_token` de la respuesta!**

### 3.3 Crear una Sala

```bash
curl -X POST http://localhost:8002/api/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Sala de Juntas A",
    "tipo": "sala",
    "recursos": ["computadora", "proyector", "aire_condicionado"],
    "capacidad": 12
  }'
```

**Guarda el `id` de la sala!**

### 3.4 Listar Salas

```bash
curl http://localhost:8002/api/rooms
```

### 3.5 Crear una Reservación

```bash
curl -X POST http://localhost:8003/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "sala_id": "PEGA_AQUI_EL_ID_DE_LA_SALA",
    "usuario_id": "PEGA_AQUI_EL_ID_DEL_USUARIO",
    "fecha_inicio": "2026-06-25T10:00:00",
    "fecha_fin": "2026-06-25T12:00:00",
    "cantidad_personas": 8
  }'
```

### 3.6 Listar Reservaciones

```bash
curl http://localhost:8003/api/reservations
```

### 3.7 Cancelar Reservación

```bash
curl -X DELETE http://localhost:8003/api/reservations/ID_DE_LA_RESERVACION
```

## 🎯 Usando la Interfaz Web (Swagger UI)

1. Ve a http://localhost:8001/docs
2. Haz clic en "POST /api/users/register"
3. Haz clic en "Try it out"
4. Completa los datos y haz clic en "Execute"
5. Repite para los demás endpoints

## 🛑 Detener el Sistema

```bash
# Detener servicios
docker-compose down

# Detener y eliminar datos (limpieza completa)
docker-compose down -v
```

## 📊 Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f user-service
```

## ✅ Verificar Estado

```bash
docker-compose ps
```

## 🔧 Solución Rápida de Problemas

### Error: Puerto ya en uso
```bash
# Windows
netstat -ano | findstr :8001

# Cambiar puerto en docker-compose.yml
ports:
  - "8011:8001"  # Usa 8011 en lugar de 8001
```

### Error: Base de datos no conecta
```bash
# Reiniciar servicios
docker-compose restart

# Ver logs de PostgreSQL
docker-compose logs postgres
```

### Empezar de cero
```bash
docker-compose down -v
docker-compose up --build
```

## 📝 Notas Importantes

- Los tokens JWT expiran en 30 minutos
- Las contraseñas se hashean automáticamente
- El estado de las salas se actualiza automáticamente
- Todas las validaciones se ejecutan antes de crear reservaciones

## 🎓 Próximos Pasos

1. Lee `README.md` para documentación completa
2. Revisa `API_SPECIFICATION.md` para detalles de endpoints
3. Consulta `ARCHITECTURE.md` para entender el diseño
4. Explora `DOCKER_DEPLOYMENT.md` para opciones avanzadas

## 💡 Tips

- Usa Postman o Thunder Client para pruebas más fáciles
- La documentación Swagger es interactiva
- Puedes importar las colecciones de API
- Los logs son tu mejor amigo para debugging
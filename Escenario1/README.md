# Sistema de Reservas de Salas de Reunión 🏢

Sistema completo de gestión de reservas de salas de reunión y escritorios con arquitectura de microservicios, sistema de roles y frontend React.

## 🌟 Características Principales

### Sistema de Roles
- **Administrador**: Gestión completa de espacios (CRUD)
- **Colaborador**: Búsqueda y reserva de espacios

### Funcionalidades
- ✅ Autenticación JWT con roles
- ✅ CRUD de salas (solo administradores)
- ✅ Búsqueda y filtrado de espacios
- ✅ Creación y gestión de reservas
- ✅ Dashboard administrativo
- ✅ Interfaz responsive y moderna

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker y Docker Compose
- Puertos disponibles: 80, 5432, 8001, 8002, 8003

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd back

# Iniciar todos los servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

### Acceso
Abre tu navegador en: **http://localhost**

## 👥 Usuarios de Prueba

### Administrador
- **Email**: admin@corporativoalpha.com
- **Password**: Admin123
- **Permisos**: Gestión completa de espacios

### Colaboradores
- **Email**: carlos.mendez@corporativoalpha.com
- **Password**: User123
- **Permisos**: Búsqueda y reservas

- **Email**: ana.torres@corporativoalpha.com
- **Password**: User123
- **Permisos**: Búsqueda y reservas

## 🏗️ Arquitectura

### Microservicios

```
┌─────────────────┐
│    Frontend     │  Puerto 80 (Nginx)
│   React + Vite  │
└────────┬────────┘
         │
    ┌────┴────┐
    │  Nginx  │ (Proxy reverso)
    └────┬────┘
         │
    ┌────┴────────────────────────┐
    │                             │
┌───▼────┐  ┌──────────┐  ┌──────▼──────┐
│  User  │  │   Room   │  │ Reservation │
│Service │  │ Service  │  │   Service   │
│ :8001  │  │  :8002   │  │    :8003    │
└───┬────┘  └────┬─────┘  └──────┬──────┘
    │            │                │
    └────────────┴────────────────┘
                 │
         ┌───────▼────────┐
         │   PostgreSQL   │
         │     :5432      │
         └────────────────┘
```

### Servicios

1. **Frontend** (Puerto 80)
   - React 18 + Vite
   - Nginx como servidor web
   - Proxy reverso a servicios backend

2. **User Service** (Puerto 8001)
   - Autenticación y gestión de usuarios
   - Generación de tokens JWT con roles

3. **Room Service** (Puerto 8002)
   - CRUD de salas (protegido por rol)
   - Búsqueda y filtrado

4. **Reservation Service** (Puerto 8003)
   - Gestión de reservas
   - Validaciones de disponibilidad
   - Filtrado por usuario

5. **PostgreSQL** (Puerto 5432)
   - Base de datos relacional
   - Datos de prueba pre-cargados

## 📁 Estructura del Proyecto

```
back/
├── database/
│   ├── connection.py       # Conexión a BD
│   ├── auth_utils.py       # Utilidades de autenticación
│   └── init.sql            # Script de inicialización
├── user-service/
│   ├── main.py             # API de usuarios
│   ├── models.py           # Modelos SQLAlchemy
│   ├── schemas.py          # Schemas Pydantic
│   ├── auth.py             # Autenticación JWT
│   └── Dockerfile
├── room-service/
│   ├── main.py             # API de salas
│   ├── models.py
│   ├── schemas.py
│   └── Dockerfile
├── reservation-service/
│   ├── main.py             # API de reservas
│   ├── models.py
│   ├── schemas.py
│   ├── validators.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/          # Páginas React
│   │   ├── services/       # Cliente API
│   │   └── styles/         # Estilos CSS
│   ├── nginx.conf          # Configuración Nginx
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔒 Seguridad

- Autenticación JWT con expiración
- Roles de usuario (Admin/Colaborador)
- Endpoints protegidos por rol
- Validación de permisos en cada operación
- CORS configurado
- Headers de seguridad en Nginx

## 📊 API Endpoints

### User Service (8001)
- `POST /api/users/register` - Registrar usuario
- `POST /api/users/login` - Iniciar sesión
- `GET /api/users/me` - Usuario actual

### Room Service (8002)
- `GET /api/rooms` - Listar salas
- `GET /api/rooms/{id}` - Obtener sala
- `POST /api/rooms` - Crear sala (Admin)
- `PUT /api/rooms/{id}` - Actualizar sala (Admin)
- `DELETE /api/rooms/{id}` - Eliminar sala (Admin)

### Reservation Service (8003)
- `GET /api/reservations` - Mis reservas
- `GET /api/reservations/{id}` - Obtener reserva
- `POST /api/reservations` - Crear reserva
- `DELETE /api/reservations/{id}` - Cancelar reserva

## 🛠️ Comandos Útiles

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f [service-name]

# Detener servicios
docker-compose down

# Reconstruir servicios
docker-compose up -d --build

# Limpiar todo (incluyendo volúmenes)
docker-compose down -v

# Ver estado de contenedores
docker-compose ps
```

## 🧪 Desarrollo

### Backend
Cada servicio tiene hot-reload configurado con volúmenes en docker-compose.yml

### Frontend
Para desarrollo local del frontend:

```bash
cd frontend
npm install
npm run dev
```

Accede en: http://localhost:3000

## 📚 Documentación Adicional

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Guía detallada de despliegue
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura del sistema
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - Especificación de APIs
- [frontend/README.md](frontend/README.md) - Documentación del frontend

## 🐛 Solución de Problemas

### Error: Puerto en uso
```bash
# Verificar qué está usando el puerto
netstat -ano | findstr :80
# Detener el proceso o cambiar el puerto en docker-compose.yml
```

### Error: Base de datos no conecta
```bash
# Ver logs de PostgreSQL
docker logs meeting-rooms-db

# Reiniciar servicios
docker-compose restart
```

### Frontend no carga
```bash
# Verificar que todos los servicios estén corriendo
docker-compose ps

# Reconstruir frontend
docker-compose up -d --build frontend
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es parte de un hackathon y está disponible para uso educativo.

## 👨‍💻 Autor

Desarrollado con ❤️ por Bob

---

**¿Necesitas ayuda?** Revisa la [Guía de Despliegue](DEPLOYMENT_GUIDE.md) o abre un issue.
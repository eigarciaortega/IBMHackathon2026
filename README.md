# BeeSpace - Sistema de Gestión Híbrida Inteligente

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

Sistema de gestión de espacios de trabajo híbridos para Corporativo Alpha. Permite reservar salas de juntas y escritorios ("Hot Desks") de manera eficiente, evitando conflictos y optimizando el uso de espacios.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Rápida](#-instalación-rápida)
- [Credenciales de Prueba](#-credenciales-de-prueba)
- [Documentación de API](#-documentación-de-api)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Guía de Usuario](#-guía-de-usuario)
- [Pruebas](#-pruebas)
- [Solución de Problemas](#-solución-de-problemas)

---

## ✨ Características Principales

### Para Colaboradores
- 🔐 **Autenticación segura** con JWT
- 🔍 **Búsqueda avanzada** de espacios con múltiples filtros
- 📅 **Reservas inteligentes** con validación de disponibilidad
- 📋 **Gestión de reservas** personales
- ⚠️ **Validaciones en tiempo real** para evitar conflictos

### Para Administradores
- 🏗️ **Gestión completa** de espacios (CRUD)
- 📊 **Dashboard de ocupación** en tiempo real
- 📈 **Estadísticas** de uso de espacios
- 🔧 **Control total** sobre el catálogo

### Validaciones Críticas
- ✅ **Sin solapamientos**: Previene reservas duplicadas
- ✅ **Capacidad controlada**: Valida número de asistentes
- ✅ **Rango temporal válido**: Hora de fin > hora de inicio
- ✅ **Sin reservas pasadas**: Solo permite fechas futuras
- ✅ **Control de acceso**: Autenticación y autorización por roles

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Navegador)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                         │
│                   Puerto: 5173                               │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  CATALOG SERVICE     │   │    BOOKING SERVICE               │
│  (Gestión Espacios)  │   │  (Reservas + Autenticación)      │
│    Puerto: 3001      │   │       Puerto: 3002               │
│                      │   │                                  │
│  • CRUD Espacios     │   │  • Login (JWT)                   │
│  • Dashboard Admin   │   │  • CRUD Reservas                 │
│  • Filtros           │   │  • Validaciones                  │
└──────────┬───────────┘   └──────────┬───────────────────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
           ┌────────────────────────┐
           │   PostgreSQL 15        │
           │   Puerto: 5432         │
           │                        │
           │  • users               │
           │  • spaces              │
           │  • bookings            │
           └────────────────────────┘
```

### Decisiones Arquitectónicas

**Microservicios con Base de Datos Compartida**

✅ **Ventajas**:
- Transacciones más simples
- Menor complejidad de configuración
- Tiempo de desarrollo reducido
- Facilita el debugging

📚 **Aprendizaje**:
- Separación de responsabilidades
- Comunicación entre servicios vía HTTP
- Despliegue independiente
- Escalabilidad horizontal

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Docker Desktop** 20.10+ ([Descargar](https://www.docker.com/products/docker-desktop))
- **Docker Compose** 2.0+ (incluido con Docker Desktop)
- **Git** ([Descargar](https://git-scm.com/downloads))
- **Node.js** 20.x LTS (opcional, solo para desarrollo local)

### Verificar Instalación

```bash
docker --version
# Docker version 20.10.x o superior

docker-compose --version
# Docker Compose version 2.x.x o superior

git --version
# git version 2.x.x o superior
```

---

## 🚀 Instalación Rápida

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/officespace-starter-2026.git
cd officespace-starter-2026

# 2. Levantar todos los servicios
docker-compose up --build

# 3. Esperar a que todos los servicios estén listos (2-3 minutos)
# Verás mensajes como:
# ✓ Database initialized
# ✓ Catalog Service running on port 3001
# ✓ Booking Service running on port 3002
# ✓ Frontend running on port 5173
```

### Opción 2: Desarrollo Local (Sin Docker)

```bash
# 1. Instalar PostgreSQL 15 localmente
# 2. Crear base de datos
createdb officespace

# 3. Inicializar esquema
psql -d officespace -f shared-infra/init-db.sql

# 4. Instalar dependencias de cada servicio
cd catalog-service && npm install
cd ../booking-service && npm install
cd ../frontend && npm install

# 5. Configurar variables de entorno
cp catalog-service/.env.example catalog-service/.env
cp booking-service/.env.example booking-service/.env
# Editar archivos .env con tus credenciales

# 6. Iniciar servicios (en terminales separadas)
cd catalog-service && npm run dev
cd booking-service && npm run dev
cd frontend && npm run dev
```

---

## 🔑 Credenciales de Prueba

### Usuario Administrador

```
Email: admin@corporativoalpha.com
Contraseña: Admin123
Rol: ADMINISTRADOR
```

**Permisos**:
- ✅ Crear, editar y eliminar espacios
- ✅ Ver dashboard de ocupación
- ✅ Todas las funciones de colaborador

### Usuarios Colaboradores

**Usuario 1:**
```
Email: carlos.mendez@corporativoalpha.com
Contraseña: User123
Rol: COLABORADOR
```

**Usuario 2:**
```
Email: ana.torres@corporativoalpha.com
Contraseña: User123
Rol: COLABORADOR
```

**Permisos**:
- ✅ Buscar espacios disponibles
- ✅ Crear reservas
- ✅ Ver y cancelar sus propias reservas
- ❌ Gestionar espacios (solo admin)

---

## 📚 Documentación de API

### Acceso a Swagger UI

Una vez que los servicios estén corriendo:

- **Catalog Service**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **Booking Service**: [http://localhost:3002/api-docs](http://localhost:3002/api-docs)

### Endpoints Principales

#### Servicio de Catálogo (Puerto 3001)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/spaces` | Listar espacios | Opcional |
| GET | `/api/spaces/:id` | Detalles de espacio | Opcional |
| POST | `/api/spaces` | Crear espacio | Admin |
| PUT | `/api/spaces/:id` | Actualizar espacio | Admin |
| DELETE | `/api/spaces/:id` | Eliminar espacio | Admin |
| GET | `/api/spaces/dashboard` | Dashboard ocupación | Admin |

#### Servicio de Reservas (Puerto 3002)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/bookings` | Crear reserva | Sí |
| GET | `/api/bookings/my-bookings` | Mis reservas | Sí |
| GET | `/api/bookings/:id` | Detalles de reserva | Sí |
| DELETE | `/api/bookings/:id` | Cancelar reserva | Sí |
| GET | `/api/bookings/check-availability` | Verificar disponibilidad | Opcional |

### Ejemplo de Uso con cURL

```bash
# 1. Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos.mendez@corporativoalpha.com",
    "password": "User123"
  }'

# Respuesta: { "token": "eyJhbGc...", "user": {...} }

# 2. Crear reserva
curl -X POST http://localhost:3002/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "space_id": 1,
    "start_time": "2026-06-23T09:00:00Z",
    "end_time": "2026-06-23T11:00:00Z",
    "attendees": 6
  }'
```

---

## 📁 Estructura del Proyecto

```
officespace-starter-2026/
│
├── catalog-service/              # Microservicio de Catálogo
│   ├── src/
│   │   ├── controllers/         # Controladores de rutas
│   │   ├── models/              # Modelos de datos
│   │   ├── routes/              # Definición de rutas
│   │   ├── services/            # Lógica de negocio
│   │   ├── config/              # Configuración (DB, Swagger)
│   │   ├── middleware/          # Middleware de autenticación
│   │   └── server.js            # Punto de entrada
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
│
├── booking-service/              # Microservicio de Reservas
│   ├── src/
│   │   ├── controllers/         # Controladores (auth, bookings)
│   │   ├── models/              # Modelos (users, bookings)
│   │   ├── routes/              # Rutas de API
│   │   ├── services/            # Lógica de negocio
│   │   ├── validators/          # Validaciones críticas
│   │   ├── config/              # Configuración (DB, JWT, Swagger)
│   │   ├── middleware/          # Auth y manejo de errores
│   │   └── server.js            # Punto de entrada
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
│
├── frontend/                     # Aplicación React
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   ├── pages/               # Páginas principales
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── ConfirmationPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   └── MyBookingsPage.jsx
│   │   ├── services/            # Clientes de API
│   │   ├── context/             # Context API (Auth)
│   │   ├── utils/               # Utilidades
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
│
├── shared-infra/                 # Infraestructura compartida
│   ├── init-db.sql              # Script de inicialización DB
│   └── scripts/
│       └── seed-data.sql        # Datos de prueba
│
├── docs/                         # Documentación
│   ├── ARCHITECTURE.md          # Arquitectura del sistema
│   ├── API_CONTRACT.md          # Contrato de API
│   └── ESCENARIOS_PRUEBA.md     # Escenarios de prueba
│
├── docker-compose.yml            # Orquestación de contenedores
├── .gitignore
├── IMPLEMENTATION_PLAN.md        # Plan de implementación
└── README.md                     # Este archivo
```

---

## 🛠️ Tecnologías Utilizadas

### Backend

- **Node.js 20.x LTS**: Runtime de JavaScript
- **Express.js 4.18**: Framework web minimalista
- **PostgreSQL 15**: Base de datos relacional
- **pg**: Cliente de PostgreSQL para Node.js
- **jsonwebtoken**: Autenticación JWT
- **bcryptjs**: Hash de contraseñas
- **joi**: Validación de esquemas
- **swagger-jsdoc**: Generación de documentación
- **swagger-ui-express**: Interfaz de Swagger

### Frontend

- **React 18**: Biblioteca de UI
- **Vite**: Build tool y dev server
- **React Router DOM 6**: Enrutamiento
- **Axios**: Cliente HTTP
- **date-fns**: Manipulación de fechas

### DevOps

- **Docker**: Contenedorización
- **Docker Compose**: Orquestación multi-contenedor

---

## 👥 Guía de Usuario

### Para Colaboradores

#### 1. Iniciar Sesión

1. Abre [http://localhost:5173](http://localhost:5173)
2. Ingresa tu email y contraseña
3. Haz clic en "Iniciar Sesión"

#### 2. Buscar Espacios

1. Selecciona fecha y rango horario
2. (Opcional) Aplica filtros:
   - Tipo de espacio (Sala/Escritorio)
   - Capacidad mínima
   - Piso
   - Recursos (proyector, AC)
3. Haz clic en "Buscar"
4. Revisa los resultados disponibles

#### 3. Crear Reserva

1. En los resultados, haz clic en "Reservar"
2. Verifica los detalles del espacio
3. Ingresa el número de asistentes
4. Haz clic en "Confirmar Reserva"
5. Recibirás una confirmación

#### 4. Gestionar Mis Reservas

1. Ve a "Mis Reservas" en el menú
2. Visualiza todas tus reservas
3. Para cancelar: haz clic en "Cancelar" (solo futuras)

### Para Administradores

#### 1. Acceder al Panel de Administración

1. Inicia sesión con credenciales de admin
2. Serás redirigido automáticamente al panel

#### 2. Ver Dashboard

- **Total de espacios**: Cantidad total registrada
- **Ocupación actual**: Espacios en uso hoy
- **Tasa de ocupación**: Porcentaje de uso
- **Lista detallada**: Estado de cada espacio

#### 3. Crear Nuevo Espacio

1. Haz clic en "Crear Nuevo Espacio"
2. Completa el formulario:
   - Nombre del espacio
   - Tipo (Sala/Escritorio)
   - Capacidad
   - Piso
   - Recursos disponibles
3. Haz clic en "Guardar"

#### 4. Editar Espacio

1. En la lista de espacios, haz clic en "Editar"
2. Modifica los campos necesarios
3. Haz clic en "Actualizar"

#### 5. Eliminar Espacio

1. Haz clic en "Eliminar"
2. Confirma la acción
3. **Nota**: No se pueden eliminar espacios con reservas activas

---

## 🧪 Pruebas

### Pruebas Manuales

Consulta [`docs/ESCENARIOS_PRUEBA.md`](docs/ESCENARIOS_PRUEBA.md) para 31 escenarios de prueba detallados.

### Casos de Prueba Críticos

#### 1. Validación de Solapamiento

```bash
# Crear primera reserva
curl -X POST http://localhost:3002/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -d '{"space_id": 1, "start_time": "2026-06-23T09:00:00Z", "end_time": "2026-06-23T10:00:00Z", "attendees": 4}'

# Intentar reserva solapada (debe fallar con 409)
curl -X POST http://localhost:3002/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -d '{"space_id": 1, "start_time": "2026-06-23T09:30:00Z", "end_time": "2026-06-23T10:30:00Z", "attendees": 4}'
```

#### 2. Validación de Capacidad

```bash
# Intentar reservar con más asistentes que la capacidad (debe fallar con 400)
curl -X POST http://localhost:3002/api/bookings \
  -H "Authorization: Bearer TOKEN" \
  -d '{"space_id": 1, "start_time": "2026-06-23T14:00:00Z", "end_time": "2026-06-23T15:00:00Z", "attendees": 20}'
```

### Colección de Postman

Importa la colección desde `docs/OfficeSpace.postman_collection.json` (se creará en la implementación).

---

## 🐛 Solución de Problemas

### Problema: Los contenedores no inician

```bash
# Verificar que los puertos no estén en uso
netstat -ano | findstr :3001
netstat -ano | findstr :3002
netstat -ano | findstr :5173
netstat -ano | findstr :5432

# Detener servicios existentes
docker-compose down

# Limpiar volúmenes y reiniciar
docker-compose down -v
docker-compose up --build
```

### Problema: Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres

# Reiniciar solo el servicio de base de datos
docker-compose restart postgres
```

### Problema: Frontend no se conecta a los servicios

1. Verifica que las variables de entorno estén correctas en `frontend/.env`
2. Asegúrate de que los servicios backend estén corriendo
3. Revisa la consola del navegador para errores CORS

### Problema: Token JWT inválido

```bash
# Verificar que JWT_SECRET sea el mismo en ambos servicios
# catalog-service/.env
# booking-service/.env

# Debe ser: JWT_SECRET=your-secret-key-change-in-production
```

### Logs de Depuración

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f catalog-service
docker-compose logs -f booking-service
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## 📊 Base de Datos

### Esquema

```sql
-- Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COLABORADOR')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Espacios
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('SALA', 'DESK')),
    capacity INTEGER NOT NULL,
    floor VARCHAR(50),
    has_projector BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservas
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    attendees INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_attendees CHECK (attendees > 0)
);
```

### Datos de Prueba

El script `shared-infra/init-db.sql` incluye:
- 3 usuarios (1 admin, 2 colaboradores)
- 4 espacios (2 salas, 2 escritorios)
- Índices para optimización de consultas

---

## 🚀 Despliegue en Producción

### Consideraciones

1. **Cambiar JWT_SECRET**: Usar un valor seguro y aleatorio
2. **Configurar CORS**: Restringir orígenes permitidos
3. **HTTPS**: Usar certificados SSL/TLS
4. **Variables de entorno**: No commitear archivos `.env`
5. **Base de datos**: Configurar backups automáticos
6. **Monitoreo**: Implementar logs centralizados

### Ejemplo con Docker Compose (Producción)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always

  catalog-service:
    build: ./catalog-service
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    restart: always

  # ... otros servicios
```

---

## 📝 Licencia

Este proyecto es parte del Hackathon OfficeSpace 2026 - Corporativo Alpha.

---

## 👨‍💻 Equipo de Desarrollo

- **Desarrollador Backend**: [Tu Nombre]
- **Desarrollador Frontend**: [Tu Nombre]
- **QA Engineer**: [Tu Nombre]
- **DevOps**: [Tu Nombre]

---

## 📞 Soporte

Para dudas o problemas:

- **Email**: hackathon-support@corporativoalpha.com
- **Slack**: #officespace-help
- **Documentación**: [docs/](docs/)

---

## 🎯 Próximos Pasos

Después de la instalación:

1. ✅ Familiarízate con la interfaz
2. ✅ Prueba el flujo completo de reserva
3. ✅ Revisa la documentación de API en Swagger
4. ✅ Ejecuta los escenarios de prueba
5. ✅ Explora el código fuente

---

**¡Bienvenido a BeeSpace! 🚀**
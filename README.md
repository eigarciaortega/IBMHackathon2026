#  OfficeSpace - Gestión Híbrida Inteligente

Sistema de gestión de espacios de trabajo para empresas con modelo híbrido (presencial/remoto). Permite reservar salas de juntas y escritorios individuales de manera eficiente, evitando conflictos de horarios y optimizando el uso de espacios.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

##  Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso del Sistema](#-uso-del-sistema)
- [Documentación de API](#-documentación-de-api)
- [Testing](#-testing)
- [Decisiones Técnicas](#-decisiones-técnicas)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Contribución](#-contribución)

---

##  Características Principales

### Para Colaboradores
-  **Búsqueda Inteligente:** Encuentra espacios disponibles con filtros avanzados (fecha, hora, tipo, capacidad, piso)
-  **Reservas Rápidas:** Proceso de reserva en 3 pasos con confirmación inmediata
-  **Mis Reservas:** Visualiza y gestiona tu historial de reservas
-  **Cancelación Flexible:** Cancela reservas futuras con un clic

### Para Administradores
-**Gestión de Espacios:** CRUD completo de salas y escritorios
-  **Dashboard en Tiempo Real:** Visualiza ocupación actual y estadísticas
-  **Analytics:** Métricas de uso por tipo, piso y estado
-  **Vista de Espacios:** Monitoreo detallado de todos los espacios

### Validaciones Críticas
-  **Prevención de Solapamientos:** Imposible reservar un espacio ya ocupado
-  **Validación de Capacidad:** No exceder el límite de personas por espacio
-  **Validación Temporal:** No permitir reservas en el pasado o con horarios inválidos
-  **Control de Acceso:** Autenticación JWT y autorización por roles

---

## Arquitectura del Sistema

### Decisión Arquitectónica: Microservicios con Base de Datos Compartida

Implementamos una **arquitectura híbrida de microservicios** que balancea:
-  Separación de responsabilidades por dominio
-  Despliegue independiente de servicios
-  Simplicidad en transacciones (DB compartida)
-  Escalabilidad horizontal

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    React + Vite (Port 5173)                  │
└────────────┬────────────────────────────────────────────────┘
             │
             │ HTTP/REST
             │
    ┌────────┴────────┬────────────────┬─────────────────┐
    │                 │                │                 │
┌───▼────┐      ┌────▼─────┐    ┌────▼──────┐    ┌────▼─────┐
│  Auth  │      │ Catalog  │    │  Booking  │    │ MongoDB  │
│Service │      │ Service  │    │  Service  │    │ Database │
│:3001   │      │  :3002   │    │   :3003   │    │  :27017  │
└────────┘      └──────────┘    └───────────┘    └──────────┘
```

### Servicios

#### 1. **Auth Service** (Puerto 3001)
- Autenticación de usuarios
- Generación y validación de tokens JWT
- Gestión de roles (Admin/Colaborador)

#### 2. **Catalog Service** (Puerto 3002)
- CRUD de espacios (salas y escritorios)
- Dashboard de ocupación
- Estadísticas por tipo y piso

#### 3. **Booking Service** (Puerto 3003)
- Motor de reservas con validaciones
- Búsqueda de disponibilidad
- Gestión de reservas (crear, cancelar, listar)

#### 4. **Frontend** (Puerto 5173)
- Interfaz de usuario React
- 6 pantallas funcionales
- Diseño responsive y consistente

---

##  Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **Docker** >= 20.10.0 ([Descargar](https://www.docker.com/))
- **Docker Compose** >= 2.0.0 (incluido con Docker Desktop)
- **Git** ([Descargar](https://git-scm.com/))

### Verificar Instalación

```bash
node --version    # Debe mostrar v18.x.x o superior
docker --version  # Debe mostrar 20.x.x o superior
docker-compose --version  # Debe mostrar 2.x.x o superior
```

---

##  Instalación y Configuración

### Opción 1: Instalación Rápida con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/officespace.git
cd officespace

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Esperar a que todos los servicios estén listos (30-60 segundos)
docker-compose logs -f

# 4. Acceder a la aplicación
# Frontend: http://localhost:5173
# Auth API: http://localhost:3001
# Catalog API: http://localhost:3002
# Booking API: http://localhost:3003
```

### Opción 2: Instalación Manual (Desarrollo)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/officespace.git
cd officespace

# 2. Instalar dependencias de cada servicio
cd auth-service && npm install && cd ..
cd catalog-service && npm install && cd ..
cd booking-service && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Configurar variables de entorno
# Copiar .env.example a .env en cada servicio y ajustar valores

# 4. Levantar MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# 5. Levantar cada servicio en terminales separadas
cd auth-service && npm run dev
cd catalog-service && npm run dev
cd booking-service && npm run dev
cd frontend && npm run dev
```

### Verificar que Todo Funciona

```bash
# Verificar servicios
curl http://localhost:3001/api/auth/health  # Auth Service
curl http://localhost:3002/api/spaces/health  # Catalog Service
curl http://localhost:3003/api/bookings/health  # Booking Service

# Abrir navegador
open http://localhost:5173  # macOS
start http://localhost:5173  # Windows
```

---

##  Uso del Sistema

### Credenciales de Prueba

El sistema viene con usuarios predefinidos para facilitar las pruebas:

#### Administrador
```
Email: admin@corporativoalpha.com
Password: Admin123
Permisos: Acceso completo (CRUD espacios + todas las funciones)
```

#### Colaboradores
```
Email: carlos.mendez@corporativoalpha.com
Password: User123
Permisos: Buscar, reservar y gestionar sus propias reservas

Email: ana.torres@corporativoalpha.com
Password: User123
Permisos: Buscar, reservar y gestionar sus propias reservas
```

### Flujo de Uso - Colaborador

#### 1. Iniciar Sesión
1. Navegar a http://localhost:5173
2. Ingresar credenciales de colaborador
3. Hacer clic en "Iniciar Sesión"

#### 2. Buscar Espacios Disponibles
1. En el navbar, hacer clic en "Buscar Espacios"
2. Seleccionar fecha y hora de inicio
3. Seleccionar fecha y hora de fin
4. (Opcional) Aplicar filtros:
   - Tipo de espacio (Sala de juntas / Escritorio individual)
   - Piso (1, 2, 3)
   - Capacidad mínima
5. Hacer clic en "Buscar Espacios Disponibles"

#### 3. Realizar una Reserva
1. Revisar los espacios disponibles mostrados
2. Hacer clic en "Reservar" en el espacio deseado
3. En la pantalla de confirmación:
   - Verificar los detalles del espacio
   - Ingresar número de asistentes
   - (Opcional) Agregar motivo de la reserva
4. Hacer clic en "Confirmar Reserva"
5. Esperar mensaje de confirmación

#### 4. Ver Mis Reservas
1. En el navbar, hacer clic en "Mis Reservas"
2. Usar filtros para ver:
   - Todas las reservas
   - Próximas reservas
   - Reservas activas
3. Para cancelar una reserva futura:
   - Hacer clic en "Cancelar Reserva"
   - Confirmar la acción

### Flujo de Uso - Administrador

#### 1. Acceder al Dashboard
1. Iniciar sesión con credenciales de admin
2. Automáticamente redirige a /admin/dashboard
3. Visualizar:
   - Total de espacios
   - Espacios disponibles/ocupados/en mantenimiento
   - Estadísticas de reservas
   - Ocupación por tipo y piso

#### 2. Gestionar Espacios
1. En el navbar, hacer clic en "Dashboard Espacios"
2. Ver todos los espacios con su estado actual
3. Para crear un nuevo espacio:
   - Hacer clic en "Crear Nuevo Espacio"
   - Completar formulario (nombre, tipo, capacidad, piso, ubicación, recursos)
   - Guardar
4. Para editar un espacio:
   - Hacer clic en el ícono de editar
   - Modificar campos necesarios
   - Guardar cambios
5. Para eliminar un espacio:
   - Hacer clic en el ícono de eliminar
   - Confirmar la acción

---

##  Documentación de API

### Swagger UI (Documentación Interactiva)

Cada servicio expone su documentación Swagger en `/api-docs`:

- **Auth Service:** http://localhost:3001/api-docs
- **Catalog Service:** http://localhost:3002/api-docs
- **Booking Service:** http://localhost:3003/api-docs

### Endpoints Principales

#### Auth Service

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@corporativoalpha.com",
    "role": "ADMINISTRADOR"
  }
}
```

#### Catalog Service

```http
GET /api/spaces
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

```http
POST /api/spaces
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Sala Innovación",
  "tipo": "Sala de juntas",
  "capacidad": 12,
  "piso": 3,
  "ubicacion": "Ala Norte",
  "recursos": {
    "proyector": true,
    "wifi": true,
    "aireAcondicionado": true
  }
}
```

#### Booking Service

```http
GET /api/bookings/search?fechaInicio=2026-06-24T09:00&fechaFin=2026-06-24T11:00
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [...]
}
```

```http
POST /api/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "espacioId": "...",
  "espacioNombre": "Sala Creativa",
  "fechaInicio": "2026-06-24T09:00:00.000Z",
  "fechaFin": "2026-06-24T11:00:00.000Z",
  "cantidadPersonas": 5,
  "motivo": "Reunión de equipo"
}
```

### Códigos de Respuesta HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Datos inválidos o faltantes |
| 401 | Unauthorized | Token inválido o faltante |
| 403 | Forbidden | Sin permisos suficientes |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: reserva solapada) |
| 500 | Internal Server Error | Error del servidor |

---

##  Testing

### Casos de Prueba Documentados

Hemos documentado 10 casos de prueba críticos que cubren:
- Autenticación y autorización
- Búsqueda de espacios
- Validaciones del motor de reservas
- CRUD de espacios
- Seguridad y permisos

**Ver documento completo:** [docs/CASOS_DE_PRUEBA.md](docs/CASOS_DE_PRUEBA.md)

### Ejecutar Pruebas Manuales

```bash
# 1. Asegurarse de que el sistema esté levantado
docker-compose up -d

# 2. Seguir los casos de prueba en docs/CASOS_DE_PRUEBA.md
# 3. Reportar cualquier discrepancia
```

### Colección de Postman

Importa la colección de Postman para probar la API:

```bash
# Archivo: docs/OfficeSpace.postman_collection.json
# Importar en Postman: File > Import > Seleccionar archivo
```

### Scripts de Gherkin (BDD)

Escenarios críticos en formato Gherkin:

 **Ver documento:** [docs/ESCENARIOS_GHERKIN.md](docs/ESCENARIOS_GHERKIN.md)

---

## Decisiones Técnicas

### ¿Por qué Microservicios con DB Compartida?

**Ventajas:**
-  Separación clara de responsabilidades por dominio
-  Despliegue y escalado independiente de servicios
-  Transacciones más simples (sin distributed transactions)
-  Menor complejidad operacional para un MVP
-  Facilita el debugging y desarrollo

**Trade-offs Aceptados:**
-  Acoplamiento a nivel de base de datos
-  Requiere coordinación en cambios de esquema
-  No es la arquitectura ideal para escala masiva


### ¿Por qué MongoDB?

-  Flexibilidad de esquema (útil para iteración rápida)
-  Fácil de configurar con Docker
-  Buen rendimiento para lecturas
-  Documentos JSON nativos (match con REST APIs)

### ¿Por qué React + Vite?

-  Hot Module Replacement ultra-rápido
-  Ecosistema maduro y amplia comunidad
-  Componentes reutilizables
-  Excelente experiencia de desarrollo

### ¿Por qué JWT para Autenticación?

-  Stateless (no requiere sesiones en servidor)
-  Fácil de implementar en microservicios
-  Incluye información del usuario (rol, email)
-  Estándar de la industria

---

##  Estructura del Proyecto

```
officespace/
├── auth-service/              # Microservicio de autenticación
│   ├── src/
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── models/            # Modelos de MongoDB
│   │   ├── routes/            # Definición de rutas
│   │   ├── middleware/        # JWT validation
│   │   └── utils/             # Utilidades
│   ├── server.js              # Punto de entrada
│   ├── package.json
│   └── Dockerfile
│
├── catalog-service/           # Microservicio de catálogo
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── booking-service/           # Microservicio de reservas
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── validators/        # Validaciones críticas
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                  # Aplicación React
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # 6 pantallas principales
│   │   ├── context/           # Context API (Auth)
│   │   ├── services/          # API clients
│   │   └── assets/            # Imágenes, estilos
│   ├── index.html
│   ├── package.json
│   └── Dockerfile
│
├── docs/                      # Documentación
│   ├── CASOS_DE_PRUEBA.md    # 10 casos de prueba
│   ├── ESCENARIOS_GHERKIN.md # Scripts BDD
│   ├── ARQUITECTURA.md        # Diagramas y decisiones
│   └── OfficeSpace.postman_collection.json
│
├── docker-compose.yml         # Orquestación de servicios
└── README.md                  # Este archivo
```

---

##  Contribución

### Reportar Bugs

Si encuentras un bug, por favor crea un issue con:
- Descripción del problema
- Pasos para reproducir
- Resultado esperado vs obtenido
- Screenshots (si aplica)

### Proponer Mejoras

Las pull requests son bienvenidas. Para cambios mayores:
1. Abre un issue primero para discutir el cambio
2. Fork el repositorio
3. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
4. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
5. Push a la rama (`git push origin feature/AmazingFeature`)
6. Abre un Pull Request

---


### Versión 1.1 (Próxima)
- [ ] Notificaciones push en tiempo real
- [ ] Integración con Google Calendar
- [ ] Analytics dashboard avanzado
- [ ] Exportar reportes a PDF/Excel

### Versión 2.0 (Futuro)
- [ ] App móvil (React Native)
- [ ] Sistema de check-in con QR
- [ ] IA para sugerencias de horarios
- [ ] Integración con sistemas de acceso físico

---

**¡Gracias por usar OfficeSpace! **

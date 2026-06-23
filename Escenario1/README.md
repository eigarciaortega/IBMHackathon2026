# 🏢 OfficeSpace — Gestión Híbrida de Espacios de Trabajo

> **IBM Hackathon 2026 — Escenario 1**  
> Sistema de reservación de salas y escritorios para entornos corporativos híbridos.

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Credenciales de Prueba](#credenciales-de-prueba)
- [Endpoints del API](#endpoints-del-api)
- [Documentación Swagger](#documentación-swagger)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Decisiones Técnicas](#decisiones-técnicas)

---

## 📌 Descripción

OfficeSpace es un sistema MVP de gestión de espacios de trabajo híbrido que permite a colaboradores buscar y reservar salas o escritorios, y a administradores gestionar el catálogo de espacios y monitorear la ocupación diaria.

### Funcionalidades principales

- 🔐 Autenticación JWT con roles (ADMINISTRADOR / COLABORADOR)
- 🏢 Catálogo de espacios con filtros por tipo, capacidad y disponibilidad horaria
- 📅 Sistema de reservas con validación de solapamiento en tiempo real
- ❌ Cancelación de reservas futuras
- 📊 Dashboard de ocupación del día para administradores
- 🛠️ CRUD completo de espacios (solo Admin)

---

## 🏛️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE                              │
│              React + Vite (puerto 80)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐   ┌──────────▼─────────┐
│   catalog-service  │   │   booking-service   │
│   Node.js/Express  │   │   Node.js/Express   │
│    puerto 3001     │   │    puerto 3002       │
│                    │   │                      │
│  /auth/login       │   │  /bookings           │
│  /spaces           │   │  /bookings/mine      │
│  /api-docs         │   │  /bookings/today     │
└─────────┬──────────┘   │  /bookings/available │
          │               │  /api-docs           │
          └──────┬────────┘
                 │
    ┌────────────▼────────────┐
    │      PostgreSQL 15       │
    │       puerto 5432        │
    │                          │
    │  • usuarios              │
    │  • espacios              │
    │  • reservaciones         │
    └──────────────────────────┘
```

### Comunicación entre servicios

- El **frontend** se comunica directamente con ambos microservicios vía HTTP REST
- Ambos servicios comparten la **misma base de datos PostgreSQL**
- La autenticación JWT usa el **mismo secret** en ambos servicios
- El token JWT se genera en `catalog-service` y se valida en ambos

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite | 18.x |
| Backend | Node.js + Express | 20 LTS |
| Base de Datos | PostgreSQL | 15 |
| Autenticación | JWT (jsonwebtoken) | 9.x |
| Documentación API | Swagger (swagger-jsdoc) | 6.x |
| Orquestación | Docker + Docker Compose | 3.x |
| ORM/Query | pg (node-postgres) | 8.x |

---

## ✅ Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- [WSL2](https://learn.microsoft.com/es-es/windows/wsl/install) habilitado (Windows)
- Git

> **Nota:** Node.js NO es necesario para correr el proyecto con Docker. Solo se necesita si se desea correr en modo desarrollo local.

---

## 🚀 Instalación y Ejecución

### Opción A — Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/officespace-2026.git
cd officespace-2026

# 2. Levantar todos los servicios
docker compose up --build

# 3. Verificar que todo está corriendo
# Frontend:        http://localhost
# Catalog Service: http://localhost:3001/health
# Booking Service: http://localhost:3002/health
# Adminer (BD):    http://localhost:8080
```

> El primer `--build` tarda 3-5 minutos. Las siguientes ejecuciones son más rápidas.

### Opción B — Desarrollo Local

Requiere Node.js 20+ instalado.

```bash
# Terminal 1 — Base de datos
docker compose up postgres adminer

# Terminal 2 — Catalog Service
cd catalog_service
npm install
npm run dev

# Terminal 3 — Booking Service
cd booking_service
npm install
npm run dev

# Terminal 4 — Frontend
cd frontend
npm install
npm run dev
# Abrir http://localhost:5173
```

### Detener el sistema

```bash
docker compose down
```

### Reiniciar con BD limpia

```bash
docker compose down
docker volume rm officespace-2026_postgres_data
docker compose up --build
```

---

## 🔑 Credenciales de Prueba

| Usuario | Email | Contraseña | Rol |
|---|---|---|---|
| Administrador | admin@corporativoalpha.com | Admin123 | ADMINISTRADOR |
| Carlos Méndez | carlos.mendez@corporativoalpha.com | User123 | COLABORADOR |
| Ana Torres | ana.torres@corporativoalpha.com | User123 | COLABORADOR |

---

## 📡 Endpoints del API

### Catalog Service (puerto 3001)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Iniciar sesión |
| GET | `/spaces` | Ambos | Listar espacios (filtros: tipo, capacidad) |
| GET | `/spaces/:id` | Ambos | Obtener espacio por ID |
| POST | `/spaces` | Admin | Crear espacio |
| PUT | `/spaces/:id` | Admin | Actualizar espacio |
| DELETE | `/spaces/:id` | Admin | Eliminar espacio (soft delete) |
| GET | `/health` | Público | Health check |

### Booking Service (puerto 3002)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/bookings/available` | Ambos | Espacios disponibles en un horario |
| GET | `/bookings/mine` | Colaborador | Mis reservas |
| POST | `/bookings` | Colaborador | Crear reserva |
| DELETE | `/bookings/:id` | Colaborador | Cancelar reserva propia |
| GET | `/bookings/today` | Admin | Dashboard de ocupación del día |
| GET | `/health` | Público | Health check |

### Ejemplo de request — Crear reserva

```json
POST http://localhost:3002/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "espacio_id": 2,
  "hora_entrada": "2026-06-25T09:00:00.000Z",
  "hora_salida": "2026-06-25T10:00:00.000Z",
  "asistentes": 5
}
```

---

## 📚 Documentación Swagger

La documentación interactiva del API está disponible en:

- **Catalog Service:** http://localhost:3001/api-docs
- **Booking Service:** http://localhost:3002/api-docs

Para probar endpoints protegidos en Swagger:
1. Hacer POST a `/auth/login` y copiar el token de la respuesta
2. Hacer clic en el botón **Authorize** (🔒) en la esquina superior derecha
3. Ingresar: `Bearer <token>`
4. Probar cualquier endpoint autenticado

---

## 📁 Estructura del Proyecto

```
officespace-2026/
├── catalog_service/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── spacesController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── spaces.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   └── spacesService.js
│   │   ├── middlewares/
│   │   │   └── auth.js
│   │   └── db/
│   │       └── pool.js
│   ├── app.js
│   ├── swagger.js
│   ├── Dockerfile
│   └── package.json
│
├── booking_service/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── bookingController.js
│   │   ├── routes/
│   │   │   └── bookings.js
│   │   ├── services/
│   │   │   └── bookingService.js
│   │   ├── validators/
│   │   │   └── overlapValidator.js
│   │   ├── middlewares/
│   │   │   └── auth.js
│   │   └── db/
│   │       └── pool.js
│   ├── app.js
│   ├── swagger.js
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   └── MyBookingsPage.jsx
│   │   ├── components/
│   │   │   └── BookingModal.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile
│   └── package.json
│
├── shared-infra/
│   └── init-db.sql
│
├── docker-compose.yml
└── README.md
```

---

## 🧠 Decisiones Técnicas

### Arquitectura de microservicios
Se separaron las responsabilidades en dos servicios independientes: `catalog-service` para la gestión del catálogo de espacios y autenticación, y `booking-service` para el motor de reservas. Ambos comparten la misma BD PostgreSQL para simplificar el MVP sin sacrificar la separación de dominios.

### Autenticación JWT compartida
En lugar de un tercer servicio de autenticación, el login se implementó en `catalog-service` y el mismo `JWT_SECRET` se comparte vía variables de entorno. Esto reduce la complejidad sin comprometer la seguridad en el contexto del MVP.

### Soft Delete en espacios
Los espacios no se eliminan físicamente de la BD — se marca `disponible=false`. Esto preserva la integridad referencial con las reservas históricas y permite auditoría.

### Validación de solapamiento
La lógica anti-overlap usa la condición estándar de intervalos:
```sql
hora_entrada_nueva < hora_salida_existente
AND hora_salida_nueva > hora_entrada_existente
```
Esto permite reservas consecutivas (ej. 10:00-11:00 y 11:00-12:00) y cubre todos los casos de solapamiento parcial y total.

### Frontend con React + Vite
Se eligió React por su ecosistema y familiaridad. Sin Redux ni React Router — el estado de navegación se maneja con `useState` simple para maximizar velocidad de desarrollo. El `AuthContext` centraliza el manejo del JWT y datos del usuario.

---

## 👤 Autor

Desarrollado de forma individual para el IBM Hackathon 2026.

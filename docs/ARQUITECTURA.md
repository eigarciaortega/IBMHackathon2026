# 🏗️ Arquitectura del Sistema - OfficeSpace

## Información del Documento
- **Proyecto:** OfficeSpace - Gestión Híbrida Inteligente
- **Versión:** 1.0.0
- **Fecha:** 23 de Junio, 2026
- **Arquitecto:** Equipo OfficeSpace

---

## 📐 Visión General de la Arquitectura

### Patrón Arquitectónico: Microservicios con Base de Datos Compartida

OfficeSpace implementa una arquitectura híbrida que combina los beneficios de los microservicios con la simplicidad de una base de datos compartida.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CAPA DE PRESENTACIÓN                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (React + Vite)                   │   │
│  │                        Puerto: 5173                          │   │
│  │                                                               │   │
│  │  Componentes:                                                │   │
│  │  • Login                    • SearchSpaces                   │   │
│  │  • ConfirmBooking          • MyBookings                      │   │
│  │  • AdminDashboard          • SpacesDashboard                 │   │
│  │                                                               │   │
│  │  Context API: AuthContext (JWT, User, Roles)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ HTTP/REST (JSON)
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                         CAPA DE SERVICIOS                            │
│                                                                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │
│  │ Auth Service │      │Catalog Service│      │Booking Service│     │
│  │  Port: 3001  │      │  Port: 3002   │      │  Port: 3003   │     │
│  │              │      │               │      │               │     │
│  │ Endpoints:   │      │ Endpoints:    │      │ Endpoints:    │     │
│  │ • POST login │      │ • GET spaces  │      │ • GET search  │     │
│  │ • GET profile│      │ • POST spaces │      │ • POST booking│     │
│  │              │      │ • PUT spaces  │      │ • GET my-book │     │
│  │              │      │ • DELETE space│      │ • PATCH cancel│     │
│  │              │      │ • GET dashboard│     │ • GET stats   │     │
│  └──────┬───────┘      └──────┬────────┘      └──────┬────────┘     │
│         │                     │                      │               │
│         │                     │                      │               │
│         └─────────────────────┴──────────────────────┘               │
│                               │                                       │
└───────────────────────────────┼───────────────────────────────────────┘
                                │
                                │ MongoDB Driver
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                        CAPA DE PERSISTENCIA                          │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MongoDB Database                          │   │
│  │                      Puerto: 27017                           │   │
│  │                                                               │   │
│  │  Colecciones:                                                │   │
│  │  • users          (Usuarios y autenticación)                │   │
│  │  • spaces         (Catálogo de espacios)                    │   │
│  │  • bookings       (Reservas)                                │   │
│  │                                                               │   │
│  │  Índices:                                                    │   │
│  │  • users: email (unique)                                    │   │
│  │  • spaces: nombre (unique)                                  │   │
│  │  • bookings: espacioId + fechaInicio + fechaFin            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes del Sistema

### 1. Frontend (React + Vite)

**Responsabilidades:**
- Interfaz de usuario interactiva
- Gestión de estado con Context API
- Comunicación con APIs REST
- Validación de formularios
- Manejo de autenticación (JWT)

**Tecnologías:**
- React 18.2
- Vite 5.0
- React Router 6.x
- Axios para HTTP
- CSS Modules

**Estructura:**
```
frontend/
├── src/
│   ├── components/
│   │   └── Navbar.jsx          # Navegación principal
│   ├── pages/
│   │   ├── Login.jsx            # Autenticación
│   │   ├── SearchSpaces.jsx     # Búsqueda de espacios
│   │   ├── ConfirmBooking.jsx   # Confirmación de reserva
│   │   ├── MyBookings.jsx       # Mis reservas
│   │   ├── AdminDashboard.jsx   # Dashboard admin
│   │   └── SpacesDashboard.jsx  # Dashboard espacios
│   ├── context/
│   │   └── AuthContext.jsx      # Estado global de auth
│   ├── services/
│   │   └── api.js               # Cliente HTTP
│   └── App.jsx                  # Enrutamiento principal
```

---

### 2. Auth Service (Node.js + Express)

**Responsabilidades:**
- Autenticación de usuarios
- Generación de tokens JWT
- Validación de tokens
- Gestión de roles

**Endpoints:**

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/profile` | Obtener perfil | Sí |

**Modelo de Datos (User):**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  nombre: String,
  role: String (ADMINISTRADOR | COLABORADOR),
  createdAt: Date,
  updatedAt: Date
}
```

**Flujo de Autenticación:**
```
┌──────┐                ┌─────────────┐              ┌──────────┐
│Client│                │ Auth Service│              │ Database │
└──┬───┘                └──────┬──────┘              └────┬─────┘
   │                           │                          │
   │ POST /api/auth/login      │                          │
   │ {email, password}         │                          │
   ├──────────────────────────>│                          │
   │                           │                          │
   │                           │ Find user by email       │
   │                           ├─────────────────────────>│
   │                           │                          │
   │                           │ User document            │
   │                           │<─────────────────────────┤
   │                           │                          │
   │                           │ Compare passwords        │
   │                           │ (bcrypt)                 │
   │                           │                          │
   │                           │ Generate JWT             │
   │                           │ (jsonwebtoken)           │
   │                           │                          │
   │ 200 OK                    │                          │
   │ {token, user}             │                          │
   │<──────────────────────────┤                          │
   │                           │                          │
   │ Store token in            │                          │
   │ localStorage              │                          │
   │                           │                          │
```

---

### 3. Catalog Service (Node.js + Express)

**Responsabilidades:**
- CRUD de espacios
- Dashboard de ocupación
- Estadísticas por tipo y piso
- Gestión de estados de espacios

**Endpoints:**

| Método | Ruta | Descripción | Auth | Rol |
|--------|------|-------------|------|-----|
| GET | `/api/spaces` | Listar espacios | Sí | Todos |
| GET | `/api/spaces/:id` | Obtener espacio | Sí | Todos |
| POST | `/api/spaces` | Crear espacio | Sí | Admin |
| PUT | `/api/spaces/:id` | Actualizar espacio | Sí | Admin |
| DELETE | `/api/spaces/:id` | Eliminar espacio | Sí | Admin |
| GET | `/api/spaces/dashboard` | Dashboard admin | Sí | Admin |

**Modelo de Datos (Space):**
```javascript
{
  _id: ObjectId,
  nombre: String (unique),
  tipo: String (Sala de juntas | Escritorio individual),
  capacidad: Number,
  piso: Number,
  ubicacion: String,
  estado: String (Disponible | Ocupado | Mantenimiento),
  recursos: {
    proyector: Boolean,
    aireAcondicionado: Boolean,
    pantalla: Boolean,
    wifi: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

### 4. Booking Service (Node.js + Express)

**Responsabilidades:**
- Motor de reservas con validaciones
- Búsqueda de disponibilidad
- Gestión de reservas (crear, cancelar, listar)
- Prevención de solapamientos
- Estadísticas de reservas

**Endpoints:**

| Método | Ruta | Descripción | Auth | Rol |
|--------|------|-------------|------|-----|
| GET | `/api/bookings/search` | Buscar disponibles | Sí | Todos |
| POST | `/api/bookings` | Crear reserva | Sí | Todos |
| GET | `/api/bookings/my-bookings` | Mis reservas | Sí | Todos |
| GET | `/api/bookings` | Todas las reservas | Sí | Admin |
| GET | `/api/bookings/:id` | Obtener reserva | Sí | Todos |
| PATCH | `/api/bookings/:id/cancel` | Cancelar reserva | Sí | Todos |
| GET | `/api/bookings/stats/summary` | Estadísticas | Sí | Admin |

**Modelo de Datos (Booking):**
```javascript
{
  _id: ObjectId,
  espacioId: ObjectId (ref: Space),
  espacioNombre: String,
  usuarioId: ObjectId (ref: User),
  usuarioNombre: String,
  usuarioEmail: String,
  fechaInicio: Date,
  fechaFin: Date,
  cantidadPersonas: Number,
  capacidadEspacio: Number,
  motivo: String (optional),
  estado: String (Activa | Cancelada | Completada),
  canceladaAt: Date (optional),
  motivoCancelacion: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

**Algoritmo de Prevención de Solapamientos:**
```javascript
// Pseudo-código
function checkOverlap(espacioId, fechaInicio, fechaFin) {
  const existingBookings = await Booking.find({
    espacioId: espacioId,
    estado: 'Activa',
    $or: [
      // Caso 1: Nueva reserva empieza durante una existente
      {
        fechaInicio: { $lte: fechaInicio },
        fechaFin: { $gt: fechaInicio }
      },
      // Caso 2: Nueva reserva termina durante una existente
      {
        fechaInicio: { $lt: fechaFin },
        fechaFin: { $gte: fechaFin }
      },
      // Caso 3: Nueva reserva envuelve una existente
      {
        fechaInicio: { $gte: fechaInicio },
        fechaFin: { $lte: fechaFin }
      }
    ]
  });
  
  return existingBookings.length > 0;
}
```

---

## 🔐 Seguridad

### Autenticación JWT

**Flujo de Token:**
```
1. Usuario hace login → Auth Service genera JWT
2. Frontend almacena JWT en localStorage
3. Cada request incluye: Authorization: Bearer {token}
4. Cada servicio valida el token con middleware
5. Si válido, extrae userId y role del payload
6. Continúa con la lógica de negocio
```

**Estructura del JWT:**
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: "507f1f77bcf86cd799439011",
    email: "admin@corporativoalpha.com",
    role: "ADMINISTRADOR",
    iat: 1719168000,
    exp: 1719254400  // 24 horas
  },
  signature: "..."
}
```

### Middleware de Autenticación

```javascript
// auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador'
    });
  }
  next();
};
```

---

## 📊 Base de Datos

### Esquema de Colecciones

#### Colección: users
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "admin@corporativoalpha.com",
  password: "$2b$10$...", // bcrypt hash
  nombre: "Administrador del Sistema",
  role: "ADMINISTRADOR",
  createdAt: ISODate("2026-06-01T00:00:00Z"),
  updatedAt: ISODate("2026-06-01T00:00:00Z")
}
```

#### Colección: spaces
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  nombre: "Sala Creativa",
  tipo: "Sala de juntas",
  capacidad: 8,
  piso: 2,
  ubicacion: "Ala Este",
  estado: "Disponible",
  recursos: {
    proyector: true,
    aireAcondicionado: true,
    pantalla: true,
    wifi: true
  },
  createdAt: ISODate("2026-06-01T00:00:00Z"),
  updatedAt: ISODate("2026-06-01T00:00:00Z")
}
```

#### Colección: bookings
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  espacioId: ObjectId("507f1f77bcf86cd799439012"),
  espacioNombre: "Sala Creativa",
  usuarioId: ObjectId("507f1f77bcf86cd799439014"),
  usuarioNombre: "Carlos Méndez",
  usuarioEmail: "carlos.mendez@corporativoalpha.com",
  fechaInicio: ISODate("2026-06-24T09:00:00Z"),
  fechaFin: ISODate("2026-06-24T11:00:00Z"),
  cantidadPersonas: 5,
  capacidadEspacio: 8,
  motivo: "Reunión de equipo",
  estado: "Activa",
  createdAt: ISODate("2026-06-23T10:00:00Z"),
  updatedAt: ISODate("2026-06-23T10:00:00Z")
}
```

### Índices

```javascript
// users
db.users.createIndex({ email: 1 }, { unique: true });

// spaces
db.spaces.createIndex({ nombre: 1 }, { unique: true });
db.spaces.createIndex({ tipo: 1, piso: 1 });

// bookings
db.bookings.createIndex({ espacioId: 1, fechaInicio: 1, fechaFin: 1 });
db.bookings.createIndex({ usuarioId: 1, estado: 1 });
db.bookings.createIndex({ estado: 1, fechaInicio: 1 });
```

---

## 🚀 Despliegue

### Docker Compose

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  auth-service:
    build: ./auth-service
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/officespace
      - JWT_SECRET=your_secret_key
    depends_on:
      - mongodb

  catalog-service:
    build: ./catalog-service
    ports:
      - "3002:3002"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/officespace
      - JWT_SECRET=your_secret_key
    depends_on:
      - mongodb

  booking-service:
    build: ./booking-service
    ports:
      - "3003:3003"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/officespace
      - JWT_SECRET=your_secret_key
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - auth-service
      - catalog-service
      - booking-service

volumes:
  mongodb_data:
```

---

## 📈 Escalabilidad

### Estrategias de Escalado

1. **Escalado Horizontal de Servicios:**
   - Cada servicio puede replicarse independientemente
   - Load balancer (Nginx/HAProxy) distribuye tráfico
   - Sin estado en servicios (stateless)

2. **Caché:**
   - Redis para cachear espacios disponibles
   - TTL de 5 minutos para datos de catálogo
   - Invalidación al crear/actualizar espacios

3. **Base de Datos:**
   - Réplicas de lectura para consultas
   - Sharding por espacioId para bookings
   - Índices optimizados para queries frecuentes

---

## 🔍 Monitoreo y Observabilidad

### Métricas Clave

- **Latencia de APIs:** P50, P95, P99
- **Tasa de errores:** 4xx, 5xx por servicio
- **Throughput:** Requests por segundo
- **Disponibilidad:** Uptime por servicio

### Logs Estructurados

```javascript
{
  timestamp: "2026-06-23T12:00:00Z",
  level: "info",
  service: "booking-service",
  message: "Reserva creada exitosamente",
  userId: "507f1f77bcf86cd799439014",
  bookingId: "507f1f77bcf86cd799439013",
  duration: 45
}
```

---

## ✅ Conclusión

La arquitectura de OfficeSpace balancea:
- ✅ **Simplicidad:** DB compartida facilita transacciones
- ✅ **Modularidad:** Servicios independientes por dominio
- ✅ **Escalabilidad:** Cada servicio escala independientemente
- ✅ **Mantenibilidad:** Código organizado y bien documentado

**Esta arquitectura es ideal para un MVP que puede evolucionar hacia microservicios puros en el futuro.**
# Auth Service - Servicio de Autenticación

Microservicio de autenticación con JWT para el sistema de reservas de espacios.

## 🚀 Características

- ✅ Autenticación JWT simplificada
- ✅ Dos roles: ADMINISTRADOR y COLABORADOR
- ✅ Usuarios predefinidos pre-cargados
- ✅ Conexión a MongoDB Atlas
- ✅ Registro y login de usuarios
- ✅ Validación de tokens

## 👥 Usuarios Predefinidos

El sistema incluye 3 usuarios de prueba que se crean automáticamente al iniciar:

### Administrador
- **Email:** admin@corporativoalpha.com
- **Password:** Admin123
- **Rol:** ADMINISTRADOR

### Colaboradores
- **Email:** carlos.mendez@corporativoalpha.com
- **Password:** User123
- **Rol:** COLABORADOR

- **Email:** ana.torres@corporativoalpha.com
- **Password:** User123
- **Rol:** COLABORADOR

## 📦 Instalación

```bash
npm install
```

## ▶️ Ejecución

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servicio correrá en: `http://localhost:3001`

## 🔌 Endpoints

### 1. Health Check
```http
GET /
```

### 2. Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "nuevo@ejemplo.com",
  "password": "password123",
  "role": "COLABORADOR"
}
```

### 3. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@corporativoalpha.com",
  "password": "Admin123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@corporativoalpha.com",
      "role": "ADMINISTRADOR"
    }
  }
}
```

### 4. Obtener Perfil (requiere autenticación)
```http
GET /api/auth/profile
Authorization: Bearer {token}
```

### 5. Verificar Token (requiere autenticación)
```http
GET /api/auth/verify
Authorization: Bearer {token}
```

## 🔐 Autenticación

Para usar endpoints protegidos, incluye el token JWT en el header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎭 Roles y Permisos

### ADMINISTRADOR
- ✅ Acceso completo al sistema
- ✅ CRUD de espacios
- ✅ Todas las funciones de Colaborador

### COLABORADOR
- ✅ Buscar espacios
- ✅ Crear reservas
- ✅ Gestionar sus propias reservas
- ❌ No puede gestionar espacios

## 🗄️ Base de Datos

**MongoDB Atlas**
- Colección: `users`
- Conexión configurada en `.env`

## 📝 Variables de Entorno

```env
PORT=3001
JWT_SECRET=oficina2026
MONGO_URI=mongodb+srv://...
```

## 🧪 Prueba Rápida con cURL

```bash
# Login como Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corporativoalpha.com","password":"Admin123"}'

# Login como Colaborador
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendez@corporativoalpha.com","password":"User123"}'
```

## 🏗️ Estructura del Proyecto

```
auth-service/
├── src/
│   ├── controllers/
│   │   └── auth.controllers.js    # Lógica de autenticación
│   ├── middleware/
│   │   └── auth.middleware.js     # Validación JWT y roles
│   ├── models/
│   │   └── User.js                # Modelo de usuario
│   ├── routes/
│   │   └── auth.routes.js         # Definición de rutas
│   └── utils/
│       └── seedUsers.js           # Inicialización de usuarios
├── .env                           # Variables de entorno
├── server.js                      # Punto de entrada
└── package.json
```

## ⏱️ Tiempo de Desarrollo

Este sistema cumple con los requerimientos de autenticación simplificada (2-3 horas) según especificaciones del proyecto.

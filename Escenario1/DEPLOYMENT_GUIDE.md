# Guía de Despliegue - Sistema de Reservas de Salas

## 📋 Resumen de Cambios Implementados

### Backend

#### 1. Sistema de Roles
- ✅ Agregado campo `role` a la tabla `users` (Administrador/Colaborador)
- ✅ Actualizado modelo User en todos los servicios
- ✅ Rol incluido en el token JWT
- ✅ Middleware de autorización creado (`database/auth_utils.py`)

#### 2. Protección de Endpoints
- ✅ **Room Service**: Solo administradores pueden crear, editar y eliminar salas
- ✅ **Reservation Service**: Usuarios solo ven y gestionan sus propias reservas
- ✅ Validación de roles en cada endpoint protegido

#### 3. Base de Datos
- ✅ Script SQL actualizado con campo de rol
- ✅ 3 usuarios de prueba agregados:
  - Admin: admin@corporativoalpha.com / Admin123
  - Colaborador: carlos.mendez@corporativoalpha.com / User123
  - Colaborador: ana.torres@corporativoalpha.com / User123
- ✅ 6 salas de ejemplo pre-cargadas

### Frontend

#### 4. Aplicación React
- ✅ **Login**: Autenticación con redirección según rol
- ✅ **Panel de Búsqueda**: Filtros y reservación de espacios
- ✅ **Mis Reservas**: Visualización y cancelación de reservas propias
- ✅ **Panel Admin**: CRUD completo de espacios (solo administradores)
- ✅ Diseño responsive y moderno

## 🚀 Instrucciones de Despliegue

### Paso 1: Preparar el Backend

```bash
# Detener contenedores existentes y limpiar volúmenes
docker-compose down -v

# Reconstruir e iniciar todos los servicios
docker-compose up -d --build
```

### Paso 2: Verificar que los servicios estén corriendo

```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver logs si hay problemas
docker-compose logs -f
```

Los servicios deberían estar disponibles en:
- **Frontend**: http://localhost (puerto 80)
- User Service: http://localhost:8001
- Room Service: http://localhost:8002
- Reservation Service: http://localhost:8003
- PostgreSQL: localhost:5432

### Paso 3: Acceder a la Aplicación

Simplemente abre tu navegador en: **http://localhost**

El frontend está completamente dockerizado y nginx hace proxy a los servicios backend.

### Desarrollo Local del Frontend (Opcional)

Si deseas desarrollar el frontend localmente sin Docker:

```bash
# Navegar al directorio del frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

El frontend de desarrollo estará disponible en: http://localhost:3000

## 🧪 Pruebas del Sistema

### 1. Probar Login y Roles

**Como Administrador:**
```
Email: admin@corporativoalpha.com
Password: Admin123
```
- Deberías ver el Panel de Administración
- Puedes crear, editar y eliminar salas
- Ves estadísticas del sistema

**Como Colaborador:**
```
Email: carlos.mendez@corporativoalpha.com
Password: User123
```
- Deberías ver el Panel de Búsqueda
- Puedes buscar y reservar espacios
- Solo ves tus propias reservas

### 2. Probar Funcionalidades

#### Administrador:
1. Crear una nueva sala
2. Editar una sala existente
3. Eliminar una sala
4. Ver estadísticas del dashboard

#### Colaborador:
1. Buscar salas por nombre
2. Filtrar por tipo (sala/escritorio)
3. Filtrar por capacidad
4. Crear una reserva
5. Ver "Mis Reservas"
6. Cancelar una reserva propia

### 3. Verificar Restricciones de Seguridad

**Probar que colaboradores NO pueden:**
- Acceder al panel de administración
- Crear/editar/eliminar salas (endpoints protegidos)
- Ver reservas de otros usuarios

**Probar que administradores SÍ pueden:**
- Gestionar todas las salas
- Ver el dashboard completo

## 📁 Estructura del Proyecto

```
back/
├── database/
│   ├── connection.py          # Conexión a BD (actualizado con text())
│   ├── auth_utils.py          # Utilidades de autenticación (NUEVO)
│   └── init.sql               # Script SQL con roles y datos de prueba
├── user-service/
│   ├── models.py              # Modelo User con campo role
│   ├── schemas.py             # Schemas con UserRole enum
│   ├── auth.py                # Autenticación JWT
│   └── main.py                # API con rol en token
├── room-service/
│   ├── main.py                # Endpoints protegidos con require_admin
│   └── requirements.txt       # Agregado python-jose
├── reservation-service/
│   ├── main.py                # Filtrado por usuario actual
│   └── models.py              # Modelo User con role
├── frontend/                  # Aplicación React (NUEVO)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── SearchRooms.jsx
│   │   │   ├── MyReservations.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   └── App.jsx
│   └── package.json
└── docker-compose.yml
```

## 🔧 Solución de Problemas

### Error: "Database connection failed"
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps

# Ver logs de la base de datos
docker logs meeting-rooms-db

# Reiniciar servicios
docker-compose restart
```

### Error: "Module 'jose' not found"
```bash
# Reconstruir contenedores
docker-compose up -d --build
```

### Frontend no se conecta al backend
- Verificar que los servicios estén en los puertos correctos (8001, 8002, 8003)
- Revisar CORS en los servicios backend
- Verificar que el token JWT se esté guardando en localStorage

### Error: "Invalid token" o "Unauthorized"
- Cerrar sesión y volver a iniciar
- Verificar que JWT_SECRET_KEY sea el mismo en todos los servicios
- Limpiar localStorage del navegador

## 📊 Endpoints de API

### User Service (8001)
- `POST /api/users/register` - Registrar usuario
- `POST /api/users/login` - Iniciar sesión
- `GET /api/users/me` - Obtener usuario actual (requiere auth)

### Room Service (8002)
- `GET /api/rooms` - Listar salas (público)
- `GET /api/rooms/{id}` - Obtener sala (público)
- `POST /api/rooms` - Crear sala (solo admin)
- `PUT /api/rooms/{id}` - Actualizar sala (solo admin)
- `DELETE /api/rooms/{id}` - Eliminar sala (solo admin)

### Reservation Service (8003)
- `GET /api/reservations` - Listar mis reservas (requiere auth)
- `GET /api/reservations/{id}` - Obtener mi reserva (requiere auth)
- `POST /api/reservations` - Crear reserva (requiere auth)
- `DELETE /api/reservations/{id}` - Cancelar mi reserva (requiere auth)

## 🎯 Características Implementadas

### Seguridad
- ✅ Autenticación JWT
- ✅ Roles de usuario (Admin/Colaborador)
- ✅ Protección de endpoints por rol
- ✅ Validación de permisos en cada operación
- ✅ Usuarios solo acceden a sus propios datos

### Funcionalidades
- ✅ Login con redirección según rol
- ✅ CRUD completo de salas (admin)
- ✅ Búsqueda y filtrado de espacios
- ✅ Creación de reservas con validaciones
- ✅ Gestión de reservas propias
- ✅ Dashboard administrativo
- ✅ Interfaz responsive

### Base de Datos
- ✅ Esquema actualizado con roles
- ✅ Datos de prueba pre-cargados
- ✅ Validaciones a nivel de BD
- ✅ Índices para mejor rendimiento

## 📝 Notas Importantes

1. **Contraseñas**: Las contraseñas de prueba son solo para desarrollo. En producción usar contraseñas seguras.

2. **JWT Secret**: Cambiar `JWT_SECRET_KEY` en producción a un valor aleatorio y seguro.

3. **CORS**: En producción, configurar orígenes específicos en lugar de `allow_origins=["*"]`.

4. **HTTPS**: En producción, usar HTTPS para todas las comunicaciones.

5. **Tokens**: Implementar refresh tokens para sesiones más largas en producción.

## ✅ Checklist de Verificación

- [ ] Backend corriendo en puertos 8001, 8002, 8003
- [ ] Base de datos inicializada con usuarios y salas
- [ ] Frontend corriendo en puerto 3000
- [ ] Login funciona con los 3 usuarios de prueba
- [ ] Administrador puede gestionar salas
- [ ] Colaboradores pueden crear reservas
- [ ] Colaboradores solo ven sus propias reservas
- [ ] Endpoints protegidos rechazan acceso no autorizado

## 🎉 ¡Listo!

El sistema está completamente funcional con:
- Sistema de roles implementado
- Seguridad por endpoints
- Frontend completo con 4 pantallas
- Base de datos con datos de prueba
- Documentación completa

Para cualquier problema, revisar los logs con:
```bash
docker-compose logs -f [service-name]
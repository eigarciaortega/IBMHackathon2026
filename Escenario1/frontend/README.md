# Frontend - Sistema de Reservas de Salas

Frontend desarrollado en React con Vite para el sistema de reservas de salas de reunión y escritorios.

## Características

- **Login**: Autenticación de usuarios con roles (Administrador/Colaborador)
- **Panel de Búsqueda**: Búsqueda y filtrado de espacios disponibles
- **Mis Reservas**: Visualización y gestión de reservas del usuario
- **Panel de Administración**: CRUD completo de espacios (solo para administradores)

## Requisitos

- Node.js 18+ 
- npm o yarn

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

## Usuarios de Prueba

### Administrador
- **Email**: admin@corporativoalpha.com
- **Password**: Admin123
- **Acceso**: Panel de administración completo

### Colaboradores
- **Email**: carlos.mendez@corporativoalpha.com
- **Password**: User123
- **Acceso**: Búsqueda y reservas

- **Email**: ana.torres@corporativoalpha.com
- **Password**: User123
- **Acceso**: Búsqueda y reservas

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── pages/          # Páginas principales
│   │   ├── Login.jsx
│   │   ├── SearchRooms.jsx
│   │   ├── MyReservations.jsx
│   │   └── AdminPanel.jsx
│   ├── services/       # Servicios de API
│   │   └── api.js
│   ├── styles/         # Estilos CSS
│   ├── App.jsx         # Componente principal
│   └── main.jsx        # Punto de entrada
├── index.html
├── package.json
└── vite.config.js
```

## Configuración de API

El frontend se conecta a los siguientes servicios:

- **User Service**: http://localhost:8001
- **Room Service**: http://localhost:8002
- **Reservation Service**: http://localhost:8003

Para cambiar las URLs, edita el archivo `src/services/api.js`.

## Funcionalidades por Rol

### Colaborador
- Buscar espacios disponibles
- Filtrar por tipo y capacidad
- Crear reservas
- Ver mis reservas
- Cancelar mis reservas

### Administrador
- Ver dashboard con estadísticas
- Crear nuevos espacios
- Editar espacios existentes
- Eliminar espacios
- Ver todas las reservas del sistema

## Tecnologías Utilizadas

- React 18
- Vite
- Axios (HTTP client)
- date-fns (manejo de fechas)
- CSS Modules

## Desarrollo

El servidor de desarrollo se ejecuta en `http://localhost:3000` con hot-reload automático.

```bash
npm run dev
```

## Producción

Para compilar la aplicación para producción:

```bash
npm run build
```

Los archivos compilados se generarán en la carpeta `dist/`.

## Notas

- Las contraseñas de prueba son solo para desarrollo
- En producción, cambiar las URLs de API y configurar HTTPS
- Implementar refresh tokens para sesiones más largas
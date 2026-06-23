# frontend

SPA de OfficeSpace: las 4 pantallas del producto (login, búsqueda con filtros,
confirmación de reserva + mis reservas, y administración). Consume los tres
microservicios Go.

- **Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router.
- **Estado:** React Context para la sesión (`AuthContext`); el JWT se guarda y se
  adjunta como `Authorization: Bearer` en cada cliente de API.
- **Diseño:** sistema de tokens propio en `src/index.css` (verde pino + ámbar),
  foco de teclado visible y soporte de `prefers-reduced-motion`.

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
```

## Variables de entorno

Las URLs de los servicios se inyectan en tiempo de build con prefijo `VITE_`. En
desarrollo se puede usar un archivo `.env.local` (no versionado):

| Variable             | Por defecto              | Descripción                   |
|----------------------|--------------------------|-------------------------------|
| `VITE_AUTH_URL`      | `http://localhost:8081`  | URL pública de auth-service    |
| `VITE_CATALOG_URL`   | `http://localhost:8082`  | URL pública de catalog-service |
| `VITE_BOOKING_URL`   | `http://localhost:8083`  | URL pública de booking-service |

Si no se definen, se usan los valores por defecto (entorno local).

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción (carpeta dist/)
npm run preview   # sirve el build de producción
npm run lint      # ESLint
```

## Producción

`npm run build` genera `dist/`, que en el despliegue sirve nginx (ver `Dockerfile`
y la Fase 6 de orquestación).

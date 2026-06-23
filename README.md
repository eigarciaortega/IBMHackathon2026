# OfficeSpace - Gestión Híbrida Inteligente

MVP de gestión de salas de juntas y escritorios compartidos (hot desks) para "Corporativo Alpha". Arquitectura de microservicios sobre Node.js + Express con una base de datos MySQL compartida, una SPA en React (Vite) y orquestación con docker-compose.

## Estructura del monorepo

```
.
├── auth-service/      # Autenticación (JWT + roles) — Express
├── catalog-service/   # CRUD de espacios + tablero de ocupación — Express
├── booking-service/   # Disponibilidad + motor de validación de reservas — Express
├── frontend/          # SPA en React (Vite)
├── shared/            # Módulos compartidos (contrato de error, middleware JWT/roles)
├── db/init/           # Scripts de migración y seed de MySQL
├── docker-compose.yml # Orquestación: db, auth-service, catalog-service, booking-service, frontend
├── .env.example       # Plantilla de variables de entorno
└── .env               # Variables de entorno locales (no versionar)
```

## Servicios y puertos

| Servicio          | Puerto | Responsabilidad                                   |
|-------------------|--------|---------------------------------------------------|
| `db` (MySQL)      | 3306   | Base de datos compartida                          |
| `auth-service`    | 3001   | Login, emisión y verificación de Token_JWT        |
| `catalog-service` | 3002   | CRUD de espacios y tablero de ocupación           |
| `booking-service` | 3003   | Búsqueda de disponibilidad y reservas             |
| `frontend`        | 5173   | SPA (login, búsqueda, confirmación, administración)|

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores. Las claves principales son:

- `JWT_SECRET`: clave simétrica (HS256) compartida para firmar y verificar el Token_JWT.
- `JWT_EXPIRES_IN`: validez del token en segundos (3600 por requisito R1.1).
- `MYSQL_*` / `DB_*`: credenciales y conexión a la base de datos MySQL compartida.

## Puesta en marcha

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar toda la pila
docker compose up --build
```

## Tooling de pruebas

Cada servicio incluye `vitest` y `fast-check` (pruebas basadas en propiedades) como dependencias de desarrollo. Las pruebas se ejecutan con `npm test` dentro de cada servicio.

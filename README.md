# OfficeSpace Advisor

**Gestion inteligente de espacios para oficinas hibridas**

OfficeSpace Advisor es una aplicacion web para gestionar espacios de oficina en entornos hibridos. El objetivo del producto no es solo reservar salas o escritorios, sino acompanar al colaborador con busqueda consultiva, reglas claras de disponibilidad, dashboard de negocio y un asistente llamado **Alpha Assistant**.

Frase de producto: **Reserva mejor. Ocupa mejor. Decide con datos.**

## Problema de negocio

Las oficinas hibridas suelen tener baja visibilidad sobre ocupacion real, preferencias de uso y demanda por recursos como proyector, pantalla, pizarra o zonas silenciosas. Esto genera reservas manuales, espacios subutilizados y poca informacion para decidir como ajustar la capacidad de la oficina.

## Propuesta

OfficeSpace Advisor centraliza:

- Login con roles para administradores y colaboradores.
- Catalogo de salas, hot desks y espacios colaborativos.
- Busqueda de disponibilidad y reservas sin solapamiento.
- Dashboard de ocupacion y analitica.
- Alpha Assistant, un chatbot basado en reglas para convertir lenguaje natural en filtros.
- Registro de patrones de busqueda para analisis posterior.

## Arquitectura

La solucion se organiza como microservicios reales con una base de datos PostgreSQL compartida para acelerar el desarrollo del hackathon y mantener una historia tecnica facil de defender:

- `auth-service`: login, perfil y JWT basico.
- `catalog-service`: administracion de espacios.
- `booking-service`: disponibilidad, reservas, dashboard y Alpha Assistant.
- `frontend`: interfaz web con HTML, CSS y JavaScript puro.
- `shared-infra`: scripts de base de datos y datos semilla.

Esta separacion permite evolucionar cada dominio sin mezclar responsabilidades, pero conserva una infraestructura simple para demo.

## Stack tecnologico

- Frontend: HTML, CSS y JavaScript puro, sin React.
- Backend: Node.js con Express.
- Documentacion API: Swagger UI en cada servicio.
- Base de datos: PostgreSQL 16.
- Orquestacion local: Docker Compose.

## Levantar el proyecto

Desde la carpeta `officespace-advisor`:

```bash
docker compose up --build
```

URLs esperadas:

- Frontend: http://localhost:8080
- Auth service: http://localhost:3000/health
- Catalog service: http://localhost:3001/health
- Booking service: http://localhost:3002/health

Swagger:

- Auth Swagger: http://localhost:3000/api-docs
- Catalog Swagger: http://localhost:3001/api-docs
- Booking Swagger: http://localhost:3002/api-docs

## Credenciales de prueba

Administrador:

- Email: `admin@corporativoalpha.com`
- Password: `Admin123`
- Role: `ADMINISTRADOR`

Colaboradores:

- Email: `carlos.mendez@corporativoalpha.com`
- Password: `User123`
- Role: `COLABORADOR`

- Email: `ana.torres@corporativoalpha.com`
- Password: `User123`
- Role: `COLABORADOR`

## Estado actual

Esta version entrega el esqueleto inicial, autenticacion y CRUD de catalogo:

- Carpetas principales.
- Dockerfile por servicio.
- `docker-compose.yml`.
- PostgreSQL con tablas y datos semilla.
- Swagger basico por servicio.
- Endpoints `/health`.
- Auth funcional con `POST /login`, `GET /me`, JWT y validacion contra PostgreSQL.
- Middleware reutilizable para validar token y rol administrador.
- Catalogo funcional con `GET /spaces`, `GET /spaces/:id`, `POST /spaces`, `PUT /spaces/:id` y `DELETE /spaces/:id`.
- Filtros de espacios por tipo, capacidad minima, proyector, aire acondicionado, pantalla, pizarra y zona silenciosa.
- Control de roles en catalogo: colaboradores pueden consultar y solo administradores pueden crear, editar o eliminar.
- Rutas de negocio restantes como stubs documentados.
- Frontend inicial con login conectado, `localStorage`, redireccion por rol, busqueda, reserva, mis reservas, dashboard, administracion basica de espacios y Alpha Assistant.

La logica completa de disponibilidad, reservas, analitica y persistencia del asistente queda lista para implementarse en la siguiente iteracion.

## Enfoque de innovacion

Alpha Assistant convierte consultas como "Necesito una sala para 5 personas manana en la manana con proyector" en filtros estructurados. El dashboard de negocio usara esas senales para detectar demanda, recursos mas solicitados y patrones de ocupacion.

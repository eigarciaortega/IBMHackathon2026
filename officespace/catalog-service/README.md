# catalog-service

Microservicio de gestión de espacios para OfficeSpace MVP.

## Puerto: 8082

## Endpoints
| Método | Ruta              | Rol requerido      |
|--------|-------------------|--------------------|
| GET    | /api/spaces       | ADMIN / COLABORADOR|
| GET    | /api/spaces/{id}  | ADMIN / COLABORADOR|
| GET    | /api/spaces/active| ADMIN / COLABORADOR|
| POST   | /api/spaces       | ADMINISTRADOR      |
| PUT    | /api/spaces/{id}  | ADMINISTRADOR      |
| DELETE | /api/spaces/{id}  | ADMINISTRADOR      |

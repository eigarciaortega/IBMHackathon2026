# catalog-service

Microservicio de catálogo de espacios de OfficeSpace. Expone el CRUD de espacios
(salas y *hot desks*) y la búsqueda con filtros. Las operaciones de escritura
requieren rol **ADMINISTRADOR**; la lectura está disponible para cualquier usuario
autenticado.

- **Puerto:** `8082`
- **Stack:** Go + `chi` + `pgx/v5` + validación JWT por middleware
- **Arquitectura:** `handlers → services → repository`

## Endpoints

| Método | Ruta            | Rol      | Descripción                                |
|--------|-----------------|----------|--------------------------------------------|
| GET    | `/health`       | —        | Sonda de salud (`200`)                     |
| GET    | `/spaces`       | auth     | Lista espacios; filtros `?tipo=&capacidad_min=` |
| GET    | `/spaces/{id}`  | auth     | Detalle de un espacio                      |
| POST   | `/spaces`       | ADMIN    | Crea un espacio                            |
| PUT    | `/spaces/{id}`  | ADMIN    | Actualiza un espacio                       |
| DELETE | `/spaces/{id}`  | ADMIN    | Elimina un espacio                         |
| GET    | `/api-docs`     | —        | Documentación Swagger UI                   |

## Desarrollo local

```bash
go run ./cmd/server
```

Variables de entorno relevantes: `DATABASE_URL`, `JWT_SECRET`,
`CORS_ALLOWED_ORIGINS`, `PORT`, `TZ`.

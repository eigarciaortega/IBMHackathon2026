# auth-service

Microservicio de autenticación de OfficeSpace. Valida credenciales contra la base
de datos compartida (PostgreSQL) y emite tokens **JWT** firmados con `JWT_SECRET`.
Los demás servicios validan esos tokens con el mismo secreto.

- **Puerto:** `8081`
- **Stack:** Go + `chi` + `pgx/v5` + `golang-jwt/v5` + `bcrypt`
- **Arquitectura:** `handlers → services → repository`

## Endpoints

| Método | Ruta          | Descripción                                  |
|--------|---------------|----------------------------------------------|
| GET    | `/health`     | Sonda de salud (`200`)                       |
| POST   | `/auth/login` | Login con email/contraseña → `{ token, rol }`|
| GET    | `/auth/me`    | Datos del usuario autenticado (protegido)    |
| GET    | `/api-docs`   | Documentación Swagger UI                      |

## Desarrollo local

```bash
go run ./cmd/server
```

Variables de entorno relevantes: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRA_HORAS`,
`CORS_ALLOWED_ORIGINS`, `PORT`, `TZ`.

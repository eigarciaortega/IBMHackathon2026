# auth-service · IBM OfficeSpace

Microservicio de **autenticación**. Emite y valida JWT (HS256).

- Puerto: `4001` · Swagger: `/api-docs`
- Endpoints: `POST /auth/login`, `GET /auth/me`, `GET /auth/users` (admin)
- Variables: ver `.env.example` (`PG*`, `JWT_SECRET`, `JWT_EXPIRES_IN`)

```bash
npm install && npm start
```

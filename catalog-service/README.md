# catalog-service · IBM OfficeSpace

Microservicio de **catálogo de espacios** (salas y escritorios). CRUD protegido por JWT;
escritura solo para `ADMINISTRADOR`.

- Puerto: `4002` · Swagger: `/api-docs`
- Endpoints: `GET /spaces`, `GET /spaces/:id`, `POST/PUT/DELETE /spaces` (admin)
- Variables: ver `.env.example`

```bash
npm install && npm start
```

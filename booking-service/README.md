# booking-service · IBM OfficeSpace

**Motor de reservas**: disponibilidad, creación con validación de no-solapamiento,
cancelación, ocupación, analíticas y sugerencias. Consulta al catalog-service vía HTTP.

- Puerto: `4003` · Swagger: `/api-docs`
- Endpoints: `GET /availability`, `POST /bookings`, `GET /bookings/me`,
  `DELETE /bookings/:id`, `GET /bookings/occupancy`, `GET /bookings/analytics`,
  `GET /bookings/suggestions`
- Variables: ver `.env.example` (incluye `CATALOG_SERVICE_URL`)

```bash
npm install && npm start
npm test   # tests de la lógica de reservas
```

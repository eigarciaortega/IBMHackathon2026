# booking-service

Microservicio del motor de reservas de OfficeSpace. Es el núcleo crítico del
sistema: valida solapamiento de horarios, fechas en el pasado, consistencia
temporal y capacidad. La validación de capacidad/existencia del espacio se hace
**llamando por HTTP a `catalog-service`**, no leyendo su tabla. El no-solapamiento
está además garantizado a nivel de base de datos por una restricción de exclusión.

- **Puerto:** `8083`
- **Stack:** Go + `chi` + `pgx/v5` + cliente HTTP hacia catalog
- **Arquitectura:** `handlers → services → repository` (+ `validators`, `clients`)

## Endpoints

| Método | Ruta                    | Descripción                                       |
|--------|-------------------------|---------------------------------------------------|
| GET    | `/health`               | Sonda de salud (`200`)                            |
| POST   | `/bookings`             | Crea una reserva (valida todo) → `201` / `409`    |
| GET    | `/bookings/mine`        | Reservas del usuario autenticado                  |
| GET    | `/bookings/availability`| Disponibilidad por espacio/fecha/rango            |
| GET    | `/occupancy?fecha=`     | Ocupación del día (dashboard admin)               |
| DELETE | `/bookings/{id}`        | Cancela una reserva propia (`403` si es ajena)    |
| GET    | `/api-docs`             | Documentación Swagger UI                           |

## Desarrollo local

```bash
go run ./cmd/server
```

Variables de entorno relevantes: `DATABASE_URL`, `JWT_SECRET`, `CATALOG_BASE_URL`,
`CORS_ALLOWED_ORIGINS`, `PORT`, `TZ`.

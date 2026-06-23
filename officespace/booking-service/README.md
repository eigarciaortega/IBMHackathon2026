# booking-service

Motor de reservas para OfficeSpace MVP.

## Puerto: 8083

## Validaciones Críticas
1. No reservas en el pasado
2. Hora fin > Hora inicio
3. No solapamiento de horarios (anti-overlap)
4. Capacidad no excedida

## Endpoints
| Método | Ruta                 | Descripción                 |
|--------|----------------------|-----------------------------|
| POST   | /api/bookings        | Crear reserva               |
| GET    | /api/bookings/my     | Mis reservas                |
| GET    | /api/bookings/today  | Reservas de hoy (dashboard) |
| DELETE | /api/bookings/{id}   | Cancelar reserva            |

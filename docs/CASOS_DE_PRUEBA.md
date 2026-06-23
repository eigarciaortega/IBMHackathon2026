# Casos de Prueba — IBM OfficeSpace

Formato: **Precondiciones · Pasos · Resultado esperado**. Cubre la funcionalidad core,
con foco en la lógica de reservas (no-solapamiento) y la seguridad.

## Casos manuales

| # | Título | Precondiciones | Pasos | Resultado esperado |
|---|--------|----------------|-------|--------------------|
| CP-01 | Login válido (admin) | Servicios y BD arriba | Login con `admin@corporativoalpha.com` / `Admin123` | 200, token emitido, redirige al Dashboard |
| CP-02 | Login inválido | — | Login con contraseña errónea | 401, mensaje "Credenciales incorrectas" |
| CP-03 | Acceso protegido sin sesión | Sin token | Abrir `/dashboard` directamente | Redirige a `/login` |
| CP-04 | Permisos por rol | Sesión COLABORADOR | Intentar abrir Gestión de Espacios | Redirige a Buscar; la API responde 403 |
| CP-05 | Crear espacio (admin) | Sesión ADMIN | Crear "Sala Granite", cap. 8 | 201, aparece en la tabla |
| CP-06 | Buscar disponibilidad | Existen espacios | Fecha futura, 09:00–10:00, tipo SALA | Lista solo salas libres en ese rango |
| CP-07 | Reserva exitosa | Espacio libre | Reservar 09:00–10:00, 4 asistentes | 201, mensaje de éxito, aparece en Mis Reservas |
| CP-08 | **Solapamiento (crítico)** | Existe reserva 09:00–10:00 | Reservar 09:30–10:30 mismo espacio | **409**, "espacio ya reservado" |
| CP-09 | Reservas consecutivas | Existe reserva 10:00–11:00 | Reservar 11:00–12:00 mismo espacio | 201 (límite exclusivo, sin choque) |
| CP-10 | Capacidad excedida | Sala de capacidad 8 | Reservar para 10 asistentes | 400, código `CAPACIDAD_EXCEDIDA` |
| CP-11 | Fin ≤ inicio | — | Reservar 11:00–09:00 | 400, código `ORDEN_HORARIO` |
| CP-12 | Fecha en el pasado | — | Reservar ayer | 400, código `FECHA_PASADA` |
| CP-13 | Cancelar reserva futura | Reserva futura propia | Cancelar desde Mis Reservas | 200, pasa a "Cancelada"; el espacio se libera |
| CP-14 | Reservar sin token | — | `POST /bookings` sin `Authorization` | 401 |
| CP-15 | Cambio de idioma | App abierta | Selector → English/Deutsch | La UI cambia de idioma y persiste al recargar |
| CP-16 | Asistente de voz | Chrome | Pulsar micrófono y preguntar "¿cuántos espacios ocupados hoy?" | Responde con datos reales (texto + voz) |

## Escenarios Gherkin (BDD) — lógica crítica

```gherkin
# language: es
Característica: Motor de reservas de IBM OfficeSpace

  Antecedentes:
    Dado que existe la "Sala Watson" con capacidad 12
    Y que estoy autenticado como colaborador

  Escenario: Rechazar una reserva solapada (el "abrazo" de horarios)
    Dado que existe una reserva de la "Sala Watson" de 09:00 a 10:00
    Cuando intento reservar la "Sala Watson" de 09:30 a 10:30
    Entonces el sistema responde con código 409
    Y la reserva no se crea

  Escenario: Permitir reservas consecutivas (límite exclusivo)
    Dado que existe una reserva de la "Sala Watson" de 10:00 a 11:00
    Cuando reservo la "Sala Watson" de 11:00 a 12:00
    Entonces el sistema responde con código 201

  Escenario: Rechazar por capacidad excedida
    Cuando intento reservar la "Sala Watson" para 15 asistentes
    Entonces el sistema responde con código 400
    Y el error tiene el código "CAPACIDAD_EXCEDIDA"

  Escenario: Rechazar horario inconsistente
    Cuando intento reservar la "Sala Watson" de 11:00 a 09:00
    Entonces el sistema responde con código 400
    Y el error tiene el código "ORDEN_HORARIO"

  Escenario: Rechazar reserva en el pasado
    Cuando intento reservar la "Sala Watson" para una fecha pasada
    Entonces el sistema responde con código 400
    Y el error tiene el código "FECHA_PASADA"

  Escenario: Exigir autenticación
    Dado que no envío token de autenticación
    Cuando intento crear una reserva
    Entonces el sistema responde con código 401
```

## Pruebas unitarias automatizadas

La lógica pura del motor (solapamiento, capacidad, fecha, orden) está cubierta por tests:

```bash
cd booking-service && npm test
```

Salida esperada: `12/12 tests OK` (incluye el "abrazo", reservas consecutivas,
capacidad excedida, fin ≤ inicio, fecha pasada y formatos inválidos).

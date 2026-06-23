# Casos de prueba — OfficeSpace

Casos de prueba manuales del MVP. Cada caso indica precondiciones, pasos y
resultado esperado. Las fechas "mañana"/"ayer" son relativas a la ejecución
(la semilla usa fechas relativas a `CURRENT_DATE`).

Credenciales de prueba:

| Usuario                              | Contraseña | Rol           |
|--------------------------------------|------------|---------------|
| `admin@corporativoalpha.com`         | `Admin123` | ADMINISTRADOR |
| `carlos.mendez@corporativoalpha.com` | `User123`  | COLABORADOR   |
| `ana.torres@corporativoalpha.com`    | `User123`  | COLABORADOR   |

Convención de la columna "Clase de bug": marca los casos que cubren explícitamente
una clase de bug del brief.

---

### CP-01 — Login exitoso y emisión de JWT
- **Precondiciones:** stack levantado; usuario admin en la semilla.
- **Pasos:** `POST /auth/login` con `admin@corporativoalpha.com` / `Admin123`.
- **Resultado esperado:** `200` con `{ token, rol: "ADMINISTRADOR" }`; el token decodifica con `sub`, `rol` y `exp`.

### CP-02 — Login con credenciales inválidas
- **Clase de bug:** endpoints sin autenticación.
- **Precondiciones:** stack levantado.
- **Pasos:** `POST /auth/login` con `admin@corporativoalpha.com` / `incorrecta`.
- **Resultado esperado:** `401` con sobre `{ error: { codigo: "CREDENCIALES_INVALIDAS" } }`.

### CP-03 — Endpoint protegido sin token
- **Clase de bug:** endpoints sin autenticación.
- **Precondiciones:** stack levantado.
- **Pasos:** `GET /spaces` sin cabecera `Authorization`.
- **Resultado esperado:** `401` (`TOKEN_AUSENTE`).

### CP-04 — Filtros de búsqueda aplicados de verdad
- **Precondiciones:** sesión de colaborador; semilla con salas y escritorios.
- **Pasos:** `GET /spaces?tipo=DESK&capacidad_min=1`.
- **Resultado esperado:** `200`; todos los resultados son `DESK` con `capacidad >= 1`.

### CP-05 — Crear espacio como COLABORADOR (permisos)
- **Clase de bug:** borrado/escritura por rol incorrecto (permisos).
- **Precondiciones:** sesión de `carlos.mendez`.
- **Pasos:** `POST /spaces` con un cuerpo válido.
- **Resultado esperado:** `403` (`ACCESO_DENEGADO`); no se crea nada.

### CP-06 — Crear espacio como ADMINISTRADOR
- **Precondiciones:** sesión de admin.
- **Pasos:** `POST /spaces` con `{ nombre, tipo: "SALA", capacidad: 6, ... }`.
- **Resultado esperado:** `201` con el espacio creado y su `id`.

### CP-07 — Reserva válida
- **Precondiciones:** sesión de colaborador; un espacio con capacidad suficiente y horario libre mañana.
- **Pasos:** `POST /bookings` con `espacio_id`, `fecha=mañana`, `16:00–17:00`, `asistentes` ≤ capacidad.
- **Resultado esperado:** `201` con `estado: "CONFIRMADA"`.

### CP-08 — Reserva solapada parcialmente (conflicto)
- **Clase de bug:** solapamiento no detectado; status code incorrecto en conflicto.
- **Precondiciones:** existe una reserva confirmada mañana `16:00–17:00` en el espacio.
- **Pasos:** `POST /bookings` mañana `16:30–17:30` en el mismo espacio.
- **Resultado esperado:** `409` (`RESERVA_SOLAPADA`). **No** debe responder `200`/`201`.

### CP-09 — Reserva "abrazo" (una envuelve a otra)
- **Clase de bug:** solapamiento no detectado.
- **Precondiciones:** existe una reserva confirmada mañana `16:00–17:00`.
- **Pasos:** `POST /bookings` mañana `15:00–18:00` en el mismo espacio.
- **Resultado esperado:** `409` (`RESERVA_SOLAPADA`).

### CP-10 — Reservas consecutivas con límites exclusivos
- **Precondiciones:** existe una reserva confirmada mañana `16:00–17:00`.
- **Pasos:** `POST /bookings` mañana `17:00–18:00` en el mismo espacio.
- **Resultado esperado:** `201`; los límites exclusivos `[)` permiten pegar reservas.

### CP-11 — Capacidad excedida
- **Clase de bug:** capacidad sin validar.
- **Precondiciones:** sesión de colaborador; espacio de capacidad conocida (p. ej. Desk A1, capacidad 1).
- **Pasos:** `POST /bookings` con `asistentes` mayor a la capacidad.
- **Resultado esperado:** `400` (`CAPACIDAD_EXCEDIDA`). La validación se hace consultando `catalog-service` por HTTP.

### CP-12 — Reserva en el pasado
- **Precondiciones:** sesión de colaborador.
- **Pasos:** `POST /bookings` con `fecha=ayer`.
- **Resultado esperado:** `400` (`FECHA_PASADA`); la comparación usa `America/Mexico_City`.

### CP-13 — Consistencia temporal (fin ≤ inicio)
- **Precondiciones:** sesión de colaborador.
- **Pasos:** `POST /bookings` con `hora_inicio=10:00`, `hora_fin=09:00`.
- **Resultado esperado:** `400` (`HORARIO_INVALIDO`).

### CP-14 — Espacio inexistente
- **Precondiciones:** sesión de colaborador.
- **Pasos:** `POST /bookings` con `espacio_id` que no existe (p. ej. 9999).
- **Resultado esperado:** `404` (`ESPACIO_NO_ENCONTRADO`); detectado por la consulta HTTP a catalog.

### CP-15 — Cancelar una reserva ajena
- **Clase de bug:** borrado de reservas ajenas.
- **Precondiciones:** existe una reserva de `carlos.mendez`; sesión de `ana.torres`.
- **Pasos:** `DELETE /bookings/{id}` de la reserva de Carlos, autenticada como Ana.
- **Resultado esperado:** `403` (`ACCESO_DENEGADO`); la reserva sigue `CONFIRMADA`.

### CP-16 — Cancelar la reserva propia libera el horario
- **Precondiciones:** Carlos tiene una reserva confirmada mañana `16:00–17:00`.
- **Pasos:** `DELETE /bookings/{id}` como Carlos; luego `GET /bookings/availability` para ese espacio/slot.
- **Resultado esperado:** `200` con `estado: "CANCELADA"`; la disponibilidad del slot pasa a `true` (la restricción de exclusión es parcial).

### CP-17 — Ocupación del día (dashboard admin)
- **Precondiciones:** sesión de admin; reservas confirmadas hoy en la semilla.
- **Pasos:** `GET /occupancy?fecha=HOY`.
- **Resultado esperado:** `200` con las reservas confirmadas del día (las que alimentan el dashboard).

### CP-18 — Flujo de UI extremo a extremo
- **Precondiciones:** stack levantado; frontend accesible.
- **Pasos:** Login como colaborador → Buscar (fecha + rango) → Reservar un espacio disponible → confirmar → ver en "Mis reservas" → cancelar. Luego login como admin → Administración → crear/editar/eliminar un espacio → ver el dashboard de ocupación.
- **Resultado esperado:** cada acción muestra feedback de éxito/error; el conflicto de horario se rechaza con mensaje claro; el CRUD y el dashboard responden.

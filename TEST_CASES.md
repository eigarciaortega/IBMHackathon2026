# Casos de Prueba — OfficeSpace

Estado de ejecución: **PASS** = correcto · **N/E** = no ejecutado en este entorno (pendiente de validación funcional).
Entorno objetivo: microservicios en 3001/3002/3003, frontend 5173, PostgreSQL 5432 con seed aplicado.

| Cobertura | Casos |
|-----------|-------|
| Autenticación | TC-01, TC-02, TC-03, TC-15 |
| Espacios (CRUD) | TC-04, TC-05, TC-06 |
| Reservas | TC-07, TC-08, TC-09 |
| Mis Reservas | TC-10 |
| Asistencia | TC-11, TC-12 |
| Dashboard | TC-13 |
| Exportaciones | TC-14 |
| Notificaciones | TC-16 |
| Auditoría | TC-17 |

---

### TC-01 — Login Administrador exitoso
- **Objetivo:** validar autenticación de un usuario ADMIN.
- **Precondiciones:** seed aplicado; auth-service activo en 3001.
- **Pasos:** 1) Ir a `/login`. 2) Email `admin@corporativoalpha.com`, password `Admin123`. 3) Iniciar sesión.
- **Resultado esperado:** HTTP 200, token JWT emitido, redirección a dashboard admin con menú administrativo visible.
- **Resultado obtenido:** PASS.

### TC-02 — Login Colaborador exitoso
- **Objetivo:** validar autenticación de un usuario COLLABORATOR.
- **Precondiciones:** seed aplicado.
- **Pasos:** 1) `/login`. 2) `colaborador@corporativoalpha.com` / `Colab123`. 3) Entrar.
- **Resultado esperado:** HTTP 200; dashboard colaborador; rutas `/admin/*` ocultas e inaccesibles.
- **Resultado obtenido:** PASS.

### TC-03 — Login con credenciales inválidas
- **Objetivo:** rechazar credenciales incorrectas sin revelar si el correo existe.
- **Precondiciones:** auth-service activo.
- **Pasos:** 1) `/login`. 2) `admin@corporativoalpha.com` / `incorrecta`. 3) Entrar.
- **Resultado esperado:** HTTP 401, mensaje "Usuario o contraseña incorrectos", sin token.
- **Resultado obtenido:** PASS.

### TC-04 — Crear espacio (ADMIN)
- **Objetivo:** alta de un espacio con recursos.
- **Precondiciones:** sesión ADMIN; catalog-service activo en 3002; recursos existentes.
- **Pasos:** 1) Espacios → Crear. 2) Nombre, tipo, capacidad>0, piso, zona, recursos válidos. 3) Guardar.
- **Resultado esperado:** HTTP 201, espacio creado en estado AVAILABLE, evento CREATE_SPACE en auditoría.
- **Resultado obtenido:** PASS.

### TC-05 — Crear espacio con recurso inválido
- **Objetivo:** validar que los `resourceIds` existan y estén ACTIVE.
- **Precondiciones:** sesión ADMIN.
- **Pasos:** 1) Crear espacio con un `resourceId` inexistente.
- **Resultado esperado:** HTTP 400 "Recursos inválidos o inactivos: …"; no se crea el espacio.
- **Resultado obtenido:** PASS.

### TC-06 — Borrado lógico de espacio
- **Objetivo:** verificar que el espacio se desactiva (no se borra físicamente).
- **Precondiciones:** sesión ADMIN; espacio sin reservas futuras.
- **Pasos:** 1) Espacios → Eliminar. 2) Confirmar en el diálogo.
- **Resultado esperado:** estado INACTIVE; ya no aparece a colaboradores; evento DISABLE_SPACE auditado.
- **Resultado obtenido:** PASS.

### TC-07 — Crear reserva válida
- **Objetivo:** crear una reserva sin conflictos.
- **Precondiciones:** sesión COLLABORATOR; espacio AVAILABLE; booking-service en 3003.
- **Pasos:** 1) Espacios → Reservar. 2) Fecha futura, 09:00–10:00, asistentes ≤ capacidad, motivo. 3) Confirmar.
- **Resultado esperado:** HTTP 201, reserva CONFIRMED; evento CREATE_BOOKING; notificación "Reserva creada".
- **Resultado obtenido:** PASS.

### TC-08 — Prevención de reservas solapadas
- **Objetivo:** rechazar una reserva que se solapa con otra confirmada.
- **Precondiciones:** existe reserva 09:00–10:00 en el espacio X.
- **Pasos:** 1) Reservar el espacio X 09:30–10:30.
- **Resultado esperado:** HTTP 409 Conflict; no se crea (garantizado por *exclusion constraint*).
- **Resultado obtenido:** PASS.

### TC-09 — Reservas consecutivas permitidas
- **Objetivo:** permitir reservas contiguas que no se solapan.
- **Precondiciones:** existe reserva 09:00–10:00 en el espacio X.
- **Pasos:** 1) Reservar el espacio X 10:00–11:00.
- **Resultado esperado:** HTTP 201 (rango semiabierto `[)`).
- **Resultado obtenido:** PASS.

### TC-10 — Cancelar mi reserva futura
- **Objetivo:** que el colaborador cancele su propia reserva.
- **Precondiciones:** reserva CONFIRMED futura del usuario.
- **Pasos:** 1) Mis Reservas → Cancelar. 2) Confirmar diálogo.
- **Resultado esperado:** estado CANCELLED; libera disponibilidad; evento CANCEL_BOOKING; notificación.
- **Resultado obtenido:** PASS.

### TC-11 — Marcar asistencia (ATTENDED)
- **Objetivo:** verificar asistencia de una reserva finalizada.
- **Precondiciones:** sesión ADMIN; reserva CONFIRMED cuya hora fin ya pasó.
- **Pasos:** 1) Reservas (Admin) → "Reservas por verificar". 2) Pulsar "Asistió".
- **Resultado esperado:** estado ATTENDED; evento MARK_ATTENDED; sube la tasa de asistencia.
- **Resultado obtenido:** PASS.

### TC-12 — Marcar NO_SHOW
- **Objetivo:** registrar inasistencia de una reserva finalizada.
- **Precondiciones:** sesión ADMIN; reserva CONFIRMED finalizada.
- **Pasos:** 1) "Reservas por verificar" → "No asistió".
- **Resultado esperado:** estado NO_SHOW; evento MARK_NO_SHOW; refleja en métricas.
- **Resultado obtenido:** PASS.

### TC-13 — Dashboard administrativo
- **Objetivo:** mostrar métricas reales calculadas on‑demand.
- **Precondiciones:** sesión ADMIN; existen reservas.
- **Pasos:** 1) Abrir Dashboard.
- **Resultado esperado:** totales de espacios, ocupación hoy, horas pico, top espacios, y Control de Asistencia (verificadas, no‑shows, % asistencia). HTTP 200.
- **Resultado obtenido:** PASS.

### TC-14 — Exportar reservas a CSV
- **Objetivo:** descargar datos en CSV (solo ADMIN).
- **Precondiciones:** sesión ADMIN.
- **Pasos:** 1) Exportar → Reservas (CSV).
- **Resultado esperado:** descarga `bookings.csv` con cabeceras; usuarios CSV sin `passwordHash`/`temporaryPassword`. `format=xlsx` → 400.
- **Resultado obtenido:** PASS.

### TC-15 — Acceso no autorizado (sin token)
- **Objetivo:** proteger endpoints con JWT.
- **Precondiciones:** booking-service activo.
- **Pasos:** 1) `GET /api/v1/bookings` sin header Authorization.
- **Resultado esperado:** HTTP 401 Unauthorized.
- **Resultado obtenido:** PASS.

### TC-16 — Notificaciones internas
- **Objetivo:** generar y consultar notificaciones propias.
- **Precondiciones:** colaborador con una reserva creada.
- **Pasos:** 1) Crear reserva. 2) Abrir Notificaciones. 3) Marcar como leída.
- **Resultado esperado:** aparece "Reserva creada"; al marcar leída baja el contador `unread`; un usuario no ve notificaciones de otros (403 en `:id/read` ajeno).
- **Resultado obtenido:** PASS.

### TC-17 — Auditoría (solo ADMIN)
- **Objetivo:** consultar el registro de eventos críticos.
- **Precondiciones:** sesión ADMIN; eventos generados (login, reservas…).
- **Pasos:** 1) Auditoría → filtrar por acción (ej. CREATE_BOOKING).
- **Resultado esperado:** lista paginada con usuario, acción, entidad, resultado, IP, fecha; un COLLABORATOR recibe 403 en `/audit`.
- **Resultado obtenido:** PASS.

---

**Resumen:** 17 casos de prueba; cobertura de Login, CRUD de espacios, Reservas, Mis Reservas, Asistencia, Dashboard, Exportaciones, Notificaciones y Auditoría.

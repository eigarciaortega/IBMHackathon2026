# 📋 Casos de Prueba — OfficeSpace

**Proyecto:** OfficeSpace — Gestión Híbrida Inteligente  
**Versión:** 1.0.0  
**Fecha:** Junio 2026  

---

## CP-001 — Login exitoso como Colaborador

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | El sistema está levantado. El usuario `carlos.mendez@corporativoalpha.com` existe en la BD. |
| **Pasos** | 1. Abrir `index.html`. 2. Ingresar email: `carlos.mendez@corporativoalpha.com`. 3. Ingresar password: `User123`. 4. Clic en "Iniciar Sesión". |
| **Resultado Esperado** | El sistema redirige a `search.html`. El navbar muestra el email y el badge "Colaborador". |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-002 — Login exitoso como Administrador

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | El sistema está levantado. El usuario `admin@corporativoalpha.com` existe en la BD. |
| **Pasos** | 1. Abrir `index.html`. 2. Ingresar email: `admin@corporativoalpha.com`. 3. Ingresar password: `Admin123`. 4. Clic en "Iniciar Sesión". |
| **Resultado Esperado** | El sistema redirige a `admin.html`. El navbar muestra el badge "Admin". |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-003 — Login con credenciales inválidas

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | El sistema está levantado. |
| **Pasos** | 1. Abrir `index.html`. 2. Ingresar email: `hacker@evil.com`. 3. Ingresar password: `wrong`. 4. Clic en "Iniciar Sesión". |
| **Resultado Esperado** | El sistema muestra mensaje de error "Credenciales inválidas". El usuario permanece en la pantalla de login. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-004 — Acceso sin token a endpoint protegido

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | El sistema está levantado. |
| **Pasos** | 1. Ejecutar: `curl http://localhost:3000/spaces` (sin header Authorization). |
| **Resultado Esperado** | HTTP 401. Body: `{"error":"Acceso denegado: token no proporcionado"}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-005 — Crear reserva sin solapamiento (caso feliz)

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Usuario autenticado como Colaborador. Espacio ID 1 disponible el 2026-07-10. |
| **Pasos** | 1. POST `/bookings` con `space_id:1, fecha:2026-07-10, hora_inicio:09:00, hora_fin:11:00, asistentes:4`. |
| **Resultado Esperado** | HTTP 201. Body contiene `id` de la nueva reserva. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-006 — Solapamiento total (reserva dentro de otra)

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Existe una reserva en espacio 1 el 2026-07-10 de 09:00 a 11:00. |
| **Pasos** | 1. POST `/bookings` con `space_id:1, fecha:2026-07-10, hora_inicio:09:30, hora_fin:10:30, asistentes:2`. |
| **Resultado Esperado** | HTTP 409. Body: `{"error":"Conflicto de horario..."}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-007 — Solapamiento parcial (el "Abrazo de Horarios")

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Existe una reserva en espacio 1 el 2026-07-10 de 09:00 a 10:00. |
| **Pasos** | 1. POST `/bookings` con `space_id:1, fecha:2026-07-10, hora_inicio:09:30, hora_fin:11:00, asistentes:2`. |
| **Resultado Esperado** | HTTP 409. El sistema detecta el solapamiento parcial y rechaza la reserva. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-008 — Reservas consecutivas (límite inclusivo/exclusivo)

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Existe una reserva en espacio 1 el 2026-07-10 de 09:00 a 10:00. |
| **Pasos** | 1. POST `/bookings` con `hora_inicio:10:00, hora_fin:11:00`. |
| **Resultado Esperado** | HTTP 201. Las reservas consecutivas (sin traslape) deben permitirse. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S2 — Alta |

---

## CP-009 — Reserva en fecha pasada

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Usuario autenticado. |
| **Pasos** | 1. POST `/bookings` con `fecha: 2020-01-01`. |
| **Resultado Esperado** | HTTP 400. Body: `{"error":"No se pueden crear reservas en fechas pasadas"}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S2 — Alta |

---

## CP-010 — Hora de fin menor que hora de inicio

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Usuario autenticado. |
| **Pasos** | 1. POST `/bookings` con `hora_inicio:11:00, hora_fin:09:00`. |
| **Resultado Esperado** | HTTP 400. Body: `{"error":"La hora de fin debe ser mayor que la hora de inicio"}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S2 — Alta |

---

## CP-011 — Capacidad excedida

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | El espacio 1 tiene capacidad de 8 personas. |
| **Pasos** | 1. POST `/bookings` con `space_id:1, asistentes:10`. |
| **Resultado Esperado** | HTTP 400. Body: `{"error":"Capacidad excedida: el espacio 'Sala Creativa' permite máximo 8 personas..."}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-012 — Colaborador intenta crear un espacio (control de permisos)

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Usuario autenticado como Colaborador (token con `rol: COLABORADOR`). |
| **Pasos** | 1. POST `/spaces` con datos de un nuevo espacio y el token de Colaborador. |
| **Resultado Esperado** | HTTP 403. Body: `{"error":"Acceso denegado: se requiere rol de Administrador"}` |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S1 — Crítica |

---

## CP-013 — Cancelar reserva ajena (Colaborador)

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | La reserva ID 1 pertenece al usuario `carlos.mendez`. El usuario `ana.torres` está autenticado. |
| **Pasos** | 1. DELETE `/bookings/1` con el token de `ana.torres`. |
| **Resultado Esperado** | HTTP 403. Solo el dueño o un Admin puede cancelar. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S2 — Alta |

---

## CP-014 — Filtros de búsqueda por tipo y capacidad

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Existen espacios de tipo SALA y DESK con distintas capacidades. |
| **Pasos** | 1. GET `/spaces?tipo=SALA&capacidad_min=6` con token válido. |
| **Resultado Esperado** | HTTP 200. Solo retorna salas con capacidad >= 6. No aparecen escritorios ni salas más pequeñas. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S3 — Media |

---

## CP-015 — Notificación en tiempo real al crear reserva

| Campo | Detalle |
|-------|---------|
| **Precondiciones** | Dos navegadores abiertos con sesiones distintas. WebSocket conectado. |
| **Pasos** | 1. Usuario A crea una reserva. 2. Observar el navegador del Usuario A. |
| **Resultado Esperado** | Aparece notificación en pantalla: "🎉 Reserva confirmada — Sala Creativa, 2026-07-10" sin recargar la página. |
| **Resultado Obtenido** | ✅ Correcto |
| **Severidad** | S3 — Media |

# Bug Report - Defectos prevenidos

Esta tabla documenta defectos prevenidos o regresiones esperadas tomando como referencia el "Buggy Controller" del reto. No implica que todos esten presentes en la version actual.

| ID Bug | Titulo del defecto | Severidad | Pasos para reproducir | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | Filtro de capacidad ignorado | Alta | 1. Consultar disponibilidad con `attendees=10`. 2. Revisar espacios con capacidad menor. | Solo deben regresar espacios con `capacity >= 10`. | En version actual el filtro se aplica en disponibilidad. | Prevenido |
| BUG-002 | Solapamiento mal detectado | Critica | 1. Crear reserva 09:00-10:00. 2. Intentar 09:30-10:30 en mismo espacio. | Debe responder 409. | La regla `new_start < existing_end AND new_end > existing_start` cubre el caso. | Cubierto por prueba |
| BUG-003 | Status code incorrecto ante conflicto | Alta | 1. Provocar reserva solapada. 2. Revisar status HTTP. | Debe responder 409 Conflict. | Booking-service responde 409 para conflicto de reserva. | Prevenido |
| BUG-004 | Hora final menor que hora inicial | Alta | 1. Enviar reserva con `startTime=12:00` y `endTime=09:00`. | Debe responder 400. | La validacion de intervalo rechaza horarios invalidos. | Cubierto por prueba |
| BUG-005 | Capacidad excedida permitida | Alta | 1. Elegir espacio con capacidad 3. 2. Reservar para 5 asistentes. | Debe responder 400. | Booking-service valida contra capacidad real del espacio. | Prevenido |
| BUG-006 | Falta de autenticacion en catalogo | Alta | 1. Llamar `GET /spaces` sin token. | Debe responder 401. | Catalog-service protege la ruta con JWT. | Cubierto por prueba |
| BUG-007 | Eliminacion de espacios sin permisos | Alta | 1. Iniciar sesion como COLABORADOR. 2. Enviar `DELETE /spaces/:id`. | Debe responder 403. | Catalog-service limita acciones de escritura a ADMINISTRADOR. | Prevenido |
| BUG-008 | Cancelacion de reserva ajena | Alta | 1. Crear reserva con usuario A. 2. Intentar cancelar con usuario B. | Debe responder 403. | Booking-service valida propietario o ADMINISTRADOR. | Cubierto por prueba |
| BUG-009 | Alpha Assistant recomienda espacio ocupado | Critica | 1. Reservar un espacio en horario dado. 2. Buscar lo mismo por asistente. | El espacio ocupado no debe aparecer. | Assistant usa la misma logica de disponibilidad y excluye reservas ACTIVE solapadas. | No reproducido en version actual |
| BUG-010 | Dashboard expuesto a colaborador | Media | 1. Iniciar sesion como COLABORADOR. 2. Consultar `/dashboard/analytics`. | Debe responder 403. | Booking-service requiere rol ADMINISTRADOR. | Prevenido |
| BUG-011 | Busqueda del asistente sin trazabilidad | Media | 1. Enviar `POST /assistant/search`. 2. Revisar `assistant_logs`. | Debe registrar usuario, query, intent y filtros detectados. | Assistant registra busquedas en `assistant_logs`. | Cubierto por prueba |
| BUG-012 | Reserva consecutiva bloqueada por falso positivo | Alta | 1. Crear reserva 09:00-10:00. 2. Intentar 10:00-11:00. | Debe permitir la reserva. | La regla de solapamiento permite intervalos consecutivos. | Prevenido |

# Manual Test Cases - OfficeSpace

| ID | Nombre del caso | Precondiciones | Pasos | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- |
| TC-001 | Login admin exitoso | Docker levantado y usuario admin semilla disponible | 1. Abrir frontend. 2. Ingresar `admin@corporativoalpha.com` / `Admin123`. 3. Enviar login. | Se guarda token, se muestra sesion ADMINISTRADOR y se abre Dashboard. | Alta |
| TC-002 | Login colaborador exitoso | Docker levantado y usuario colaborador semilla disponible | 1. Abrir frontend. 2. Ingresar `carlos.mendez@corporativoalpha.com` / `User123`. 3. Enviar login. | Se guarda token, se muestra rol COLABORADOR y se abre Buscar. | Alta |
| TC-003 | Login invalido | Docker levantado | 1. Ingresar email valido con password incorrecto. 2. Enviar login. | Auth responde 401 y frontend muestra error claro. | Alta |
| TC-004 | GET /spaces sin token | Catalog-service levantado | 1. Ejecutar `GET /spaces` sin Authorization. | Respuesta 401 por token faltante o invalido. | Alta |
| TC-005 | POST /spaces como colaborador | Colaborador autenticado con token valido | 1. Enviar `POST /spaces` con payload valido y token colaborador. | Respuesta 403. No se crea espacio. | Alta |
| TC-006 | Crear reserva exitosa | Usuario autenticado, espacio disponible y capacidad suficiente | 1. Consultar disponibilidad. 2. Enviar `POST /bookings` con intervalo libre. | Respuesta 201 y reserva ACTIVE creada. | Alta |
| TC-007 | Rechazar reserva solapada | Existe reserva ACTIVE para el mismo espacio e intervalo | 1. Crear reserva de 09:00 a 10:00. 2. Intentar otra de 09:30 a 10:30 en el mismo espacio. | Respuesta 409 con mensaje de conflicto. | Critica |
| TC-008 | Permitir reserva consecutiva | Existe reserva ACTIVE de 09:00 a 10:00 | 1. Intentar reservar el mismo espacio de 10:00 a 11:00. | Respuesta 201. No se considera solapamiento. | Critica |
| TC-009 | Rechazar capacidad excedida | Espacio existente con capacidad menor al request | 1. Enviar `POST /bookings` con `attendees` mayor a capacidad del espacio. | Respuesta 400 por capacidad excedida. | Alta |
| TC-010 | Rechazar fecha pasada | Usuario autenticado | 1. Enviar reserva para fecha anterior a la actual. | Respuesta 400 si la regla esta habilitada; si no esta habilitada, registrar como brecha QA. | Media |
| TC-011 | Cancelar reserva propia | Usuario autenticado con reserva futura ACTIVE propia | 1. Enviar `DELETE /bookings/:id` sobre su reserva. | Respuesta 200 y reserva pasa a CANCELLED. | Alta |
| TC-012 | Bloquear cancelacion de reserva ajena | Dos usuarios y una reserva futura creada por otro usuario | 1. Con token de usuario B, enviar `DELETE /bookings/:id` de usuario A. | Respuesta 403. La reserva no cambia de estado. | Alta |
| TC-013 | Alpha Assistant sugiere espacios disponibles | Usuario autenticado y espacios semilla disponibles | 1. Enviar `POST /assistant/search` con "Necesito una sala para 5 personas manana en la manana con proyector". | Respuesta 200 con `suggestedSpaces` y filtros interpretados. | Alta |
| TC-014 | Alpha Assistant no sugiere espacios ocupados | Existe reserva ACTIVE que se solapa con el request | 1. Reservar un espacio sugerido. 2. Repetir la busqueda del asistente. | El espacio ocupado no aparece en `suggestedSpaces`. | Critica |
| TC-015 | Dashboard admin bloqueado para colaborador | Colaborador autenticado | 1. Intentar abrir Dashboard en frontend o llamar `/dashboard/analytics`. | Frontend oculta Dashboard y backend responde 403. | Alta |
| TC-016 | Logout oculta vistas protegidas | Usuario autenticado | 1. Cerrar sesion. | Se limpia `localStorage`, solo queda Login visible y Alpha Assistant se oculta. | Alta |
| TC-017 | Dashboard muestra metricas del asistente | Admin autenticado y al menos una busqueda del asistente registrada | 1. Abrir Dashboard. 2. Consultar `/dashboard/analytics`. | Se ven `assistantSearchesTotal`, recursos solicitados y busquedas recientes. | Media |
| TC-018 | Swagger disponible por servicio | Docker levantado | 1. Abrir `/api-docs` en auth, catalog y booking. | Swagger UI carga con documentacion basica. | Media |
| TC-019 | Rechazar reserva hoy con hora pasada | Usuario autenticado y fecha actual del servidor conocida | 1. Enviar `GET /availability` o `POST /bookings` con `date` igual a hoy y `startTime` menor o igual a la hora actual. | Respuesta 400 con mensaje `La hora de inicio debe ser posterior a la hora actual.` | Alta |

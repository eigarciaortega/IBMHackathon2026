# QA Strategy - OfficeSpace

## Objetivo

La estrategia de QA de OfficeSpace busca reducir riesgos en el flujo critico de una oficina hibrida: autenticar usuarios, consultar espacios, reservar sin conflictos, respetar roles y convertir datos de uso en decisiones de negocio.

El enfoque esta alineado al reto "The Office Auditor": no solo se prueba que la app funcione, sino que se documentan defectos tipicos de un controlador defectuoso, escenarios de negocio y una forma ligera de automatizar validaciones con CI/CD.

## Enfoque general de QA

OfficeSpace combina tres capas de validacion:

- Pruebas manuales: validan experiencia completa de usuario en frontend, navegacion por rol, formularios, mensajes y flujos de negocio.
- API testing: valida contratos HTTP, status codes, reglas de autorizacion, payloads y casos limite sin depender de la interfaz.
- BDD/Gherkin: describe reglas de negocio en lenguaje entendible para desarrollo, QA y stakeholders.

Esta combinacion permite cubrir tanto defectos tecnicos como fallas de negocio. La prioridad no es tener muchas pruebas, sino cubrir los puntos donde un bug tendria mayor impacto operativo.

## Riesgos criticos del negocio

Los riesgos principales son:

- Usuarios sin autorizacion creando, editando o eliminando espacios.
- Reservas solapadas que asignen el mismo espacio a dos equipos al mismo tiempo.
- Reservas con capacidad mayor a la del espacio.
- Fechas u horarios invalidos que generen datos imposibles.
- Dashboard mostrando informacion sensible a colaboradores.
- Alpha Assistant recomendando espacios ocupados o con filtros incorrectos.
- Frontend dejando visibles secciones protegidas despues de cerrar sesion.

## Por que el motor de reservas es el punto mas critico

El motor de reservas concentra la regla central del producto: un espacio solo puede estar disponible si no existe una reserva ACTIVE que se solape con el nuevo intervalo.

La regla usada es:

```text
new_start < existing_end AND new_end > existing_start
```

Esta regla evita conflictos reales de agenda y permite reservas consecutivas. Por ejemplo, una reserva de 09:00 a 10:00 no debe bloquear otra de 10:00 a 11:00, pero si debe bloquear una de 09:30 a 10:30.

Un error en esta regla afecta directamente la confianza del usuario, la operacion de la oficina y la calidad del dashboard.

## Referencia al Buggy Controller

El "Buggy Controller" del reto se uso como referencia de defectos prevenidos. La estrategia considera fallas comunes como:

- ignorar el filtro de capacidad;
- detectar mal solapamientos;
- responder status code incorrecto ante conflictos;
- aceptar hora final menor o igual a hora inicial;
- permitir reservas con capacidad excedida;
- omitir autenticacion;
- permitir cancelaciones o eliminaciones sin permisos.

Estos defectos se traducen en casos manuales, escenarios Gherkin y una coleccion Postman para validar regresiones.

## Que se prueba por modulo

### Autenticacion

- Login exitoso de ADMINISTRADOR.
- Login exitoso de COLABORADOR.
- Login invalido con 401.
- Persistencia de token en `localStorage`.
- Limpieza de sesion al cerrar sesion.

### Permisos

- Endpoints protegidos responden 401 sin token.
- Acciones administrativas responden 403 para COLABORADOR.
- Dashboard admin no se muestra a colaboradores.
- CRUD de espacios solo aparece para ADMINISTRADOR.

### Reservas

- Creacion exitosa con datos validos.
- Rechazo de solapamiento con 409.
- Reserva consecutiva permitida.
- Capacidad excedida rechazada con 400.
- Fechas u horarios invalidos rechazados con 400.
- Cancelacion propia permitida.
- Cancelacion ajena bloqueada con 403.

### Capacidad

- El filtro `attendees` o `minCapacity` debe devolver espacios con capacidad suficiente.
- `POST /bookings` debe validar capacidad contra el espacio real.

### Fechas y horarios

- `endTime` debe ser mayor que `startTime`.
- La disponibilidad debe aplicar la regla de no solapamiento solo contra reservas ACTIVE.
- Las cancelaciones deben respetar reglas de permisos y estado.

### Dashboard

- Solo ADMINISTRADOR puede consultar `/dashboard/today` y `/dashboard/analytics`.
- Las metricas deben incluir reservas, ocupacion, horarios pico, demanda por tipo y senales de Alpha Assistant.
- Si hay pocos datos, el frontend debe mostrar mensajes elegantes y no romper la pantalla.

### Alpha Assistant

- Interpreta lenguaje natural en filtros.
- Devuelve `suggestedSpaces` reales.
- No recomienda espacios con reservas ACTIVE solapadas.
- Permite reservar desde una sugerencia.
- Guarda busquedas en `assistant_logs`.
- Mantiene la funcionalidad de ocultar/mostrar en frontend.

## Diferencia entre pruebas manuales, API testing y BDD

- Manual: comprueba el flujo visible para el usuario, mensajes, navegacion y comportamiento de interfaz.
- API testing: comprueba reglas de backend de forma directa y repetible con status codes y payloads.
- BDD: documenta reglas esperadas de negocio en lenguaje comun, util para prevenir malentendidos entre producto, QA y desarrollo.

## Innovacion QA: CI/CD con GitHub Actions

La innovacion elegida es un pipeline ligero con GitHub Actions. Para este proyecto de hackathon, CI/CD es defendible porque:

- valida los tres microservicios en cada push o pull request;
- detecta errores de sintaxis con `node --check`;
- instala dependencias por servicio;
- valida `docker compose config`;
- no depende de levantar toda la app ni de un entorno pesado;
- crea una base para agregar pruebas automatizadas futuras.

El objetivo del pipeline no es reemplazar QA manual, sino prevenir regresiones obvias antes de una demo o entrega.

## Criterio de salida de QA

Una entrega se considera lista para demo si:

- `docker compose config` pasa;
- los archivos JS principales pasan `node --check`;
- login admin y colaborador funcionan;
- roles y dashboard se comportan correctamente;
- reservas no permiten solapamiento;
- Alpha Assistant devuelve sugerencias y respeta disponibilidad;
- Swagger y Postman permiten validar los endpoints principales.

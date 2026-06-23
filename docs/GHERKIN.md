# Escenarios BDD / Gherkin - OfficeSpace

```gherkin
Feature: Motor de reservas de espacios
  Como colaborador de una oficina hibrida
  Quiero reservar espacios disponibles
  Para asegurar que mi equipo tenga un lugar adecuado sin conflictos

  Scenario: Rechazar reserva solapada
    Dado que existe una reserva ACTIVE para "Sala Creativa" de 09:00 a 10:00
    Cuando intento reservar "Sala Creativa" de 09:30 a 10:30
    Entonces la API debe responder 409
    Y la nueva reserva no debe ser creada

  Scenario: Permitir reserva consecutiva
    Dado que existe una reserva ACTIVE para "Sala Creativa" de 09:00 a 10:00
    Cuando intento reservar "Sala Creativa" de 10:00 a 11:00
    Entonces la API debe responder 201
    Y la reserva debe quedar en estado ACTIVE

  Scenario: Rechazar capacidad excedida
    Dado que "Sala de Entrevistas" tiene capacidad para 3 personas
    Cuando intento reservarla para 5 personas
    Entonces la API debe responder 400
    Y debe indicar que la cantidad de asistentes excede la capacidad

  Scenario: Rechazar reserva hoy con hora pasada
    Dado que la fecha de la reserva es hoy
    Y la hora actual del servidor es posterior o igual a la hora de inicio solicitada
    Cuando intento consultar disponibilidad o crear una reserva con ese horario
    Entonces la API debe responder 400
    Y debe indicar "La hora de inicio debe ser posterior a la hora actual."
```

```gherkin
Feature: Seguridad por roles
  Como administrador del sistema
  Quiero que las acciones sensibles esten protegidas
  Para evitar cambios no autorizados en espacios y metricas

  Scenario: Bloquear acciones admin a colaborador
    Dado que inicie sesion como COLABORADOR
    Cuando intento crear un espacio con POST /spaces
    Entonces la API debe responder 403
    Y el espacio no debe existir en el catalogo

  Scenario: Ocultar dashboard a usuarios no autenticados
    Dado que no existe token en localStorage
    Cuando abro el frontend
    Entonces solo debo ver la vista Login
    Y el Dashboard debe estar oculto

  Scenario: Ocultar dashboard a colaboradores
    Dado que inicie sesion como COLABORADOR
    Cuando se renderiza la navegacion principal
    Entonces no debo ver el boton Dashboard
    Y si intento consultar /dashboard/analytics la API debe responder 403
```

```gherkin
Feature: Alpha Assistant
  Como usuario de OfficeSpace
  Quiero pedir espacios en lenguaje natural
  Para recibir opciones disponibles y reservar rapidamente

  Scenario: Reservar desde Alpha Assistant
    Dado que inicie sesion como COLABORADOR
    Y existe al menos una sala disponible con proyector
    Cuando escribo "Necesito una sala para 5 personas manana en la manana con proyector"
    Y presiono "Buscar sugerencias"
    Entonces debo ver tarjetas de suggestedSpaces
    Cuando presiono "Reservar" en una sugerencia
    Entonces se debe crear una reserva con POST /bookings
    Y debo ver un mensaje de exito

  Scenario: No recomendar espacios ocupados desde Alpha Assistant
    Dado que "Sala Creativa" ya tiene una reserva ACTIVE de 09:00 a 12:00 manana
    Cuando pregunto por una sala para 5 personas manana en la manana con proyector
    Entonces "Sala Creativa" no debe aparecer en suggestedSpaces
    Y solo deben mostrarse espacios realmente disponibles
```

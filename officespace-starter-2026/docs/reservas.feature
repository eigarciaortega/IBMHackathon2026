# language: es

Característica: Motor de Reservas — Validación de No-Solapamiento
  Como colaborador de Corporativo Alpha
  Quiero reservar espacios de trabajo
  Para garantizar que no existan conflictos de horario

  Antecedentes:
    Dado que el sistema está disponible
    Y que existen los siguientes espacios:
      | id | nombre          | tipo | capacidad |
      | 1  | Sala Creativa   | SALA | 8         |
      | 2  | Escritorio Ventana | DESK | 1      |
    Y que el usuario "carlos.mendez@corporativoalpha.com" está autenticado

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Reserva exitosa en espacio libre
    Dado que el espacio 1 no tiene reservas el "2026-07-10"
    Cuando creo una reserva con los datos:
      | space_id | fecha      | hora_inicio | hora_fin | asistentes |
      | 1        | 2026-07-10 | 09:00       | 11:00    | 4          |
    Entonces el sistema responde con código 201
    Y la respuesta contiene el campo "id" de la reserva

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por solapamiento total
    Dado que existe una reserva en espacio 1 el "2026-07-10" de "09:00" a "11:00"
    Cuando intento reservar el espacio 1 el "2026-07-10" de "09:30" a "10:30" para 2 personas
    Entonces el sistema responde con código 409
    Y el mensaje de error contiene "Conflicto de horario"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por solapamiento parcial — inicio antes, fin durante
    Dado que existe una reserva en espacio 1 el "2026-07-10" de "10:00" a "12:00"
    Cuando intento reservar el espacio 1 el "2026-07-10" de "09:00" a "11:00" para 3 personas
    Entonces el sistema responde con código 409
    Y el mensaje de error contiene "Conflicto de horario"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por solapamiento parcial — inicio durante, fin después
    Dado que existe una reserva en espacio 1 el "2026-07-10" de "09:00" a "10:00"
    Cuando intento reservar el espacio 1 el "2026-07-10" de "09:30" a "11:00" para 2 personas
    Entonces el sistema responde con código 409
    Y el mensaje de error contiene "Conflicto de horario"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Reservas consecutivas permitidas
    Dado que existe una reserva en espacio 1 el "2026-07-10" de "09:00" a "10:00"
    Cuando intento reservar el espacio 1 el "2026-07-10" de "10:00" a "11:00" para 2 personas
    Entonces el sistema responde con código 201
    Y la respuesta contiene el campo "id" de la reserva

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por fecha en el pasado
    Cuando intento reservar el espacio 1 el "2020-01-01" de "09:00" a "11:00" para 2 personas
    Entonces el sistema responde con código 400
    Y el mensaje de error contiene "fechas pasadas"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por hora de fin menor a hora de inicio
    Cuando intento reservar el espacio 1 el "2026-07-10" de "11:00" a "09:00" para 2 personas
    Entonces el sistema responde con código 400
    Y el mensaje de error contiene "hora de fin debe ser mayor"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por capacidad excedida
    Cuando intento reservar el espacio 1 el "2026-07-10" de "09:00" a "11:00" para 10 personas
    Entonces el sistema responde con código 400
    Y el mensaje de error contiene "Capacidad excedida"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Rechazo por falta de autenticación
    Dado que no tengo token JWT
    Cuando intento reservar el espacio 1 sin header Authorization
    Entonces el sistema responde con código 401
    Y el mensaje de error contiene "token no proporcionado"

  # ──────────────────────────────────────────────────────────────────────────
  Escenario: Colaborador no puede crear espacios
    Dado que el usuario tiene rol "COLABORADOR"
    Cuando intento crear un espacio con nombre "Sala Prueba"
    Entonces el sistema responde con código 403
    Y el mensaje de error contiene "rol de Administrador"

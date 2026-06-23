# language: es
Característica: Motor de reservas
  Como colaborador
  Quiero reservar espacios sin conflictos
  Para asegurar su uso evitando solapamientos

  Antecedentes:
    Dado que inicié sesión como colaborador
    Y existe el espacio "Sala Alfa" con capacidad 10

  Escenario: Crear una reserva válida
    Cuando reservo "Sala Alfa" el "2026-12-01" de "09:00" a "10:00" para 4 asistentes
    Entonces recibo un código HTTP 201
    Y la reserva queda asociada a mi usuario
    Y la reserva aparece en "Mis reservas"

  Escenario: Rechazo de reserva solapada
    Dado que existe una reserva de "Sala Alfa" el "2026-12-01" de "09:00" a "10:00"
    Cuando reservo "Sala Alfa" el "2026-12-01" de "09:30" a "10:30" para 2 asistentes
    Entonces recibo un código HTTP 409
    Y la reserva no se crea

  Escenario: Reservas consecutivas permitidas (límites exclusivos)
    Dado que existe una reserva de "Sala Alfa" el "2026-12-01" de "09:00" a "10:00"
    Cuando reservo "Sala Alfa" el "2026-12-01" de "10:00" a "11:00" para 2 asistentes
    Entonces recibo un código HTTP 201

  Escenario: Asistentes mayores a la capacidad
    Cuando reservo "Sala Alfa" el "2026-12-01" de "09:00" a "10:00" para 11 asistentes
    Entonces recibo un código HTTP 400
    Y se indica el rango válido de asistentes

  Escenario: Reserva en el pasado
    Cuando reservo "Sala Alfa" el "2020-01-01" de "09:00" a "10:00" para 2 asistentes
    Entonces recibo un código HTTP 400

  Escenario: Reservar un espacio inexistente
    Cuando reservo el espacio con id 99999 el "2026-12-01" de "09:00" a "10:00" para 2 asistentes
    Entonces recibo un código HTTP 404

  Escenario: Cancelar una reserva propia futura
    Dado que tengo una reserva futura activa
    Cuando cancelo esa reserva
    Entonces recibo un código HTTP 200
    Y su estado cambia a "Cancelado"

  Escenario: Intentar cancelar una reserva ajena
    Dado que existe una reserva de otro usuario
    Cuando intento cancelar esa reserva
    Entonces recibo un código HTTP 403
    Y la reserva no se modifica

# language: es
Característica: Motor de reservas sin solapamiento
  Como colaborador de Corporativo Alpha
  Quiero reservar espacios sin chocar con otras reservas
  Para evitar la duplicidad de reservas que ocurría con el Excel compartido

  Antecedentes:
    Dado que inicié sesión como "carlos.mendez@corporativoalpha.com"
    Y existe una sala "Sala QA" con capacidad 6
    Y la sala "Sala QA" tiene una reserva confirmada mañana de 16:00 a 17:00

  Escenario: Rechazar una reserva que se solapa parcialmente
    Cuando intento reservar "Sala QA" mañana de 16:30 a 17:30 para 2 personas
    Entonces la respuesta es 409
    Y el código de error es "RESERVA_SOLAPADA"

  Escenario: Rechazar una reserva que envuelve a otra (abrazo)
    Cuando intento reservar "Sala QA" mañana de 15:00 a 18:00 para 2 personas
    Entonces la respuesta es 409
    Y el código de error es "RESERVA_SOLAPADA"

  Escenario: Permitir reservas consecutivas con límites exclusivos
    Cuando intento reservar "Sala QA" mañana de 17:00 a 18:00 para 2 personas
    Entonces la respuesta es 201
    Y el estado de la reserva es "CONFIRMADA"

  Escenario: Rechazar una reserva en el pasado
    Cuando intento reservar "Sala QA" ayer de 09:00 a 10:00 para 2 personas
    Entonces la respuesta es 400
    Y el código de error es "FECHA_PASADA"

  Escenario: Rechazar una reserva con la hora de fin menor o igual al inicio
    Cuando intento reservar "Sala QA" mañana de 10:00 a 09:00 para 2 personas
    Entonces la respuesta es 400
    Y el código de error es "HORARIO_INVALIDO"

# language: es
Característica: Validación de capacidad por HTTP contra el catálogo
  Como sistema de reservas
  Quiero validar que los asistentes no superen la capacidad del espacio
  Para no aceptar reservas imposibles de acomodar

  Antecedentes:
    Dado que inicié sesión como "carlos.mendez@corporativoalpha.com"
    Y existe un escritorio "Desk A1" con capacidad 1

  Escenario: Rechazar cuando los asistentes superan la capacidad
    Cuando intento reservar "Desk A1" mañana de 09:00 a 10:00 para 5 personas
    Entonces la respuesta es 400
    Y el código de error es "CAPACIDAD_EXCEDIDA"

  Escenario: Aceptar cuando los asistentes caben en la capacidad
    Cuando intento reservar "Desk A1" mañana de 09:00 a 10:00 para 1 persona
    Entonces la respuesta es 201

  Escenario: Rechazar la reserva si el espacio no existe en el catálogo
    Cuando intento reservar el espacio inexistente 9999 mañana de 09:00 a 10:00 para 1 persona
    Entonces la respuesta es 404
    Y el código de error es "ESPACIO_NO_ENCONTRADO"

# language: es
Característica: Administración de espacios y reservas
  Como administrador
  Quiero gestionar el catálogo de espacios y supervisar las reservas
  Para mantener actualizado el corporativo

  Antecedentes:
    Dado que inicié sesión como administrador

  Escenario: Crear un espacio con recursos
    Cuando creo el espacio "Sala Gamma" tipo "Sala de juntas" capacidad 12 piso 3 ubicación "Ala oeste" con recursos "Proyector, Aire acondicionado"
    Entonces recibo un código HTTP 201
    Y el espacio aparece en la tabla con sus recursos
    Y su identificador fue generado automáticamente por la base de datos

  Escenario: Validación al crear espacio con datos inválidos
    Cuando creo un espacio con capacidad 0 y sin ubicación
    Entonces recibo un código HTTP 400
    Y se indican los campos a corregir
    Y no se persiste ningún cambio

  Escenario: Un colaborador no puede crear espacios
    Dado que inicié sesión como colaborador
    Cuando intento crear un espacio
    Entonces recibo un código HTTP 403

  Escenario: Eliminar un espacio con confirmación
    Dado que existe el espacio "Sala Gamma"
    Cuando solicito eliminar "Sala Gamma"
    Entonces el sistema pide una confirmación explícita
    Y al confirmar recibo un código HTTP 200
    Y el espacio desaparece de la tabla

  Escenario: Ver el tablero de ocupación del día
    Cuando consulto el tablero de ocupación
    Entonces recibo un código HTTP 200
    Y cada espacio muestra su estado "ocupado" o "libre"

  Escenario: El administrador ve y elimina todas las reservas
    Dado que existen reservas de varios usuarios
    Cuando consulto "Todas las reservas"
    Entonces veo las reservas de todos los usuarios
    Y puedo eliminar cualquiera de ellas con código HTTP 200

  Escenario: El administrador edita la reserva de un colaborador
    Dado que existe una reserva creada por un colaborador
    Cuando edito esa reserva a un horario sin solapamiento
    Entonces recibo un código HTTP 200
    Y la reserva queda actualizada con los nuevos datos

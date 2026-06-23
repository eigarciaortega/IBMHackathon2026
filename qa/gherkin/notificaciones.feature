# language: es
Característica: Notificaciones en tiempo real para el administrador
  Como administrador
  Quiero recibir una alerta cuando ocurre una acción relevante
  Para tener visibilidad inmediata de reservas y cambios en el catálogo

  Antecedentes:
    Dado que el administrador inició sesión

  Escenario: Una reserva nueva notifica al administrador
    Dado que el administrador está suscrito al flujo de notificaciones
    Cuando un colaborador crea una reserva
    Entonces el administrador recibe un evento "RESERVA_CREADA" en tiempo real
    Y el contador de no leídas aumenta en uno

  Escenario: El alta de un espacio notifica al administrador
    Dado que el administrador está suscrito al flujo de notificaciones
    Cuando el administrador crea un espacio
    Entonces el administrador recibe un evento "ESPACIO_CREADO" en tiempo real

  Escenario: El historial expone las notificaciones y las no leídas
    Cuando el administrador consulta GET /notifications
    Entonces la respuesta incluye la lista de notificaciones y el conteo "no_leidas"

  Escenario: Marcar como leídas pone el contador en cero
    Dado que hay notificaciones sin leer
    Cuando el administrador hace POST /notifications/read
    Entonces el conteo de no leídas queda en cero

  Escenario: Un colaborador no puede acceder a las notificaciones
    Cuando un colaborador consulta GET /notifications
    Entonces el sistema responde 403 ACCESO_DENEGADO

  Escenario: El flujo en tiempo real exige un token de administrador
    Cuando alguien abre GET /notifications/stream sin un token de administrador
    Entonces el sistema responde 401 o 403 y no abre el flujo

# language: es
Característica: Salas y registro de asistencia
  Como usuario del sistema
  Quiero consultar las salas y sus reuniones y registrar mi asistencia
  Para conocer la disponibilidad y dejar constancia de la asistencia

  Antecedentes:
    Dado que inicié sesión como colaborador
    Y existen salas registradas

  Escenario: Ver las salas y si tienen reuniones programadas
    Cuando abro la vista de "Salas"
    Entonces veo todas las salas existentes
    Y cada sala indica si tiene reuniones programadas próximas o si está libre

  Escenario: Ver el detalle de una sala con sus reuniones
    Dado que la sala "Sala Alfa" tiene reuniones futuras
    Cuando selecciono la sala "Sala Alfa"
    Entonces se abre su página de detalle
    Y veo su información y características (recursos)
    Y veo sus reuniones programadas ordenadas por fecha próxima

  Escenario: Búsqueda por cantidad requerida para la reunión
    Cuando busco disponibilidad para 6 personas el "2026-12-01" de "09:00" a "10:00"
    Entonces solo se muestran espacios cuya capacidad es mayor o igual a 6

  Esquema del escenario: Visualización del estado de asistencia con color
    Cuando una reserva tiene estado de asistencia "<estado>"
    Entonces se muestra con el color "<color>"

    Ejemplos:
      | estado  | color |
      | show    | rojo  |
      | no-show | gris  |

  Escenario: Registrar asistencia dentro de la ventana horaria
    Dado que tengo una reserva cuyo horario inicia en 10 minutos
    Cuando registro mi asistencia como "show"
    Entonces recibo un código HTTP 200
    Y el estado de asistencia queda como "show"

  Escenario: Registrar asistencia fuera de la ventana horaria
    Dado que tengo una reserva cuyo horario inicia en 2 horas
    Cuando intento registrar mi asistencia como "show"
    Entonces recibo un código HTTP 400
    Y el estado de asistencia no cambia

  Escenario: Registrar asistencia de una reserva ajena
    Dado que existe una reserva de otro usuario en curso
    Cuando intento registrar la asistencia de esa reserva
    Entonces recibo un código HTTP 403

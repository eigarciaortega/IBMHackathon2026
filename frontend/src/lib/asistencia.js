// Utilidades de presentación y reglas del estado de asistencia de las reservas.
//
// Reglas de color (requerido):
//   - NO_SHOW (no-show) → gris.
//   - SHOW (show)       → rojo.
//
// La opción de registrar asistencia solo se habilita cerca del horario o dentro
// del horario de la reserva (ventana de 15 min antes del inicio hasta el fin),
// para evitar registros erróneos. El backend aplica la misma regla de forma
// autoritativa; aquí se replica para habilitar/inhabilitar el control en la UI.

/** Minutos de anticipación con los que se habilita el registro de asistencia. */
export const VENTANA_ASISTENCIA_MIN = 15;

/**
 * "Ahora" del navegador como hora-pared, expresada en milisegundos sobre una
 * base UTC. Las fechas de las reservas se manejan como hora-pared etiquetada
 * como UTC (p. ej. "2026-06-24T15:00:00Z"); para compararlas correctamente con
 * el reloj local del usuario, tomamos los componentes LOCALES del navegador y
 * los interpretamos como UTC. Así, una reserva de hoy aún futura no se
 * confunde con una pasada por el desfase de zona horaria.
 * @returns {number}
 */
export function ahoraWallClockMs() {
  const d = new Date();
  return Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  );
}

/**
 * Devuelve la etiqueta y la clase CSS de color para un estado de asistencia.
 * @param {string|null|undefined} estado - 'show' | 'no-show' | null
 * @returns {{ label: string, className: string }}
 */
export function presentarAsistencia(estado) {
  const v = typeof estado === 'string' ? estado.toLowerCase().replace(/_/g, '-') : null;
  if (v === 'show') return { label: 'SHOW', className: 'asistencia asistencia--show' };
  if (v === 'no-show') return { label: 'NO_SHOW', className: 'asistencia asistencia--noshow' };
  return { label: 'Sin registro', className: 'asistencia asistencia--sin' };
}

/**
 * Indica si "ahora" está dentro de la ventana en la que se permite registrar la
 * asistencia: desde VENTANA_ASISTENCIA_MIN minutos antes del inicio y hasta
 * VENTANA_ASISTENCIA_MIN minutos después del inicio. Pasado ese plazo sin
 * registrar asistencia, el espacio se libera automáticamente.
 * @param {{ fecha_inicio: string, fecha_fin: string }} reserva
 * @param {number} [ahoraMs] - instante actual en ms (inyectable para pruebas).
 * @returns {boolean}
 */
export function dentroDeVentanaAsistencia(reserva, ahoraMs = ahoraWallClockMs()) {
  const inicio = new Date(reserva.fecha_inicio).getTime();
  if (Number.isNaN(inicio)) return false;
  const ventana = VENTANA_ASISTENCIA_MIN * 60000;
  return ahoraMs >= inicio - ventana && ahoraMs <= inicio + ventana;
}

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
 * asistencia: desde VENTANA_ASISTENCIA_MIN minutos antes del inicio y hasta el fin.
 * @param {{ fecha_inicio: string, fecha_fin: string }} reserva
 * @param {number} [ahoraMs] - instante actual en ms (inyectable para pruebas).
 * @returns {boolean}
 */
export function dentroDeVentanaAsistencia(reserva, ahoraMs = Date.now()) {
  const inicio = new Date(reserva.fecha_inicio).getTime();
  const fin = new Date(reserva.fecha_fin).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin)) return false;
  return ahoraMs >= inicio - VENTANA_ASISTENCIA_MIN * 60000 && ahoraMs <= fin;
}

// Constantes de tiempo del módulo de retroalimentación visual (R12).
//
// Centralizan los umbrales temporales exigidos por los criterios de aceptación
// para que tanto la implementación como las pruebas compartan una única fuente
// de verdad.

/**
 * Duración por defecto de un toast antes de auto-descartarse.
 *
 * R12.1/R12.2 exigen que el mensaje permanezca visible "al menos 3 segundos o
 * hasta que el Usuario lo descarte". Usamos 4000 ms (> 3000 ms) para cumplir el
 * mínimo con margen. Un valor `null` o `Infinity` mantiene el toast hasta que se
 * descarta manualmente.
 */
export const TOAST_DURATION_MS = 4000;

/**
 * Retraso antes de mostrar el indicador de progreso.
 *
 * R12.4 exige mostrar el indicador "mientras una acción permanece en progreso
 * durante más de 1 segundo". Por tanto, el spinner solo aparece si la operación
 * supera este umbral; las operaciones rápidas no lo muestran.
 */
export const PROGRESS_DELAY_MS = 1000;

/** Tipos de toast soportados. */
export const TOAST_TYPES = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
});

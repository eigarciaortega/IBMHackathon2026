// Indicador de progreso visual (R12.4).
//
// Se muestra como una superposición con un spinner accesible mientras hay al
// menos una operación que ha superado el umbral de 1 segundo. Cuando no hay
// progreso activo no renderiza nada.

/**
 * @param {Object} props
 * @param {boolean} props.visible - Si el indicador debe mostrarse.
 */
export default function ProgressIndicator({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="feedback-progress"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Operación en progreso"
      data-testid="progress-indicator"
    >
      <span className="feedback-progress__spinner" aria-hidden="true" />
    </div>
  );
}

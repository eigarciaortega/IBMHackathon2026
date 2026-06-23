// Componente presentacional de un toast individual (R12.1, R12.2).
//
// Un toast de éxito usa `role="status"` (anuncio no intrusivo) y uno de error
// `role="alert"` (anuncio asertivo) para accesibilidad. Incluye un botón para
// que el Usuario pueda descartarlo manualmente.

import { TOAST_TYPES } from './feedbackConstants';

/**
 * @param {Object} props
 * @param {{ id: number, type: string, message: string }} props.toast
 * @param {(id: number) => void} props.onDismiss
 */
export default function Toast({ toast, onDismiss }) {
  const isError = toast.type === TOAST_TYPES.ERROR;
  return (
    <div
      className={`feedback-toast feedback-toast--${toast.type}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      data-testid={`toast-${toast.type}`}
    >
      <span className="feedback-toast__message">{toast.message}</span>
      <button
        type="button"
        className="feedback-toast__dismiss"
        aria-label="Descartar mensaje"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

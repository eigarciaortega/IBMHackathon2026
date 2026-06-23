// Punto de entrada del módulo transversal de retroalimentación visual (R12).
//
// Expone el proveedor, el hook de consumo, los componentes presentacionales y
// las constantes de tiempo para que las pantallas (9.2–9.5) lo consuman.

export { FeedbackProvider, default } from './FeedbackProvider';
export { useFeedback } from './useFeedback';
export { FeedbackContext } from './FeedbackContext';
export { default as Toast } from './Toast';
export { default as ProgressIndicator } from './ProgressIndicator';
export {
  TOAST_DURATION_MS,
  PROGRESS_DELAY_MS,
  TOAST_TYPES,
} from './feedbackConstants';

// Hook de consumo del módulo de retroalimentación visual (R12).
//
// Las pantallas (9.2–9.5) lo usan para mostrar toasts de éxito/error y para
// envolver acciones asíncronas con `runWithFeedback` (progreso + toasts).

import { useContext } from 'react';
import { FeedbackContext } from './FeedbackContext';

/**
 * @returns {import('./FeedbackContext').FeedbackApi}
 */
export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback debe usarse dentro de <FeedbackProvider>');
  }
  return ctx;
}

export default useFeedback;

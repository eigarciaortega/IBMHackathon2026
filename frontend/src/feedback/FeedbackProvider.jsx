// Proveedor del módulo transversal de retroalimentación visual (R12).
//
// Responsabilidades:
//   - Mantener la cola de toasts y mostrarlos en un viewport fijo (R12.1/R12.2).
//   - Auto-descartar cada toast tras `TOAST_DURATION_MS` (≥3 s) o al descartarlo
//     manualmente el Usuario.
//   - Mostrar un indicador de progreso solo cuando una operación supera 1 s
//     (R12.4), soportando operaciones concurrentes mediante un contador.
//   - Ofrecer `runWithFeedback`, que orquesta progreso + toast para una acción
//     asíncrona y relanza el error ante fallo para que la pantalla conserve sus
//     datos sin aplicar cambios parciales (R12.3).
//
// El proveedor no muta ningún dato de la aplicación: la conservación del estado
// ante fallo (R12.3) se garantiza relanzando el error para que el llamador no
// aplique cambios.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FeedbackContext } from './FeedbackContext';
import {
  TOAST_DURATION_MS,
  PROGRESS_DELAY_MS,
  TOAST_TYPES,
} from './feedbackConstants';
import Toast from './Toast';
import ProgressIndicator from './ProgressIndicator';
import './feedback.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.toastDurationMs] - Sobrescribe la duración por defecto.
 * @param {number} [props.progressDelayMs] - Sobrescribe el umbral de progreso.
 */
export function FeedbackProvider({
  children,
  toastDurationMs = TOAST_DURATION_MS,
  progressDelayMs = PROGRESS_DELAY_MS,
}) {
  const [toasts, setToasts] = useState([]);
  const [progressCount, setProgressCount] = useState(0);

  // Identificadores incrementales y registro de timers para limpieza.
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  /** Descarta un toast por id y limpia su timer asociado. */
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  /** Descarta todos los toasts. */
  const dismissAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  /**
   * Añade un toast y programa su auto-descarte.
   * @param {string} type - `success` | `error`.
   * @param {string} message
   * @param {{ duration?: number|null }} [options]
   * @returns {number} id del toast.
   */
  const notify = useCallback(
    (type, message, options = {}) => {
      const { duration = toastDurationMs } = options;
      idRef.current += 1;
      const id = idRef.current;
      const text = message != null && message !== '' ? String(message) : ' ';
      setToasts((prev) => [...prev, { id, type, message: text }]);

      // R12.1/R12.2: visible ≥3 s o hasta descartar. `null`/`Infinity` => persistente.
      if (duration != null && duration !== Infinity) {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [toastDurationMs],
  );

  const notifySuccess = useCallback(
    (message, options) => notify(TOAST_TYPES.SUCCESS, message, options),
    [notify],
  );

  const notifyError = useCallback(
    (message, options) => notify(TOAST_TYPES.ERROR, message, options),
    [notify],
  );

  /**
   * Inicia el progreso manualmente respetando el umbral de 1 s. Devuelve una
   * función para finalizarlo. Útil para flujos que no encajan en
   * `runWithFeedback`.
   * @param {{ progressDelayMs?: number }} [options]
   * @returns {() => void} fin del progreso.
   */
  const beginProgress = useCallback(
    (options = {}) => {
      const delay = options.progressDelayMs ?? progressDelayMs;
      let shown = false;
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          shown = true;
          setProgressCount((c) => c + 1);
        }
      }, delay);
      return () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (shown) {
          setProgressCount((c) => Math.max(0, c - 1));
        }
      };
    },
    [progressDelayMs],
  );

  /**
   * Ejecuta una acción asíncrona orquestando progreso (R12.4) y toasts
   * (R12.1/R12.2). Ante fallo notifica el error y, por defecto, lo relanza para
   * que el llamador conserve su estado sin aplicar cambios parciales (R12.3).
   *
   * @template T
   * @param {() => Promise<T>} action
   * @param {import('./FeedbackContext').RunOptions} [options]
   * @returns {Promise<T>}
   */
  const runWithFeedback = useCallback(
    async (action, options = {}) => {
      const {
        successMessage,
        errorMessage,
        showProgress = true,
        rethrow = true,
        progressDelayMs: delayOverride,
      } = options;

      const endProgress = showProgress
        ? beginProgress({ progressDelayMs: delayOverride })
        : () => {};

      try {
        const result = await action();
        endProgress();
        if (successMessage) {
          notifySuccess(successMessage);
        }
        return result;
      } catch (error) {
        endProgress();
        const message =
          typeof errorMessage === 'function'
            ? errorMessage(error)
            : errorMessage || (error && error.message) || 'Ocurrió un error';
        notifyError(message);
        if (rethrow) {
          throw error;
        }
        return undefined;
      }
    },
    [beginProgress, notifySuccess, notifyError],
  );

  // Limpieza global de timers al desmontar.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      notifySuccess,
      notifyError,
      dismiss,
      dismissAll,
      runWithFeedback,
      beginProgress,
      toasts,
      isProgressVisible: progressCount > 0,
    }),
    [
      notifySuccess,
      notifyError,
      dismiss,
      dismissAll,
      runWithFeedback,
      beginProgress,
      toasts,
      progressCount,
    ],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="feedback-viewport" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
      <ProgressIndicator visible={progressCount > 0} />
    </FeedbackContext.Provider>
  );
}

export default FeedbackProvider;

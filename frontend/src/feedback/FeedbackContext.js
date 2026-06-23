// Contexto de retroalimentación visual (R12).
//
// Se define en su propio módulo para evitar dependencias circulares entre el
// proveedor (`FeedbackProvider`) y el hook de consumo (`useFeedback`).

import { createContext } from 'react';

/**
 * @typedef {Object} FeedbackApi
 * @property {(message: string, options?: { duration?: number|null }) => number} notifySuccess
 *   Muestra un toast de éxito (R12.1). Devuelve el id del toast.
 * @property {(message: string, options?: { duration?: number|null }) => number} notifyError
 *   Muestra un toast de error (R12.2). Devuelve el id del toast.
 * @property {(id: number) => void} dismiss - Descarta un toast por id.
 * @property {() => void} dismissAll - Descarta todos los toasts.
 * @property {<T>(action: () => Promise<T>, options?: RunOptions) => Promise<T>} runWithFeedback
 *   Ejecuta una acción asíncrona orquestando progreso (R12.4) y toasts (R12.1/R12.2).
 * @property {() => () => void} beginProgress - Marca inicio manual de progreso; devuelve el "fin".
 * @property {Array<{ id: number, type: string, message: string }>} toasts - Toasts activos.
 * @property {boolean} isProgressVisible - Indica si el indicador de progreso es visible.
 */

/**
 * @typedef {Object} RunOptions
 * @property {string} [successMessage] - Mensaje de éxito a mostrar al finalizar.
 * @property {string|((error: Error) => string)} [errorMessage] - Mensaje (o derivador) de error.
 * @property {number} [progressDelayMs] - Umbral para mostrar el indicador de progreso.
 * @property {boolean} [showProgress=true] - Si se debe gestionar el indicador de progreso.
 * @property {boolean} [rethrow=true] - Si se relanza el error tras notificarlo (R12.3).
 */

/** Contexto compartido; `null` fuera de un `FeedbackProvider`. */
export const FeedbackContext = createContext(null);

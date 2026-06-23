'use strict';

/**
 * loginAttemptTracker — lógica pura de control de intentos fallidos de login.
 *
 * Responsabilidades (sin DB ni HTTP, totalmente testeable en aislamiento):
 *   - Contar los intentos de inicio de sesión fallidos consecutivos por Usuario.
 *   - Bloquear nuevos intentos durante 300 segundos tras 5 fallos consecutivos
 *     (R1.4, Property 19).
 *   - Reiniciar el contador ante un inicio de sesión exitoso.
 *
 * El módulo expone dos capas:
 *   1. Funciones puras que operan sobre un objeto de estado
 *      `{ failedAttempts, lockedUntil }`, aptas para persistir en las columnas
 *      `failed_attempts` / `locked_until` de la tabla `usuario`.
 *   2. Una factoría `createLoginAttemptTracker()` con un mapa en memoria por
 *      Usuario, cómoda para el servicio y las pruebas.
 *
 * Todo el manejo del tiempo se realiza mediante un parámetro `now` (epoch en
 * milisegundos) inyectable, de modo que el comportamiento es determinista.
 */

/** Número de fallos consecutivos que disparan el bloqueo (R1.4). */
const MAX_FAILED_ATTEMPTS = 5;

/** Duración del bloqueo en segundos (R1.4). */
const LOCK_DURATION_SECONDS = 300;

/** Duración del bloqueo en milisegundos. */
const LOCK_DURATION_MS = LOCK_DURATION_SECONDS * 1000;

/**
 * Estado inicial de un Usuario sin fallos ni bloqueo.
 * @returns {{ failedAttempts: number, lockedUntil: number|null }}
 */
function initialState() {
  return { failedAttempts: 0, lockedUntil: null };
}

/**
 * Normaliza un estado parcial/externo a la forma canónica del tracker.
 * Útil al hidratar desde columnas de base de datos potencialmente nulas.
 *
 * @param {Object} [state]
 * @returns {{ failedAttempts: number, lockedUntil: number|null }}
 */
function normalizeState(state) {
  if (!state || typeof state !== 'object') {
    return initialState();
  }
  const failedAttempts =
    Number.isInteger(state.failedAttempts) && state.failedAttempts > 0 ? state.failedAttempts : 0;
  const lockedUntil =
    typeof state.lockedUntil === 'number' && Number.isFinite(state.lockedUntil)
      ? state.lockedUntil
      : null;
  return { failedAttempts, lockedUntil };
}

/**
 * Indica si el Usuario está actualmente bloqueado en el instante `now`.
 *
 * @param {Object} state - Estado `{ failedAttempts, lockedUntil }`.
 * @param {number} now - Instante actual (epoch ms).
 * @returns {boolean}
 */
function isLocked(state, now) {
  const s = normalizeState(state);
  return s.lockedUntil !== null && now < s.lockedUntil;
}

/**
 * Milisegundos restantes de bloqueo en el instante `now` (0 si no está bloqueado).
 *
 * @param {Object} state
 * @param {number} now
 * @returns {number}
 */
function lockRemainingMs(state, now) {
  const s = normalizeState(state);
  if (s.lockedUntil === null || now >= s.lockedUntil) {
    return 0;
  }
  return s.lockedUntil - now;
}

/**
 * Registra un intento fallido y devuelve el nuevo estado (R1.4).
 *
 * Si existe un bloqueo previo ya expirado en el instante `now`, el contador se
 * reinicia antes de contar el nuevo fallo (una vez superada la ventana de 300 s
 * el Usuario empieza de cero). Al alcanzar `MAX_FAILED_ATTEMPTS` fallos
 * consecutivos se fija `lockedUntil = now + LOCK_DURATION_MS`.
 *
 * @param {Object} state - Estado previo `{ failedAttempts, lockedUntil }`.
 * @param {number} now - Instante actual (epoch ms).
 * @returns {{ failedAttempts: number, lockedUntil: number|null }}
 */
function registerFailure(state, now) {
  let base = normalizeState(state);

  // Si había un bloqueo previo y ya expiró, se reinicia el conteo.
  if (base.lockedUntil !== null && now >= base.lockedUntil) {
    base = initialState();
  }

  const failedAttempts = base.failedAttempts + 1;
  let lockedUntil = base.lockedUntil;

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = now + LOCK_DURATION_MS;
  }

  return { failedAttempts, lockedUntil };
}

/**
 * Registra un inicio de sesión exitoso: reinicia contador y bloqueo.
 * @returns {{ failedAttempts: number, lockedUntil: number|null }}
 */
function registerSuccess() {
  return initialState();
}

/**
 * Crea un tracker con estado en memoria por Usuario.
 *
 * Cada método acepta el instante `now` (epoch ms) para mantener el determinismo.
 * Si no se proporciona `now`, se usa `Date.now()` como conveniencia en runtime.
 *
 * @returns {{
 *   isLocked: (usuario: string, now?: number) => boolean,
 *   lockRemainingMs: (usuario: string, now?: number) => number,
 *   getState: (usuario: string) => { failedAttempts: number, lockedUntil: number|null },
 *   getFailedAttempts: (usuario: string) => number,
 *   recordFailure: (usuario: string, now?: number) => { failedAttempts: number, lockedUntil: number|null },
 *   recordSuccess: (usuario: string) => void,
 *   reset: (usuario?: string) => void,
 * }}
 */
function createLoginAttemptTracker() {
  /** @type {Map<string, { failedAttempts: number, lockedUntil: number|null }>} */
  const store = new Map();

  const readState = (usuario) => store.get(usuario) || initialState();

  return {
    isLocked(usuario, now = Date.now()) {
      return isLocked(readState(usuario), now);
    },

    lockRemainingMs(usuario, now = Date.now()) {
      return lockRemainingMs(readState(usuario), now);
    },

    getState(usuario) {
      return normalizeState(readState(usuario));
    },

    getFailedAttempts(usuario) {
      return readState(usuario).failedAttempts;
    },

    recordFailure(usuario, now = Date.now()) {
      const next = registerFailure(readState(usuario), now);
      store.set(usuario, next);
      return next;
    },

    recordSuccess(usuario) {
      store.delete(usuario);
    },

    reset(usuario) {
      if (usuario === undefined) {
        store.clear();
      } else {
        store.delete(usuario);
      }
    },
  };
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_SECONDS,
  LOCK_DURATION_MS,
  initialState,
  normalizeState,
  isLocked,
  lockRemainingMs,
  registerFailure,
  registerSuccess,
  createLoginAttemptTracker,
};

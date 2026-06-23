/**
 * Máquina de estados PURA del patrón Saga para transferencias P2P.
 *
 * Modela las transiciones válidas. Al ser pura (sin BD ni HTTP) se prueba
 * exhaustivamente con tests unitarios. El orquestador (transferSaga.js) la
 * usa para no permitir saltos de estado inválidos.
 *
 *   PENDING ──debit_ok──▶ DEBITED ──credit_ok───▶ COMPLETED   (éxito)
 *      │                     │
 *      │ debit_fail          │ credit_fail (se compensa devolviendo al sender)
 *      ▼                     ▼
 *   FAILED                ROLLED_BACK
 *
 * `abort` lleva de PENDING a FAILED cuando una validación previa al débito
 * impide continuar (usuario inexistente, fondos insuficientes, etc.).
 */
const TRANSITIONS = {
  PENDING: { debit_ok: 'DEBITED', debit_fail: 'FAILED', abort: 'FAILED' },
  DEBITED: { credit_ok: 'COMPLETED', credit_fail: 'ROLLED_BACK' },
  COMPLETED: {},
  FAILED: {},
  ROLLED_BACK: {},
}

const TERMINAL = ['COMPLETED', 'FAILED', 'ROLLED_BACK']

/** Devuelve el siguiente estado o lanza si la transición no es válida. */
function nextState(current, event) {
  const t = TRANSITIONS[current]
  if (!t || !(event in t)) {
    throw new Error(`Transición inválida: ${current} --${event}-->`)
  }
  return t[event]
}

/** ¿El estado es terminal (no admite más transiciones)? */
function isTerminal(state) {
  return TERMINAL.includes(state)
}

/** ¿En este estado el dinero ya salió del sender y aún no llegó al receiver? */
function needsCompensation(state) {
  return state === 'DEBITED'
}

module.exports = { TRANSITIONS, TERMINAL, nextState, isTerminal, needsCompensation }

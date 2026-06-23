'use strict';

/**
 * cancellationValidator — lógica pura de autorización de cancelación de Reservas
 * (sin DB ni HTTP).
 *
 * Decide si una solicitud de cancelación sobre una Reserva **existente** debe
 * autorizarse, aplicando en orden de precedencia las reglas del Servicio_Reservas
 * para "Mis Reservas". Devuelve un resultado discriminado que el endpoint HTTP
 * puede mapear directamente a un código de estado:
 *
 *   1. R7.6 — La Reserva debe pertenecer al Usuario solicitante.
 *             (`reserva.id_usuario` === `usuario.sub`)        → 403 AUTHORIZATION_ERROR
 *   2. R7.5 — La Reserva no puede estar ya "Cancelado";
 *             se conserva el estado.                          → 400 VALIDATION_ERROR
 *   3. R7.4 — Solo se cancelan Reservas futuras
 *             (`fecha_inicio` > `ahora`); se conserva estado. → 400 VALIDATION_ERROR
 *   4. R7.3 — En cualquier otro caso, la cancelación se autoriza.
 *
 * Precedencia: la propiedad (R7.6) se evalúa primero porque una Reserva ajena no
 * debe revelar su estado interno (un 403 no debe depender de si la Reserva ya
 * está cancelada o es pasada). A continuación se comprueba el estado ya cancelado
 * (R7.5) y por último la regla temporal de futuro (R7.4).
 *
 * Nota de alcance: la existencia de la Reserva (R7.7 → 404) se resuelve en la
 * capa de endpoint; este módulo asume que `reserva` existe.
 *
 * Resultado:
 *   { autorizado: true }
 *   { autorizado: false, codigoError, statusCode, fields? }
 *
 * `codigoError` usa los códigos de dominio del contrato uniforme
 * (`AUTHORIZATION_ERROR`, `VALIDATION_ERROR`) y `statusCode` el código HTTP
 * correspondiente, de modo que el endpoint no necesita re-derivar el mapeo.
 *
 * Es una función pura y determinista: `ahora` es inyectable para reproducibilidad
 * en pruebas; no muta sus argumentos ni accede a estado externo.
 *
 * _Requirements: 7.3, 7.4, 7.5, 7.6_
 */

const { toTimestamp } = require('./overlapDetector');

/** Estado de Reserva que impide una nueva cancelación (R7.5). */
const ESTADO_CANCELADO = 'Cancelado';

/**
 * Normaliza `ahora` a un timestamp en ms. Acepta `Date`, número o string.
 * Si no se provee o no es parseable, usa el instante actual del sistema.
 * @param {Date|string|number} [ahora]
 * @returns {number}
 */
function resolveAhora(ahora) {
  if (ahora === undefined || ahora === null) {
    return Date.now();
  }
  const ts = toTimestamp(ahora);
  return Number.isNaN(ts) ? Date.now() : ts;
}

/**
 * Autoriza (o no) la cancelación de una Reserva propia.
 *
 * @param {Object} reserva - Reserva existente a cancelar.
 * @param {number|string} reserva.id_usuario - Propietario de la Reserva.
 * @param {Date|string|number} reserva.fecha_inicio - Inicio del período reservado.
 * @param {string} reserva.estado_reserva - "Activo" | "Cancelado".
 * @param {Object} usuario - Usuario solicitante (claims del token).
 * @param {number|string} usuario.sub - Identificador del Usuario solicitante.
 * @param {Date|string|number} [ahora] - Instante de referencia (UTC); inyectable.
 * @returns {{ autorizado: boolean, codigoError?: string, statusCode?: number, fields?: string[] }}
 */
function cancellationValidator(reserva, usuario, ahora) {
  const data = reserva && typeof reserva === 'object' ? reserva : {};
  const solicitante = usuario && typeof usuario === 'object' ? usuario : {};

  // 1. R7.6 — La Reserva debe pertenecer al Usuario solicitante.
  //    Comparación laxa por valor para tolerar id numérico vs string del token.
  // eslint-disable-next-line eqeqeq
  const esPropia = data.id_usuario != null && data.id_usuario == solicitante.sub;
  if (!esPropia) {
    return {
      autorizado: false,
      codigoError: 'AUTHORIZATION_ERROR',
      statusCode: 403,
    };
  }

  // 2. R7.5 — La Reserva no puede estar ya "Cancelado" (se conserva el estado).
  if (data.estado_reserva === ESTADO_CANCELADO) {
    return {
      autorizado: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['estado_reserva'],
    };
  }

  // 3. R7.4 — Solo se cancelan Reservas futuras: `fecha_inicio` > `ahora`.
  //    Un inicio ausente/no parseable o anterior/igual al instante actual se
  //    rechaza conservando el estado original.
  const inicioTs = toTimestamp(data.fecha_inicio);
  const ahoraTs = resolveAhora(ahora);
  if (Number.isNaN(inicioTs) || inicioTs <= ahoraTs) {
    return {
      autorizado: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['fecha_inicio'],
    };
  }

  // 4. R7.3 — Reserva propia, futura y no cancelada: cancelación autorizada.
  return { autorizado: true };
}

module.exports = {
  cancellationValidator,
  ESTADO_CANCELADO,
};

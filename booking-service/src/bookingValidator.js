'use strict';

/**
 * bookingValidator — lógica pura del motor de validación de Reservas (sin DB ni HTTP).
 *
 * Aplica, en orden de precedencia, las reglas de validación de una solicitud de
 * Reserva y devuelve un resultado discriminado que el endpoint HTTP puede mapear
 * directamente a un código de estado:
 *
 *   1. R6.8 — El Espacio referenciado debe existir.            → 404 NOT_FOUND
 *   2. R6.5 — `fecha_inicio` no puede ser anterior a `ahora`   → 400 VALIDATION_ERROR
 *             (referencia temporal en UTC).
 *   3. R6.6 — `fecha_fin` debe ser posterior a `fecha_inicio`. → 400 VALIDATION_ERROR
 *   4. R6.7 — `cantidad_asistentes` ≤ Capacidad del Espacio.   → 400 VALIDATION_ERROR
 *   5. R6.2/R6.4 — No debe solapar con Reservas existentes.    → 409 OVERLAP_CONFLICT
 *
 * La existencia del Espacio se comprueba primero porque la validación de
 * capacidad (R6.7) depende de `espacio.capacidad`: sin Espacio no hay capacidad
 * contra la que comparar.
 *
 * Resultado:
 *   { valido: true }
 *   { valido: false, codigoError, statusCode, fields? }
 *
 * `codigoError` usa los códigos de dominio del contrato uniforme
 * (`VALIDATION_ERROR`, `NOT_FOUND`, `OVERLAP_CONFLICT`) y `statusCode` el código
 * HTTP correspondiente, de modo que el endpoint no necesita re-derivar el mapeo.
 *
 * Es una función pura y determinista: `ahora` es inyectable para reproducibilidad
 * en pruebas; no muta sus argumentos ni accede a estado externo.
 *
 * _Requirements: 5.x (vía availabilityFilter), 6.5, 6.6, 6.7, 6.8, 6.2, 6.4, 14.4_
 */

const { overlapDetector, toTimestamp } = require('./overlapDetector');

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
 * Valida una solicitud de Reserva contra el Espacio destino, las Reservas
 * existentes y el instante actual.
 *
 * @param {Object} solicitud - Solicitud de Reserva.
 * @param {number|string} solicitud.id_espacio
 * @param {Date|string|number} solicitud.fecha_inicio
 * @param {Date|string|number} solicitud.fecha_fin
 * @param {number|string} solicitud.cantidad_asistentes
 * @param {Object|null} espacio - Espacio destino (`null`/`undefined` si no existe).
 * @param {number} [espacio.capacidad]
 * @param {Array<Object>} [reservasExistentes] - Reservas a contrastar para solapamiento.
 * @param {Date|string|number} [ahora] - Instante de referencia (UTC); inyectable.
 * @returns {{ valido: boolean, codigoError?: string, statusCode?: number, fields?: string[] }}
 */
function bookingValidator(solicitud, espacio, reservasExistentes, ahora) {
  const data = solicitud && typeof solicitud === 'object' ? solicitud : {};
  const reservas = Array.isArray(reservasExistentes) ? reservasExistentes : [];

  // 1. R6.8 — El Espacio debe existir.
  if (espacio === undefined || espacio === null) {
    return {
      valido: false,
      codigoError: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  const inicioTs = toTimestamp(data.fecha_inicio);
  const finTs = toTimestamp(data.fecha_fin);
  const ahoraTs = resolveAhora(ahora);

  // 2. R6.5 — `fecha_inicio` no puede ser anterior al instante actual (UTC).
  //    Un valor ausente/no parseable es inválido respecto a la fecha de inicio.
  if (Number.isNaN(inicioTs) || inicioTs < ahoraTs) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['fecha_inicio'],
    };
  }

  // 3. R6.6 — `fecha_fin` debe ser estrictamente posterior a `fecha_inicio`.
  if (Number.isNaN(finTs) || finTs <= inicioTs) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['fecha_fin'],
    };
  }

  // 4. R6.7 — `cantidad_asistentes` no puede exceder la Capacidad del Espacio.
  const asistentes = Number(data.cantidad_asistentes);
  const capacidad = Number(espacio.capacidad);
  if (
    !Number.isFinite(asistentes) ||
    !Number.isInteger(asistentes) ||
    asistentes < 1 ||
    (Number.isFinite(capacidad) && asistentes > capacidad)
  ) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['cantidad_asistentes'],
    };
  }

  // 5. R6.2/R6.4 — No debe solapar con ninguna Reserva existente (límites exclusivos).
  const reservaSolicitada = {
    id_espacio: data.id_espacio,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
  };
  if (overlapDetector(reservaSolicitada, reservas)) {
    return {
      valido: false,
      codigoError: 'OVERLAP_CONFLICT',
      statusCode: 409,
    };
  }

  return { valido: true };
}

module.exports = {
  bookingValidator,
};

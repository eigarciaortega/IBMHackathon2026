'use strict';

/**
 * searchValidator — lógica pura de validación de solicitudes de búsqueda de
 * disponibilidad (sin DB ni HTTP).
 *
 * Aplica, en orden de precedencia, las reglas de validación de una solicitud de
 * búsqueda (`GET /disponibilidad`) y devuelve un resultado discriminado que el
 * endpoint HTTP puede mapear directamente a un código de estado, rechazando la
 * solicitud ANTES de ejecutar la consulta de disponibilidad:
 *
 *   1. R5.6 — `fecha`, `horaInicio` y `horaFin` deben estar presentes.   → 400 VALIDATION_ERROR
 *   2. Valores presentes pero no parseables a fecha/hora válida.         → 400 VALIDATION_ERROR
 *   3. R5.5 — `fecha`/`horaInicio` no puede ser anterior al instante     → 400 VALIDATION_ERROR
 *             actual (referencia temporal en UTC).
 *   4. R5.4 — `horaFin` debe ser estrictamente posterior a `horaInicio`. → 400 VALIDATION_ERROR
 *
 * El orden (no-en-pasado antes que rango) es consistente con `bookingValidator`
 * (R6.5 antes que R6.6).
 *
 * Resultado:
 *   { valido: true }
 *   { valido: false, codigoError, statusCode, fields }
 *
 * `codigoError` usa el código de dominio del contrato uniforme
 * (`VALIDATION_ERROR`) y `statusCode` el código HTTP correspondiente (400), de
 * modo que el endpoint no necesita re-derivar el mapeo ni ejecutar la consulta.
 *
 * Es una función pura y determinista: `ahora` es inyectable para reproducibilidad
 * en pruebas; no muta sus argumentos ni accede a estado externo.
 *
 * _Requirements: 5.4, 5.5, 5.6_
 */

/**
 * Indica si un valor está ausente (undefined/null o string vacío/solo espacios).
 * @param {*} value
 * @returns {boolean}
 */
function isMissing(value) {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return true;
  }
  return false;
}

/**
 * Combina una fecha (`YYYY-MM-DD`) y una hora (`HH:MM` o `HH:MM:SS`) en un
 * timestamp en ms interpretado en UTC. Devuelve `NaN` si no es parseable.
 * @param {string} fecha
 * @param {string} hora
 * @returns {number}
 */
function combinarFechaHora(fecha, hora) {
  const f = String(fecha).trim();
  const h = String(hora).trim();
  const horaNorm = /^\d{1,2}:\d{2}$/.test(h) ? `${h}:00` : h;
  return Date.parse(`${f}T${horaNorm}Z`);
}

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
  if (ahora instanceof Date) {
    return ahora.getTime();
  }
  if (typeof ahora === 'number') {
    return ahora;
  }
  const ts = Date.parse(ahora);
  return Number.isNaN(ts) ? Date.now() : ts;
}

/**
 * Valida una solicitud de búsqueda de disponibilidad.
 *
 * @param {Object} solicitud - Solicitud de búsqueda.
 * @param {string} solicitud.fecha - Fecha buscada (`YYYY-MM-DD`).
 * @param {string} solicitud.horaInicio - Hora de inicio (`HH:MM`).
 * @param {string} solicitud.horaFin - Hora de fin (`HH:MM`).
 * @param {number|string} [solicitud.capacidadMin] - Capacidad mínima (opcional, no valida aquí).
 * @param {Date|string|number} [ahora] - Instante de referencia (UTC); inyectable.
 * @returns {{ valido: boolean, codigoError?: string, statusCode?: number, fields?: string[] }}
 */
function validateSearchRequest(solicitud, ahora) {
  const data = solicitud && typeof solicitud === 'object' ? solicitud : {};

  // 1. R5.6 — Campos obligatorios presentes.
  const faltantes = [];
  if (isMissing(data.fecha)) {
    faltantes.push('fecha');
  }
  if (isMissing(data.horaInicio)) {
    faltantes.push('horaInicio');
  }
  if (isMissing(data.horaFin)) {
    faltantes.push('horaFin');
  }
  if (faltantes.length > 0) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: faltantes,
    };
  }

  const inicioTs = combinarFechaHora(data.fecha, data.horaInicio);
  const finTs = combinarFechaHora(data.fecha, data.horaFin);
  const ahoraTs = resolveAhora(ahora);

  // 2. Valores presentes pero no parseables a una fecha/hora válida.
  if (Number.isNaN(inicioTs)) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['horaInicio'],
    };
  }
  if (Number.isNaN(finTs)) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['horaFin'],
    };
  }

  // 3. R5.5 — `fecha`/`horaInicio` no puede ser anterior al instante actual (UTC).
  if (inicioTs < ahoraTs) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['fecha', 'horaInicio'],
    };
  }

  // 4. R5.4 — `horaFin` debe ser estrictamente posterior a `horaInicio`.
  if (finTs <= inicioTs) {
    return {
      valido: false,
      codigoError: 'VALIDATION_ERROR',
      statusCode: 400,
      fields: ['horaFin'],
    };
  }

  return { valido: true };
}

module.exports = {
  validateSearchRequest,
};

'use strict';

/**
 * overlapDetector — lógica pura del motor de reservas.
 *
 * Detección de solapamiento con **límites exclusivos** sobre rangos datetime.
 *
 * Existe solapamiento si y solo si una Reserva existente:
 *   1. corresponde al mismo `id_espacio` que la solicitada, y
 *   2. su `estado_reserva` es distinto de "Cancelado" (las canceladas no cuentan), y
 *   3. sus intervalos `[fecha_inicio, fecha_fin)` se intersecan según la condición
 *      de límites exclusivos:
 *
 *        fecha_inicio_solicitud < fecha_fin_existente
 *        Y
 *        fecha_fin_solicitud   > fecha_inicio_existente
 *
 * Consecuencias del uso de límites exclusivos:
 *   - Una Reserva que comienza exactamente cuando otra termina (o termina
 *     exactamente cuando otra comienza) NO solapa: se permiten Reservas
 *     consecutivas (R6.3).
 *   - El caso de envolvimiento/containment (la nueva contiene a la existente o
 *     viceversa) SÍ solapa (R6.4).
 *
 * Es una función pura: no muta sus argumentos ni depende de estado externo.
 *
 * _Requirements: 6.2, 6.3, 6.4_
 */

const ESTADO_CANCELADO = 'Cancelado';

/**
 * Normaliza un valor datetime a su timestamp en milisegundos.
 *
 * Acepta instancias de `Date`, números (timestamps en ms) y cadenas de fecha
 * parseables (p. ej. ISO 8601 o el formato datetime de MySQL). Devuelve `NaN`
 * para valores no parseables, lo que excluye de forma segura ese par de la
 * detección de solapamiento (cualquier comparación con `NaN` es `false`).
 *
 * @param {Date|string|number} value
 * @returns {number} timestamp en milisegundos, o `NaN` si no es parseable.
 */
function toTimestamp(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value).getTime();
  }
  return NaN;
}

/**
 * Determina si dos intervalos datetime se intersecan con límites exclusivos.
 *
 * @param {number} inicioA
 * @param {number} finA
 * @param {number} inicioB
 * @param {number} finB
 * @returns {boolean}
 */
function rangosSeIntersecan(inicioA, finA, inicioB, finB) {
  // Si algún valor no es un número válido, no se considera solapamiento.
  if (
    Number.isNaN(inicioA) ||
    Number.isNaN(finA) ||
    Number.isNaN(inicioB) ||
    Number.isNaN(finB)
  ) {
    return false;
  }
  // Límites exclusivos: inicio_A < fin_B Y fin_A > inicio_B.
  return inicioA < finB && finA > inicioB;
}

/**
 * Determina si la Reserva solicitada solapa con alguna Reserva existente.
 *
 * @param {Object} reservaSolicitada
 * @param {number|string} reservaSolicitada.id_espacio
 * @param {Date|string|number} reservaSolicitada.fecha_inicio
 * @param {Date|string|number} reservaSolicitada.fecha_fin
 * @param {Array<Object>} [reservasExistentes] - Reservas con `id_espacio`,
 *   `fecha_inicio`, `fecha_fin` y `estado_reserva`.
 * @returns {boolean} `true` si existe al menos un solapamiento, `false` en caso contrario.
 */
function overlapDetector(reservaSolicitada, reservasExistentes) {
  if (reservaSolicitada == null || !Array.isArray(reservasExistentes)) {
    return false;
  }

  const inicioSol = toTimestamp(reservaSolicitada.fecha_inicio);
  const finSol = toTimestamp(reservaSolicitada.fecha_fin);

  return reservasExistentes.some((existente) => {
    if (existente == null) {
      return false;
    }

    // 1. Mismo espacio.
    if (existente.id_espacio !== reservaSolicitada.id_espacio) {
      return false;
    }

    // 2. Las Reservas canceladas no participan en la detección de solapamiento.
    if (existente.estado_reserva === ESTADO_CANCELADO) {
      return false;
    }

    // 3. Intersección de rangos datetime con límites exclusivos.
    const inicioExist = toTimestamp(existente.fecha_inicio);
    const finExist = toTimestamp(existente.fecha_fin);

    return rangosSeIntersecan(inicioSol, finSol, inicioExist, finExist);
  });
}

module.exports = {
  overlapDetector,
  // Exportados para reutilización y pruebas internas.
  toTimestamp,
  rangosSeIntersecan,
  ESTADO_CANCELADO,
};

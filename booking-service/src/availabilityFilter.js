'use strict';

/**
 * availabilityFilter — lógica pura de filtrado de disponibilidad (sin DB ni HTTP).
 *
 * Dado un conjunto de Espacios, un conjunto de Reservas y unos criterios de
 * búsqueda, devuelve los Espacios que:
 *
 *   1. NO presentan Solapamiento con el rango solicitado (`criterios.fecha_inicio`
 *      .. `criterios.fecha_fin`) según la condición de límites exclusivos
 *      reutilizando `overlapDetector` (R5.1); un rango que comienza exactamente
 *      cuando otro termina NO constituye Solapamiento.
 *   2. (WHERE) coinciden con el `tipo` solicitado, cuando `criterios.tipo` se indica (R5.2).
 *   3. (WHERE) tienen `capacidad` ≥ `criterios.capacidadMin`, cuando se indica (R5.3).
 *
 * Devuelve un array (posiblemente vacío). Una colección vacía representa la
 * ausencia de Espacios que cumplan el rango y los filtros (R5.7).
 *
 * Es una función pura: no muta sus argumentos ni accede a estado externo.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.7_
 */

const { overlapDetector } = require('./overlapDetector');

/**
 * Indica si un valor está ausente a efectos de filtrado (undefined/null o
 * string vacío/solo espacios).
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
 * Filtra los Espacios disponibles para el rango y los criterios indicados.
 *
 * @param {Array<Object>} espacios - Espacios candidatos (`id_espacio`, `tipo`, `capacidad`, ...).
 * @param {Array<Object>} reservas - Reservas existentes (`id_espacio`, `fecha_inicio`, `fecha_fin`, `estado_reserva`).
 * @param {Object} criterios - Criterios de búsqueda.
 * @param {Date|string|number} criterios.fecha_inicio - Inicio del rango buscado.
 * @param {Date|string|number} criterios.fecha_fin - Fin del rango buscado.
 * @param {string} [criterios.tipo] - Filtro de Tipo_Espacio (opcional).
 * @param {number|string} [criterios.capacidadMin] - Capacidad mínima (opcional).
 * @returns {Array<Object>} Espacios disponibles que cumplen los filtros (puede ser vacío).
 */
function availabilityFilter(espacios, reservas, criterios) {
  if (!Array.isArray(espacios)) {
    return [];
  }

  const listaReservas = Array.isArray(reservas) ? reservas : [];
  const crit = criterios && typeof criterios === 'object' ? criterios : {};

  const tieneTipo = !isMissing(crit.tipo);
  const tieneCapacidadMin = !isMissing(crit.capacidadMin);
  const capacidadMin = tieneCapacidadMin ? Number(crit.capacidadMin) : null;

  // Filtro opcional por Recursos: el Espacio debe incluir TODOS los recursos
  // solicitados (subconjunto). Se acepta un array de ids; vacío/ausente = sin filtro.
  const recursosPedidos = Array.isArray(crit.recursos)
    ? crit.recursos.map((r) => Number(r)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const tieneRecursos = recursosPedidos.length > 0;

  return espacios.filter((espacio) => {
    if (espacio == null) {
      return false;
    }

    // Filtro por Tipo_Espacio (R5.2).
    if (tieneTipo && espacio.tipo !== crit.tipo) {
      return false;
    }

    // Filtro por Capacidad mínima (R5.3).
    if (tieneCapacidadMin) {
      const capacidad = Number(espacio.capacidad);
      if (!Number.isFinite(capacidad) || capacidad < capacidadMin) {
        return false;
      }
    }

    // Filtro por Recursos: el Espacio debe contener todos los recursos pedidos.
    if (tieneRecursos) {
      const disponibles = Array.isArray(espacio.recursos)
        ? espacio.recursos.map((r) => Number(r && typeof r === 'object' ? r.id_recurso : r))
        : [];
      const losTiene = recursosPedidos.every((id) => disponibles.includes(id));
      if (!losTiene) {
        return false;
      }
    }

    // Exclusión de Espacios con Solapamiento en el rango solicitado (R5.1, R5.7).
    const reservaSolicitada = {
      id_espacio: espacio.id_espacio,
      fecha_inicio: crit.fecha_inicio,
      fecha_fin: crit.fecha_fin,
    };
    if (overlapDetector(reservaSolicitada, listaReservas)) {
      return false;
    }

    return true;
  });
}

module.exports = {
  availabilityFilter,
};

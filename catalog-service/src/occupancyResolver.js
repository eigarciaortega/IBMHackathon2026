'use strict';

/**
 * occupancyResolver — lógica pura del Tablero_Ocupacion (sin DB ni HTTP).
 *
 * Deriva, para cada Espacio, su estado "ocupado" o "libre" en una fecha de
 * referencia a partir del conjunto de Reservas:
 *
 *   - Una Reserva es ACTIVA cuando `estado_reserva` != "Cancelado" y su período
 *     `[fecha_inicio, fecha_fin]` incluye la fecha de referencia (R4.3).
 *   - Un Espacio está "ocupado" si tiene al menos una Reserva activa en esa
 *     fecha; "libre" en caso contrario (R4.1).
 *   - Cada Espacio se identifica por su nombre/identificador, piso y ubicacion (R4.2).
 *   - Con un conjunto vacío de Espacios devuelve una colección vacía (R4.4).
 *
 * La función es pura y determinista: recibe la fecha de referencia ("ahora")
 * de forma inyectable y no consulta relojes ni fuentes externas.
 */

/** Estado_Reserva que NO cuenta como activa (R4.3). */
const ESTADO_CANCELADO = 'Cancelado';

/**
 * Convierte un valor de fecha (Date, número o string ISO) a milisegundos epoch.
 * @param {Date|number|string} value
 * @returns {number} epoch en ms, o NaN si no es parseable.
 */
function toEpoch(value) {
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
 * Obtiene el identificador de Espacio de un objeto, aceptando `id_espacio` o `id`.
 * @param {Object} obj
 * @returns {*}
 */
function espacioIdDe(obj) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  return obj.id_espacio !== undefined ? obj.id_espacio : obj.id;
}

/**
 * Determina si una Reserva está activa en la fecha de referencia.
 *
 * Activa ⇔ `estado_reserva` != "Cancelado" Y `fecha_inicio` <= ref <= `fecha_fin`
 * (período inclusivo, R4.3).
 *
 * @param {Object} reserva
 * @param {number} refEpoch - Fecha de referencia en ms epoch.
 * @returns {boolean}
 */
function reservaActivaEn(reserva, refEpoch) {
  if (!reserva || typeof reserva !== 'object') {
    return false;
  }
  if (reserva.estado_reserva === ESTADO_CANCELADO) {
    return false;
  }

  const inicio = toEpoch(reserva.fecha_inicio);
  const fin = toEpoch(reserva.fecha_fin);

  if (Number.isNaN(inicio) || Number.isNaN(fin) || Number.isNaN(refEpoch)) {
    return false;
  }

  return inicio <= refEpoch && refEpoch <= fin;
}

/**
 * Resuelve el estado de ocupación de cada Espacio en la fecha de referencia.
 *
 * @param {Array<Object>} espacios - Espacios a evaluar (con `id_espacio`/`id`, `nombre`, `piso`, `ubicacion`).
 * @param {Array<Object>} reservas - Reservas con `id_espacio`, `estado_reserva`, `fecha_inicio`, `fecha_fin`.
 * @param {Date|number|string} [fechaReferencia] - "Ahora" inyectable; por defecto el instante actual.
 * @returns {Array<{ id_espacio: *, nombre: *, piso: *, ubicacion: *, estado: 'ocupado'|'libre' }>}
 */
function resolverOcupacion(espacios, reservas, fechaReferencia) {
  if (!Array.isArray(espacios) || espacios.length === 0) {
    return [];
  }

  const listaReservas = Array.isArray(reservas) ? reservas : [];
  const refEpoch =
    fechaReferencia === undefined ? Date.now() : toEpoch(fechaReferencia);

  // Conjunto de id_espacio con al menos una Reserva activa en la fecha de referencia.
  const espaciosOcupados = new Set();
  for (const reserva of listaReservas) {
    if (reservaActivaEn(reserva, refEpoch)) {
      espaciosOcupados.add(espacioIdDe(reserva));
    }
  }

  return espacios.map((espacio) => {
    const id = espacioIdDe(espacio);
    return {
      id_espacio: id,
      nombre: espacio ? espacio.nombre : undefined,
      piso: espacio ? espacio.piso : undefined,
      ubicacion: espacio ? espacio.ubicacion : undefined,
      estado: espaciosOcupados.has(id) ? 'ocupado' : 'libre',
    };
  });
}

module.exports = {
  resolverOcupacion,
  reservaActivaEn,
  ESTADO_CANCELADO,
};

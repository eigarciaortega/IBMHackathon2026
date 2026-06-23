'use strict';

/**
 * espacioValidator — lógica pura de validación de Espacios (sin DB ni HTTP).
 *
 * Valida los atributos obligatorios de un Espacio para las operaciones de
 * creación y edición del Servicio_Catalogo:
 *   - nombre: string con longitud 1..100 (R3.1, R3.2)
 *   - tipo (Tipo_Espacio): enum "Sala de juntas" | "Escritorio individual" (R3.2, R3.3)
 *   - capacidad: entero 1..1000 (R3.2, R3.3)
 *   - piso: presente (R3.2)
 *   - ubicacion: presente (R3.2)
 *
 * Devuelve un resultado de validación con la forma:
 *   { valido: boolean, codigoError?: string, fields?: string[] }
 *
 * `fields` identifica los campos faltantes o inválidos, alimentando el contrato
 * de error uniforme `{ error: { code, message, fields } }`.
 *
 * El módulo es deliberadamente puro y determinista: no accede a la base de
 * datos ni a la red, por lo que es testeable de forma aislada.
 */

/** Valores válidos de Tipo_Espacio (R3.3). */
const TIPOS_ESPACIO = Object.freeze(['Sala de juntas', 'Escritorio individual']);

/** Límites de longitud del nombre/identificador (R3.1). */
const NOMBRE_MIN = 1;
const NOMBRE_MAX = 100;

/** Límites de Capacidad (R3.1, R3.3). */
const CAPACIDAD_MIN = 1;
const CAPACIDAD_MAX = 1000;

/**
 * Indica si un valor está ausente a efectos de validación: undefined, null o
 * (para strings) vacío/solo espacios en blanco.
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
 * Comprueba si un valor es un entero (numérico o string que representa un entero).
 * @param {*} value
 * @returns {boolean}
 */
function isInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return /^-?\d+$/.test(value.trim());
  }
  return false;
}

/**
 * Valida los atributos obligatorios de un Espacio.
 *
 * Distingue campos faltantes (R3.2) de campos presentes pero inválidos
 * (tipo fuera de enum o capacidad fuera de rango, R3.3; nombre fuera de
 * longitud, R3.1). Ambos casos producen `codigoError: "VALIDATION_ERROR"`.
 *
 * @param {Object} [espacio] - Atributos del Espacio a validar.
 * @param {string} [espacio.nombre]
 * @param {string} [espacio.tipo] - Tipo_Espacio.
 * @param {number|string} [espacio.capacidad] - Capacidad.
 * @param {*} [espacio.piso] - Piso (solo se valida presencia).
 * @param {*} [espacio.ubicacion] - Ubicacion (solo se valida presencia).
 * @returns {{ valido: boolean, codigoError?: string, fields?: string[] }}
 */
function validarEspacio(espacio) {
  const data = espacio && typeof espacio === 'object' ? espacio : {};
  const fields = [];

  // nombre: presente y con longitud 1..100.
  if (isMissing(data.nombre)) {
    fields.push('nombre');
  } else {
    const longitud = String(data.nombre).trim().length;
    if (longitud < NOMBRE_MIN || longitud > NOMBRE_MAX) {
      fields.push('nombre');
    }
  }

  // tipo: presente y dentro del enum válido.
  if (isMissing(data.tipo)) {
    fields.push('tipo');
  } else if (!TIPOS_ESPACIO.includes(data.tipo)) {
    fields.push('tipo');
  }

  // capacidad: presente, entera y dentro de 1..1000.
  if (isMissing(data.capacidad)) {
    fields.push('capacidad');
  } else if (!isInteger(data.capacidad)) {
    fields.push('capacidad');
  } else {
    const cap = Number(data.capacidad);
    if (cap < CAPACIDAD_MIN || cap > CAPACIDAD_MAX) {
      fields.push('capacidad');
    }
  }

  // piso: solo se valida presencia.
  if (isMissing(data.piso)) {
    fields.push('piso');
  }

  // ubicacion: solo se valida presencia.
  if (isMissing(data.ubicacion)) {
    fields.push('ubicacion');
  }

  if (fields.length > 0) {
    return { valido: false, codigoError: 'VALIDATION_ERROR', fields };
  }

  return { valido: true };
}

module.exports = {
  validarEspacio,
  TIPOS_ESPACIO,
  NOMBRE_MIN,
  NOMBRE_MAX,
  CAPACIDAD_MIN,
  CAPACIDAD_MAX,
};

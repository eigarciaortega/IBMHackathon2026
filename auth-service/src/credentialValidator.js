'use strict';

/**
 * credentialValidator — lógica pura de validación de credenciales de login.
 *
 * Responsabilidades (sin DB ni HTTP, totalmente testeable en aislamiento):
 *   1. Validar el formato/longitud de los campos de entrada del login:
 *      - usuario: string de 1..254 caracteres (R1.3, Property 18).
 *      - password: string de 1..128 caracteres (R1.3, Property 18).
 *   2. Comparar la contraseña contra el hash bcrypt almacenado y derivar el Rol
 *      del Usuario a partir del registro recibido (R1.1, R1.2, Property 16/17).
 *
 * El módulo recibe el registro del Usuario (`userRecord`) como argumento; la
 * lectura desde la tabla `usuario` es responsabilidad de la capa de endpoints
 * (tarea 2.5). Así la lógica permanece pura y determinista.
 */

const bcrypt = require('bcryptjs');

/** Límites de longitud del campo usuario (R1.3). */
const USUARIO_MIN_LENGTH = 1;
const USUARIO_MAX_LENGTH = 254;

/** Límites de longitud del campo contraseña (R1.3). */
const PASSWORD_MIN_LENGTH = 1;
const PASSWORD_MAX_LENGTH = 128;

/** Roles válidos del sistema. */
const ROLES = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR',
  COLABORADOR: 'COLABORADOR',
});

/**
 * Comprueba que un valor es un string cuya longitud cae dentro de [min, max].
 *
 * Un valor ausente (`undefined`/`null`), no-string, vacío (longitud 0) o que
 * exceda el máximo se considera inválido.
 *
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function isStringWithinLength(value, min, max) {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

/**
 * Valida el formato/longitud de la entrada del login (R1.3, Property 18).
 *
 * No emite tokens ni consulta la base de datos: solo determina si la forma de
 * la solicitud es aceptable. Devuelve la lista de campos inválidos para poder
 * alimentar el contrato de error `{ error: { code, message, fields } }`.
 *
 * @param {Object} [input]
 * @param {unknown} [input.usuario] - Identificador del Usuario (1..254).
 * @param {unknown} [input.password] - Contraseña en texto plano (1..128).
 * @returns {{ valid: boolean, fields: string[] }}
 */
function validateLoginInput(input = {}) {
  const { usuario, password } = input;
  const fields = [];

  if (!isStringWithinLength(usuario, USUARIO_MIN_LENGTH, USUARIO_MAX_LENGTH)) {
    fields.push('usuario');
  }

  if (!isStringWithinLength(password, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)) {
    fields.push('password');
  }

  return { valid: fields.length === 0, fields };
}

/**
 * Verifica la contraseña contra el hash bcrypt del registro y deriva el Rol.
 *
 * Reglas:
 *   - Si no hay registro, está inactivo, o le falta el hash → no autenticado.
 *   - Si la comparación bcrypt falla → no autenticado (R1.2, Property 17).
 *   - Si coincide → autenticado, devolviendo `role` y `sub` del registro
 *     (R1.1, Property 16).
 *
 * La comparación se hace con `bcryptjs`. Se permite inyectar una función
 * `compare` alternativa (útil en pruebas deterministas) que reciba
 * `(password, hash)` y devuelva una promesa booleana.
 *
 * @param {Object} credentials
 * @param {string} credentials.password - Contraseña en texto plano.
 * @param {Object|null|undefined} userRecord - Registro de Usuario de la tabla
 *   `usuario` (`{ id_usuario, email, password_hash, rol, activo }`) o nulo si
 *   no existe el Usuario.
 * @param {Object} [options]
 * @param {(password: string, hash: string) => Promise<boolean>} [options.compare]
 *   - Comparador de hash opcional (por defecto `bcrypt.compare`).
 * @returns {Promise<{ authenticated: boolean, role: string|null, sub: (number|string|null) }>}
 */
async function verifyCredentials(credentials, userRecord, options = {}) {
  const compare = typeof options.compare === 'function' ? options.compare : bcrypt.compare;
  const password = credentials ? credentials.password : undefined;

  const noAuth = { authenticated: false, role: null, sub: null };

  if (!userRecord || userRecord.activo === false) {
    return noAuth;
  }

  const hash = userRecord.password_hash;
  if (typeof password !== 'string' || typeof hash !== 'string' || hash.length === 0) {
    return noAuth;
  }

  let matches = false;
  try {
    matches = await compare(password, hash);
  } catch (_err) {
    matches = false;
  }

  if (!matches) {
    return noAuth;
  }

  const sub =
    userRecord.id_usuario !== undefined && userRecord.id_usuario !== null
      ? userRecord.id_usuario
      : userRecord.email !== undefined
        ? userRecord.email
        : null;

  return { authenticated: true, role: userRecord.rol || null, sub };
}

module.exports = {
  USUARIO_MIN_LENGTH,
  USUARIO_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  ROLES,
  isStringWithinLength,
  validateLoginInput,
  verifyCredentials,
};

'use strict';

/**
 * userRepository — capa de acceso a datos para la tabla `usuario`.
 *
 * Aísla el acceso a MySQL (mysql2) detrás de una interfaz inyectable, de modo
 * que la capa de endpoints (app.js) pueda recibir un repositorio mockeado en
 * las pruebas sin necesidad de una base de datos viva.
 *
 * Responsabilidades:
 *   - `findByEmail(email)`: leer un Usuario por su email (R1.1, R1.2).
 *   - `updateLoginState(idUsuario, { failedAttempts, lockedUntil })`: persistir
 *     de forma atómica/transaccional el contador de intentos fallidos y el
 *     instante de desbloqueo (R1.4).
 *
 * El estado de bloqueo se modela en la lógica pura (`loginAttemptTracker`) con
 * `lockedUntil` como epoch en milisegundos (o `null`). Este repositorio traduce
 * ese valor a/desde la columna `locked_until` (DATETIME en UTC).
 */

/**
 * Convierte un epoch en milisegundos a un literal DATETIME de MySQL en UTC
 * (`YYYY-MM-DD HH:MM:SS`). Devuelve `null` para entradas nulas.
 *
 * @param {number|null|undefined} epochMs
 * @returns {string|null}
 */
function epochMsToMysqlDatetime(epochMs) {
  if (epochMs === null || epochMs === undefined) {
    return null;
  }
  // toISOString() devuelve UTC: "2024-01-01T12:00:00.000Z".
  return new Date(epochMs).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Crea un repositorio de usuarios respaldado por un pool de mysql2.
 *
 * @param {Object} params
 * @param {import('mysql2/promise').Pool} params.pool - Pool de conexiones mysql2/promise.
 * @returns {{
 *   findByEmail: (email: string) => Promise<object|null>,
 *   updateLoginState: (idUsuario: number|string, state: { failedAttempts: number, lockedUntil: number|null }) => Promise<void>,
 * }}
 */
function createUserRepository({ pool }) {
  if (!pool) {
    throw new Error('createUserRepository requiere un pool de mysql2');
  }

  return {
    /**
     * Lee un Usuario por su email. Devuelve el registro completo (incluyendo
     * `failed_attempts` y `locked_until`) o `null` si no existe.
     *
     * @param {string} email
     * @returns {Promise<object|null>}
     */
    async findByEmail(email) {
      const [rows] = await pool.query(
        `SELECT id_usuario, nombre, email, password_hash, rol, activo,
                failed_attempts, locked_until
           FROM usuario
          WHERE email = ?
          LIMIT 1`,
        [email],
      );
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    },

    /**
     * Persiste de forma transaccional el estado de intentos de login.
     *
     * Se ejecuta dentro de una transacción (BEGIN/COMMIT con ROLLBACK ante
     * error) para garantizar que `failed_attempts` y `locked_until` se
     * actualizan de forma atómica (R1.4, Property 20).
     *
     * @param {number|string} idUsuario
     * @param {{ failedAttempts: number, lockedUntil: number|null }} state
     * @returns {Promise<void>}
     */
    async updateLoginState(idUsuario, state) {
      const failedAttempts = Number.isInteger(state.failedAttempts) ? state.failedAttempts : 0;
      const lockedUntil = epochMsToMysqlDatetime(state.lockedUntil);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `UPDATE usuario
              SET failed_attempts = ?, locked_until = ?
            WHERE id_usuario = ?`,
          [failedAttempts, lockedUntil, idUsuario],
        );
        await connection.commit();
      } catch (err) {
        try {
          await connection.rollback();
        } catch (_rollbackErr) {
          // Ignorar errores de rollback; se propaga el error original.
        }
        throw err;
      } finally {
        connection.release();
      }
    },
  };
}

module.exports = {
  epochMsToMysqlDatetime,
  createUserRepository,
};

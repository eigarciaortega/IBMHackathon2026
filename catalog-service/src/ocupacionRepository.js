'use strict';

/**
 * ocupacionRepository — acceso a datos del Tablero_Ocupacion (tarea 4.6).
 *
 * Aísla las consultas SQL necesarias para construir el Tablero_Ocupacion del
 * `catalog-service`. Recibe un pool/conexión compatible con la API
 * `mysql2/promise` (`pool.query(sql, params) -> [rows, fields]`), lo que permite
 * inyectar un doble de prueba en los tests de endpoint sin MySQL en vivo.
 *
 * Devuelve los datos crudos (Espacios y Reservas no canceladas que abarcan la
 * fecha de referencia); la derivación del estado "ocupado"/"libre" la realiza el
 * módulo de lógica pura `occupancyResolver` (R4.1, R4.3), manteniendo el
 * repositorio libre de reglas de negocio. Es una operación de solo lectura: ante
 * un fallo de consulta no altera el estado de Espacios ni Reservas (R4.5).
 */

/** Estado_Reserva que NO cuenta como activa (R4.3). */
const ESTADO_CANCELADO = 'Cancelado';

/**
 * Crea un repositorio de ocupación sobre un pool `mysql2/promise`.
 *
 * @param {{ query: (sql: string, params?: any[]) => Promise<[any[], any]> }} pool
 * @returns {{ obtenerEspaciosYReservas: (fechaReferencia: Date) => Promise<{ espacios: any[], reservas: any[] }> }}
 */
function crearOcupacionRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('crearOcupacionRepository requiere un pool con método query()');
  }

  /**
   * Obtiene los Espacios activos y las Reservas no canceladas cuyo período
   * `[fecha_inicio, fecha_fin]` abarca la fecha de referencia.
   *
   * El filtrado por fecha/estado se aplica en SQL como optimización; la
   * verificación definitiva de actividad (período inclusivo, R4.3) la realiza
   * `occupancyResolver`, garantizando una única fuente de verdad de la regla.
   *
   * @param {Date} fechaReferencia
   * @returns {Promise<{ espacios: any[], reservas: any[] }>}
   */
  async function obtenerEspaciosYReservas(fechaReferencia) {
    const [espacios] = await pool.query(
      'SELECT id_espacio, nombre, piso, ubicacion FROM espacio WHERE activo = TRUE',
    );

    const [reservas] = await pool.query(
      `SELECT id_espacio, estado_reserva, fecha_inicio, fecha_fin
         FROM reserva
        WHERE estado_reserva <> ?
          AND fecha_inicio <= ?
          AND fecha_fin >= ?`,
      [ESTADO_CANCELADO, fechaReferencia, fechaReferencia],
    );

    return {
      espacios: Array.isArray(espacios) ? espacios : [],
      reservas: Array.isArray(reservas) ? reservas : [],
    };
  }

  return { obtenerEspaciosYReservas };
}

module.exports = {
  crearOcupacionRepository,
  ESTADO_CANCELADO,
};

'use strict';

/**
 * availabilityRepository — acceso a datos para la búsqueda de disponibilidad
 * (`GET /disponibilidad`, tarea 7.1) sobre un pool mysql2.
 *
 * Abstrae la persistencia detrás de una interfaz cohesiva y mockeable: el
 * endpoint depende de esta interfaz, no de SQL directo, de modo que las pruebas
 * de endpoint pueden inyectar un repositorio simulado sin MySQL en vivo.
 *
 * Reglas de diseño (R5.1-R5.3, R5.7):
 *   - `obtenerEspaciosYReservasParaRango` recupera los Espacios candidatos
 *     (activos; opcionalmente filtrados por `tipo` y `capacidadMin` ya en SQL
 *     para reducir el conjunto) junto con las Reservas activas
 *     (`estado_reserva <> 'Cancelado'`) del mismo conjunto de Espacios cuyos
 *     rangos `[fecha_inicio, fecha_fin)` puedan intersecar el período buscado.
 *   - La decisión final de disponibilidad (exclusión por Solapamiento con
 *     límites exclusivos y aplicación de los filtros) la realiza la lógica pura
 *     `availabilityFilter` en el endpoint, manteniendo el repositorio simple.
 */

/** Columnas del Espacio devueltas para la disponibilidad. */
const ESPACIO_COLUMNS = 'id_espacio, nombre, tipo, capacidad, piso, ubicacion, activo';

/**
 * Crea el repositorio de disponibilidad sobre un pool mysql2 (API de promesas).
 *
 * @param {import('mysql2/promise').Pool} pool
 * @returns {{
 *   obtenerEspaciosYReservasParaRango: (criterios: object) => Promise<{ espacios: object[], reservas: object[] }>,
 * }}
 */
function createAvailabilityRepository(pool) {
  /**
   * Recupera los Espacios candidatos y las Reservas activas que podrían
   * intersecar el período buscado.
   *
   * @param {object} criterios
   * @param {Date|string|number} criterios.fecha_inicio - Inicio del rango buscado (UTC).
   * @param {Date|string|number} criterios.fecha_fin - Fin del rango buscado (UTC).
   * @param {string} [criterios.tipo] - Filtro de Tipo_Espacio (opcional).
   * @param {number|string} [criterios.capacidadMin] - Capacidad mínima (opcional).
   * @returns {Promise<{ espacios: object[], reservas: object[] }>}
   */
  async function obtenerEspaciosYReservasParaRango(criterios = {}) {
    const { fecha_inicio: fechaInicio, fecha_fin: fechaFin, tipo, capacidadMin } = criterios;

    // 1. Espacios activos candidatos, con prefiltros opcionales en SQL.
    let sqlEspacios = `SELECT ${ESPACIO_COLUMNS} FROM espacio WHERE activo = 1`;
    const paramsEspacios = [];
    if (tipo !== undefined && tipo !== null && String(tipo).trim() !== '') {
      sqlEspacios += ' AND tipo = ?';
      paramsEspacios.push(tipo);
    }
    if (capacidadMin !== undefined && capacidadMin !== null && String(capacidadMin).trim() !== '') {
      sqlEspacios += ' AND capacidad >= ?';
      paramsEspacios.push(Number(capacidadMin));
    }

    const [espacios] = await pool.query(sqlEspacios, paramsEspacios);

    // 1b. Recursos asociados a cada Espacio candidato (vía espacio_recurso).
    //     Se adjuntan como `recursos: number[]` (ids) para que la lógica pura
    //     `availabilityFilter` pueda filtrar por el conjunto de recursos pedido.
    if (espacios.length > 0) {
      const ids = espacios.map((e) => e.id_espacio);
      const [recursoRows] = await pool.query(
        `SELECT id_espacio, id_recurso FROM espacio_recurso WHERE id_espacio IN (?)`,
        [ids],
      );
      const mapa = new Map();
      for (const row of recursoRows) {
        if (!mapa.has(row.id_espacio)) mapa.set(row.id_espacio, []);
        mapa.get(row.id_espacio).push(row.id_recurso);
      }
      for (const espacio of espacios) {
        espacio.recursos = mapa.get(espacio.id_espacio) || [];
      }
    }

    // 2. Reservas activas que puedan intersecar el período (límites exclusivos).
    const [reservas] = await pool.query(
      `SELECT id_reserva, id_espacio, fecha_inicio, fecha_fin, estado_reserva
         FROM reserva
        WHERE estado_reserva <> 'Cancelado'
          AND fecha_inicio < ?
          AND fecha_fin > ?`,
      [fechaFin, fechaInicio],
    );

    return { espacios, reservas };
  }

  return {
    obtenerEspaciosYReservasParaRango,
  };
}

module.exports = { createAvailabilityRepository, ESPACIO_COLUMNS };

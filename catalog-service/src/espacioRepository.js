'use strict';

/**
 * espacioRepository — acceso a datos de Espacios sobre un pool mysql2.
 *
 * Abstrae la persistencia del catálogo de Espacios detrás de una interfaz
 * cohesiva. Los endpoints del Servicio_Catalogo dependen de esta interfaz, no
 * de SQL directo, lo que permite inyectar un repositorio simulado en las
 * pruebas de endpoint (sin MySQL en vivo).
 *
 * Reglas de diseño:
 *   - Las ESCRITURAS (crear / actualizar / eliminar), incluida la sincronización
 *     de filas en la tabla de unión `espacio_recurso`, se ejecutan dentro de una
 *     transacción. Ante cualquier error se hace `ROLLBACK`, garantizando que no
 *     queden cambios parciales (R14.1, R14.2, atomicidad).
 *   - El LISTADO (R3.4) resuelve los Recursos asociados a cada Espacio mediante
 *     la unión `espacio_recurso` contra el catálogo `recurso` (no desde un campo
 *     embebido), e incluye todos los atributos: nombre, tipo, capacidad, piso,
 *     ubicacion y los recursos resueltos.
 *
 * Forma de un Espacio devuelto:
 *   {
 *     id_espacio, nombre, tipo, capacidad, piso, ubicacion, activo,
 *     recursos: [{ id_recurso, nombre }, ...]
 *   }
 */

/** Columnas básicas del Espacio recuperadas en lecturas. */
const ESPACIO_COLUMNS =
  'id_espacio, nombre, tipo, capacidad, piso, ubicacion, activo';

/**
 * Normaliza la entrada de recursos a un array de `id_recurso` (enteros).
 * Acepta:
 *   - array de números/strings numéricos: [1, 2, "3"]
 *   - array de objetos con `id_recurso`: [{ id_recurso: 1 }, ...]
 * Cualquier otra forma (incluido undefined/null) produce un array vacío.
 *
 * @param {*} recursos
 * @returns {number[]} ids de recurso únicos y válidos.
 */
function normalizeRecursoIds(recursos) {
  if (!Array.isArray(recursos)) {
    return [];
  }
  const ids = [];
  for (const item of recursos) {
    let id;
    if (item && typeof item === 'object') {
      id = item.id_recurso;
    } else {
      id = item;
    }
    const num = Number(id);
    if (Number.isInteger(num) && num > 0) {
      ids.push(num);
    }
  }
  // Eliminar duplicados preservando el orden.
  return Array.from(new Set(ids));
}

/**
 * Crea el repositorio de Espacios sobre un pool mysql2 (API de promesas).
 *
 * @param {import('mysql2/promise').Pool} pool
 * @returns {{
 *   listarEspacios: () => Promise<Array<object>>,
 *   obtenerEspacioPorId: (id: number|string, executor?: object) => Promise<object|null>,
 *   crearEspacio: (data: object) => Promise<object>,
 *   actualizarEspacio: (id: number|string, data: object) => Promise<object|null>,
 *   eliminarEspacio: (id: number|string) => Promise<boolean>,
 * }}
 */
function createEspacioRepository(pool) {
  /**
   * Resuelve los recursos asociados a un conjunto de Espacios mediante la unión
   * `espacio_recurso` contra el catálogo `recurso`.
   * @param {object} executor - pool o conexión transaccional.
   * @param {number[]} ids - ids de Espacio.
   * @returns {Promise<Map<number, Array<{id_recurso:number, nombre:string}>>>}
   */
  async function recursosPorEspacio(executor, ids) {
    const mapa = new Map();
    if (ids.length === 0) {
      return mapa;
    }
    const [rows] = await executor.query(
      `SELECT er.id_espacio, r.id_recurso, r.nombre
         FROM espacio_recurso er
         JOIN recurso r ON r.id_recurso = er.id_recurso
        WHERE er.id_espacio IN (?)
        ORDER BY r.nombre`,
      [ids],
    );
    for (const row of rows) {
      if (!mapa.has(row.id_espacio)) {
        mapa.set(row.id_espacio, []);
      }
      mapa.get(row.id_espacio).push({ id_recurso: row.id_recurso, nombre: row.nombre });
    }
    return mapa;
  }

  /**
   * Lista el catálogo completo de Recursos normalizados (id + nombre), ordenado
   * por id. Lo consumen la Vista de administración (checklist al crear/editar un
   * Espacio) y el Panel de búsqueda del COLABORADOR (filtro por recursos).
   * @returns {Promise<Array<{ id_recurso:number, nombre:string }>>}
   */
  async function listarRecursos() {
    const [rows] = await pool.query(
      'SELECT id_recurso, nombre FROM recurso ORDER BY id_recurso',
    );
    return rows;
  }

  /**
   * Lista todos los Espacios con sus atributos completos y Recursos resueltos
   * vía la unión `espacio_recurso` contra `recurso` (R3.4).
   * @returns {Promise<Array<object>>}
   */
  async function listarEspacios() {
    const [espacios] = await pool.query(
      `SELECT ${ESPACIO_COLUMNS} FROM espacio ORDER BY id_espacio`,
    );
    if (espacios.length === 0) {
      return [];
    }
    const ids = espacios.map((e) => e.id_espacio);
    const mapa = await recursosPorEspacio(pool, ids);
    return espacios.map((e) => ({
      ...e,
      recursos: mapa.get(e.id_espacio) || [],
    }));
  }

  /**
   * Obtiene un Espacio por id con sus Recursos resueltos, o null si no existe.
   * @param {number|string} id
   * @param {object} [executor] - pool o conexión transaccional; por defecto el pool.
   * @returns {Promise<object|null>}
   */
  async function obtenerEspacioPorId(id, executor = pool) {
    const [rows] = await executor.query(
      `SELECT ${ESPACIO_COLUMNS} FROM espacio WHERE id_espacio = ?`,
      [id],
    );
    if (rows.length === 0) {
      return null;
    }
    const espacio = rows[0];
    const mapa = await recursosPorEspacio(executor, [espacio.id_espacio]);
    return { ...espacio, recursos: mapa.get(espacio.id_espacio) || [] };
  }

  /**
   * Reemplaza las filas de `espacio_recurso` de un Espacio por el conjunto dado.
   * @param {object} conn - conexión transaccional.
   * @param {number|string} idEspacio
   * @param {*} recursos - entrada de recursos (ver normalizeRecursoIds).
   */
  async function sincronizarRecursos(conn, idEspacio, recursos) {
    await conn.query('DELETE FROM espacio_recurso WHERE id_espacio = ?', [idEspacio]);
    const ids = normalizeRecursoIds(recursos);
    if (ids.length > 0) {
      const values = ids.map((idRecurso) => [idEspacio, idRecurso]);
      await conn.query(
        'INSERT INTO espacio_recurso (id_espacio, id_recurso) VALUES ?',
        [values],
      );
    }
  }

  /**
   * Crea un Espacio y sincroniza sus Recursos dentro de una transacción.
   * @param {object} data - { nombre, tipo, capacidad, piso, ubicacion, recursos?, activo? }
   * @returns {Promise<object>} el Espacio creado con Recursos resueltos.
   */
  async function crearEspacio(data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        `INSERT INTO espacio (nombre, tipo, capacidad, piso, ubicacion, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.nombre,
          data.tipo,
          Number(data.capacidad),
          data.piso,
          data.ubicacion,
          data.activo === undefined ? true : Boolean(data.activo),
        ],
      );
      const id = result.insertId;
      await sincronizarRecursos(conn, id, data.recursos);
      const espacio = await obtenerEspacioPorId(id, conn);
      await conn.commit();
      return espacio;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Actualiza un Espacio existente y sincroniza sus Recursos en una transacción.
   * Devuelve null si el Espacio no existe (sin aplicar cambios).
   * @param {number|string} id
   * @param {object} data - { nombre, tipo, capacidad, piso, ubicacion, recursos? }
   * @returns {Promise<object|null>}
   */
  async function actualizarEspacio(id, data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query(
        'SELECT id_espacio FROM espacio WHERE id_espacio = ?',
        [id],
      );
      if (existing.length === 0) {
        await conn.rollback();
        return null;
      }
      await conn.query(
        `UPDATE espacio
            SET nombre = ?, tipo = ?, capacidad = ?, piso = ?, ubicacion = ?
          WHERE id_espacio = ?`,
        [data.nombre, data.tipo, Number(data.capacidad), data.piso, data.ubicacion, id],
      );
      // Sincronizar recursos solo si el cliente los proporciona explícitamente.
      if (data.recursos !== undefined) {
        await sincronizarRecursos(conn, id, data.recursos);
      }
      const espacio = await obtenerEspacioPorId(id, conn);
      await conn.commit();
      return espacio;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Elimina un Espacio y sus filas de `espacio_recurso` en una transacción.
   * Devuelve false si el Espacio no existe (sin aplicar cambios).
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async function eliminarEspacio(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query(
        'SELECT id_espacio FROM espacio WHERE id_espacio = ?',
        [id],
      );
      if (existing.length === 0) {
        await conn.rollback();
        return false;
      }
      await conn.query('DELETE FROM espacio_recurso WHERE id_espacio = ?', [id]);
      await conn.query('DELETE FROM espacio WHERE id_espacio = ?', [id]);
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  return {
    listarEspacios,
    listarRecursos,
    obtenerEspacioPorId,
    crearEspacio,
    actualizarEspacio,
    eliminarEspacio,
  };
}

module.exports = { createEspacioRepository, normalizeRecursoIds };

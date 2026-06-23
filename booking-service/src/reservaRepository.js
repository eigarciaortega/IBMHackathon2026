'use strict';

/**
 * reservaRepository — acceso a datos de Reservas sobre un pool mysql2.
 *
 * Abstrae la persistencia del Servicio_Reservas detrás de una interfaz cohesiva.
 * Los endpoints dependen de esta interfaz, no de SQL directo, de modo que las
 * pruebas de endpoint pueden inyectar un repositorio simulado sin MySQL en vivo.
 *
 * Reglas de diseño (tarea 7.2, R6.x, R14.x):
 *   - `obtenerEspacioPorId` recupera el Espacio destino para comprobar su
 *     existencia (R6.8) y su Capacidad (R6.7) antes de crear la Reserva.
 *   - `crearReservaConVerificacion` ejecuta la creación dentro de una
 *     TRANSACCIÓN: bloquea (`SELECT ... FOR UPDATE`) las Reservas activas del
 *     mismo `id_espacio` cuyos rangos `[fecha_inicio, fecha_fin)` puedan
 *     intersecar el período solicitado, re-verifica el solapamiento con
 *     `overlapDetector` dentro de la transacción para evitar condiciones de
 *     carrera entre solicitudes concurrentes (R6.2/R6.4), inserta la Reserva con
 *     `estado_reserva = 'Activo'` asociada al `id_usuario` solicitante (R6.1,
 *     R14.1) y hace `COMMIT`. Ante conflicto o error hace `ROLLBACK`, sin dejar
 *     cambios parciales (atomicidad, R14.8).
 *
 * Forma de una Reserva devuelta: fila completa de la tabla `reserva`.
 */

const { overlapDetector } = require('./overlapDetector');

/**
 * Parsea un valor datetime a una instancia `Date` interpretada en UTC (R6.5).
 *
 * Necesario porque MySQL almacena `DATETIME` sin zona y `mysql2` (con
 * `timezone: 'Z'`) los devuelve como `Date` en UTC, mientras que `new Date()`
 * sobre una cadena SIN zona explícita (p. ej. `'2025-12-03 09:00:00'`) la
 * interpreta en hora LOCAL. Esa discrepancia haría que la re-verificación de
 * solapamiento en JS comparase instantes desfasados por el offset local.
 *
 * Reglas:
 *   - `Date`/número: se respetan tal cual (ya son un instante absoluto).
 *   - Cadena con zona explícita (`Z` o `±HH:MM`): se parsea como viene.
 *   - Cadena `YYYY-MM-DD[ T]HH:MM[:SS]` SIN zona: se interpreta como UTC.
 *
 * @param {Date|string|number} value
 * @returns {Date} instante en UTC (puede ser inválido si el valor no es parseable).
 */
function parseToUtcDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
    const isBareDatetime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s);
    if (isBareDatetime && !hasTz) {
      return new Date(`${s.replace(' ', 'T')}Z`);
    }
    return new Date(s);
  }
  return new Date(NaN);
}

/**
 * Convierte un valor datetime a un literal `DATETIME` de MySQL en UTC
 * (`YYYY-MM-DD HH:MM:SS`). Acepta ISO-8601 con `Z` (formato del contrato de la
 * API) y lo normaliza a la forma que el modo estricto de MySQL admite en un
 * `INSERT` (el sufijo `Z` provoca `ER_TRUNCATED_WRONG_VALUE`).
 *
 * @param {Date|string|number} value
 * @returns {string} literal `YYYY-MM-DD HH:MM:SS` en UTC.
 */
function toMysqlUtcDatetime(value) {
  return parseToUtcDate(value).toISOString().slice(0, 19).replace('T', ' ');
}

/** Columnas de la Reserva recuperadas en lecturas. */
const RESERVA_COLUMNS =
  'id_reserva, id_espacio, id_usuario, fecha_inicio, fecha_fin, ' +
  'cantidad_asistentes, estado_reserva, estado_asistencia, ' +
  'fecha_creacion, fecha_cancelacion';

/**
 * Crea el repositorio de Reservas sobre un pool mysql2 (API de promesas).
 *
 * @param {import('mysql2/promise').Pool} pool
 * @returns {{
 *   obtenerEspacioPorId: (id: number|string, executor?: object) => Promise<object|null>,
 *   crearReservaConVerificacion: (solicitud: object) => Promise<{ reserva?: object, conflicto?: boolean }>,
 * }}
 */
function createReservaRepository(pool) {
  /**
   * Obtiene el Espacio destino por id para validar existencia y capacidad.
   * @param {number|string} id
   * @param {object} [executor] - pool o conexión transaccional; por defecto el pool.
   * @returns {Promise<object|null>} El Espacio, o null si no existe.
   */
  async function obtenerEspacioPorId(id, executor = pool) {
    const [rows] = await executor.query(
      'SELECT id_espacio, nombre, tipo, capacidad, piso, ubicacion, activo ' +
        'FROM espacio WHERE id_espacio = ?',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Crea una Reserva verificando el solapamiento dentro de una transacción con
   * bloqueo sobre las Reservas activas que puedan intersecar el período.
   *
   * @param {object} solicitud
   * @param {number|string} solicitud.id_espacio
   * @param {number|string} solicitud.id_usuario - `sub` del token solicitante.
   * @param {Date|string|number} solicitud.fecha_inicio
   * @param {Date|string|number} solicitud.fecha_fin
   * @param {number|string} solicitud.cantidad_asistentes
   * @returns {Promise<{ reserva?: object, conflicto?: boolean }>}
   *   `{ reserva }` si se creó; `{ conflicto: true }` si solapaba con una activa.
   */
  async function crearReservaConVerificacion(solicitud) {
    const {
      id_espacio: idEspacio,
      id_usuario: idUsuario,
      fecha_inicio: fechaInicioRaw,
      fecha_fin: fechaFinRaw,
      cantidad_asistentes: cantidadAsistentes,
      ahora: ahoraRaw,
    } = solicitud;

    // Normalizar a UTC: literal MySQL para SQL/persistencia y `Date` (instante
    // absoluto) para la re-verificación en JS, de modo que ambos lados comparen
    // el mismo instante con independencia de la zona horaria local (R6.5).
    const fechaInicio = toMysqlUtcDatetime(fechaInicioRaw);
    const fechaFin = toMysqlUtcDatetime(fechaFinRaw);
    const inicioUtcDate = parseToUtcDate(fechaInicioRaw);
    const finUtcDate = parseToUtcDate(fechaFinRaw);
    // "Ahora" para la regla de liberación por no-show (hora-pared de oficina).
    const ahoraLiteral = toMysqlUtcDatetime(ahoraRaw || new Date());

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Serializar las creaciones concurrentes del mismo Espacio tomando un
      // bloqueo EXCLUSIVO sobre su fila antes de verificar el solapamiento. Sin
      // este bloqueo, dos solicitudes simultáneas sobre el mismo Espacio/rango
      // que aún no tiene Reservas verían ambas el rango vacío (el `FOR UPDATE`
      // sobre el rango no fija filas inexistentes de forma fiable) y ambas
      // insertarían, produciendo un doble booking. Bloquear la fila del Espacio
      // garantiza que solo una transacción a la vez ejecute la secuencia
      // verificar→insertar para ese Espacio, de modo que la segunda observe la
      // Reserva ya confirmada y obtenga un conflicto (R6.2, R14.3).
      await conn.query('SELECT id_espacio FROM espacio WHERE id_espacio = ? FOR UPDATE', [
        idEspacio,
      ]);

      // Bloquear las Reservas activas del mismo Espacio cuyos rangos puedan
      // intersecar el período solicitado (límites exclusivos): se descartan ya
      // en SQL las que no tocan el período, y el bloqueo FOR UPDATE evita que
      // una solicitud concurrente inserte una Reserva solapada en paralelo.
      const [candidatas] = await conn.query(
        `SELECT id_reserva, id_espacio, fecha_inicio, fecha_fin, estado_reserva
           FROM reserva
          WHERE id_espacio = ?
            AND estado_reserva <> 'Cancelado'
            AND fecha_inicio < ?
            AND fecha_fin > ?
            AND (estado_asistencia = 'show' OR fecha_inicio >= DATE_SUB(?, INTERVAL 15 MINUTE))
          FOR UPDATE`,
        [idEspacio, fechaFin, fechaInicio, ahoraLiteral],
      );

      // Re-verificar el solapamiento con la lógica pura dentro de la transacción.
      // Se usan instantes UTC (`Date`) para que coincidan con los `Date` UTC que
      // `mysql2` devuelve para las columnas `DATETIME` de `candidatas`.
      const reservaSolicitada = {
        id_espacio: idEspacio,
        fecha_inicio: inicioUtcDate,
        fecha_fin: finUtcDate,
      };
      if (overlapDetector(reservaSolicitada, candidatas)) {
        await conn.rollback();
        return { conflicto: true };
      }

      const [result] = await conn.query(
        `INSERT INTO reserva
           (fecha_inicio, fecha_fin, id_espacio, id_usuario, cantidad_asistentes, estado_reserva)
         VALUES (?, ?, ?, ?, ?, 'Activo')`,
        [fechaInicio, fechaFin, idEspacio, idUsuario, Number(cantidadAsistentes)],
      );

      const [rows] = await conn.query(
        `SELECT ${RESERVA_COLUMNS} FROM reserva WHERE id_reserva = ?`,
        [result.insertId],
      );

      await conn.commit();
      return { reserva: rows[0] };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Lista todas las Reservas del Usuario indicado (pasadas y futuras), sin
   * filtrar por estado ni por fecha (R7.1, R7.2). Ordena por inicio descendente
   * para presentar primero las más recientes. Una colección vacía es un
   * resultado válido cuando el Usuario no posee Reservas.
   *
   * @param {number|string} idUsuario - Propietario (`sub` del token).
   * @param {object} [executor] - pool o conexión; por defecto el pool.
   * @returns {Promise<object[]>} Reservas del Usuario (posiblemente vacío).
   */
  async function listarReservasDeUsuario(idUsuario, executor = pool) {
    const [rows] = await executor.query(
      `SELECT r.id_reserva, r.id_espacio, r.id_usuario, r.fecha_inicio, r.fecha_fin,
              r.cantidad_asistentes, r.estado_reserva, r.estado_asistencia,
              r.fecha_creacion, r.fecha_cancelacion,
              e.nombre AS espacio_nombre, e.piso AS espacio_piso, e.ubicacion AS espacio_ubicacion
         FROM reserva r
         JOIN espacio e ON e.id_espacio = r.id_espacio
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_inicio DESC`,
      [idUsuario],
    );
    return rows;
  }

  /**
   * Obtiene una Reserva por su identificador para resolver existencia (R7.7),
   * propiedad (R7.6) y estado/fecha (R7.4, R7.5) antes de cancelar.
   *
   * @param {number|string} id
   * @param {object} [executor] - pool o conexión transaccional; por defecto el pool.
   * @returns {Promise<object|null>} La Reserva, o null si no existe.
   */
  async function obtenerReservaPorId(id, executor = pool) {
    const [rows] = await executor.query(
      `SELECT ${RESERVA_COLUMNS} FROM reserva WHERE id_reserva = ?`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Cancela una Reserva dentro de una TRANSACCIÓN: cambia `estado_reserva` a
   * "Cancelado" y registra `fecha_cancelacion` (R7.3). La escritura es atómica:
   * ante cualquier error hace `ROLLBACK` sin dejar cambios parciales (R14.8).
   *
   * El cambio solo se aplica si la Reserva sigue sin estar "Cancelado", como
   * salvaguarda frente a una cancelación concurrente (idempotencia).
   *
   * @param {number|string} idReserva
   * @param {Date|string|number} fechaCancelacion - Instante de cancelación (UTC).
   * @returns {Promise<object|null>} La Reserva ya cancelada, o null si no existe.
   */
  async function cancelarReserva(idReserva, fechaCancelacion) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE reserva
            SET estado_reserva = 'Cancelado', fecha_cancelacion = ?
          WHERE id_reserva = ? AND estado_reserva <> 'Cancelado'`,
        [fechaCancelacion, idReserva],
      );

      const reserva = await obtenerReservaPorId(idReserva, conn);

      await conn.commit();
      return reserva;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Lista TODAS las Reservas del sistema (vista ADMINISTRADOR), enriquecidas con
   * el nombre del Espacio y el nombre/email del Usuario propietario para su
   * presentación. Ordena por inicio descendente.
   * @returns {Promise<object[]>}
   */
  async function listarTodasLasReservas() {
    const [rows] = await pool.query(
      `SELECT r.id_reserva, r.id_espacio, r.id_usuario, r.fecha_inicio, r.fecha_fin,
              r.cantidad_asistentes, r.estado_reserva, r.estado_asistencia,
              r.fecha_creacion, r.fecha_cancelacion,
              e.nombre AS espacio_nombre, e.piso AS espacio_piso, e.ubicacion AS espacio_ubicacion,
              u.nombre AS usuario_nombre, u.email AS usuario_email
         FROM reserva r
         JOIN espacio e ON e.id_espacio = r.id_espacio
         JOIN usuario u ON u.id_usuario = r.id_usuario
        ORDER BY r.fecha_inicio DESC`,
    );
    return rows;
  }

  /**
   * Actualiza una Reserva existente (rango y/o asistentes) dentro de una
   * TRANSACCIÓN, re-verificando el solapamiento contra las demás Reservas
   * activas del mismo Espacio (excluyendo la propia). El Espacio no se cambia.
   *
   * @param {object} datos
   * @param {number|string} datos.id_reserva
   * @param {number|string} datos.id_espacio
   * @param {Date|string|number} datos.fecha_inicio
   * @param {Date|string|number} datos.fecha_fin
   * @param {number|string} datos.cantidad_asistentes
   * @returns {Promise<{ reserva?: object, conflicto?: boolean }>}
   */
  async function actualizarReservaConVerificacion(datos) {
    const {
      id_reserva: idReserva,
      id_espacio: idEspacio,
      fecha_inicio: fechaInicioRaw,
      fecha_fin: fechaFinRaw,
      cantidad_asistentes: cantidadAsistentes,
      ahora: ahoraRaw,
    } = datos;

    const fechaInicio = toMysqlUtcDatetime(fechaInicioRaw);
    const fechaFin = toMysqlUtcDatetime(fechaFinRaw);
    const inicioUtcDate = parseToUtcDate(fechaInicioRaw);
    const finUtcDate = parseToUtcDate(fechaFinRaw);
    const ahoraLiteral = toMysqlUtcDatetime(ahoraRaw || new Date());

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Serializar por Espacio (igual que en la creación) para evitar carreras.
      await conn.query('SELECT id_espacio FROM espacio WHERE id_espacio = ? FOR UPDATE', [
        idEspacio,
      ]);

      // Reservas activas del Espacio que puedan intersecar, EXCLUYENDO la propia.
      const [candidatas] = await conn.query(
        `SELECT id_reserva, id_espacio, fecha_inicio, fecha_fin, estado_reserva
           FROM reserva
          WHERE id_espacio = ?
            AND id_reserva <> ?
            AND estado_reserva <> 'Cancelado'
            AND fecha_inicio < ?
            AND fecha_fin > ?
            AND (estado_asistencia = 'show' OR fecha_inicio >= DATE_SUB(?, INTERVAL 15 MINUTE))
          FOR UPDATE`,
        [idEspacio, idReserva, fechaFin, fechaInicio, ahoraLiteral],
      );

      const reservaSolicitada = {
        id_espacio: idEspacio,
        fecha_inicio: inicioUtcDate,
        fecha_fin: finUtcDate,
      };
      if (overlapDetector(reservaSolicitada, candidatas)) {
        await conn.rollback();
        return { conflicto: true };
      }

      await conn.query(
        `UPDATE reserva
            SET fecha_inicio = ?, fecha_fin = ?, cantidad_asistentes = ?
          WHERE id_reserva = ?`,
        [fechaInicio, fechaFin, Number(cantidadAsistentes), idReserva],
      );

      const [rows] = await conn.query(
        `SELECT ${RESERVA_COLUMNS} FROM reserva WHERE id_reserva = ?`,
        [idReserva],
      );

      await conn.commit();
      return { reserva: rows[0] };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Elimina (hard delete) una Reserva por id dentro de una transacción.
   * Pensado para la supervisión del ADMINISTRADOR ("eliminar cualquier reserva").
   * @param {number|string} idReserva
   * @returns {Promise<boolean>} true si se eliminó alguna fila.
   */
  async function eliminarReserva(idReserva) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.query('DELETE FROM reserva WHERE id_reserva = ?', [idReserva]);
      await conn.commit();
      return res.affectedRows > 0;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Lista la AGENDA de reuniones activas (no canceladas) de todos los Espacios,
   * enriquecida con el nombre del Espacio, ordenada por inicio ascendente
   * (próximas primero). Visible para cualquier usuario autenticado: permite a
   * los colaboradores ver qué salas tienen reuniones programadas. No expone
   * datos personales del propietario más allá del identificador.
   * @returns {Promise<object[]>}
   */
  async function listarAgenda() {
    const [rows] = await pool.query(
      `SELECT r.id_reserva, r.id_espacio, r.id_usuario, r.fecha_inicio, r.fecha_fin,
              r.cantidad_asistentes, r.estado_reserva, r.estado_asistencia,
              e.nombre AS espacio_nombre, e.piso AS espacio_piso, e.ubicacion AS espacio_ubicacion
         FROM reserva r
         JOIN espacio e ON e.id_espacio = r.id_espacio
        WHERE r.estado_reserva <> 'Cancelado'
        ORDER BY r.fecha_inicio ASC`,
    );
    return rows;
  }

  /**
   * Actualiza el `estado_asistencia` de una Reserva ('show' | 'no-show') dentro
   * de una transacción. Devuelve la Reserva actualizada, o null si no existe.
   * @param {number|string} idReserva
   * @param {'show'|'no-show'} estado
   * @returns {Promise<object|null>}
   */
  async function actualizarAsistencia(idReserva, estado) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE reserva SET estado_asistencia = ? WHERE id_reserva = ?', [
        estado,
        idReserva,
      ]);
      const reserva = await obtenerReservaPorId(idReserva, conn);
      await conn.commit();
      return reserva;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  return {
    obtenerEspacioPorId,
    crearReservaConVerificacion,
    listarReservasDeUsuario,
    listarTodasLasReservas,
    listarAgenda,
    actualizarReservaConVerificacion,
    actualizarAsistencia,
    obtenerReservaPorId,
    cancelarReserva,
    eliminarReserva,
  };
}

module.exports = { createReservaRepository, RESERVA_COLUMNS, parseToUtcDate, toMysqlUtcDatetime };

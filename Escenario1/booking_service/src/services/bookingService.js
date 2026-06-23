const pool = require('../db/pool');
const { hasOverlap } = require('../validators/overlapValidator');

const getAll = async (usuario_id) => {
  const result = await pool.query(
    `SELECT r.*, e.nombre as espacio_nombre, e.piso, e.tipo
     FROM reservaciones r
     JOIN espacios e ON r.espacio_id = e.id
     WHERE r.usuario_id = $1
     ORDER BY r.hora_entrada DESC`,
    [usuario_id]
  );
  return result.rows;
};

const getToday = async () => {
  const result = await pool.query(
    `SELECT r.*, e.nombre as espacio_nombre, e.piso, e.tipo,
            u.nombre as usuario_nombre, u.email
     FROM reservaciones r
     JOIN espacios e ON r.espacio_id = e.id
     JOIN usuarios u ON r.usuario_id = u.id
     WHERE DATE(r.hora_entrada) = CURRENT_DATE
       AND r.status = 'CONFIRMED'
     ORDER BY r.hora_entrada ASC`
  );
  return result.rows;
};

// NUEVO: Obtener reservas por fecha específica
const getByDate = async (fecha) => {
  const result = await pool.query(
    `SELECT r.*, e.nombre as espacio_nombre, e.piso, e.tipo,
            u.nombre as usuario_nombre, u.email
     FROM reservaciones r
     JOIN espacios e ON r.espacio_id = e.id
     JOIN usuarios u ON r.usuario_id = u.id
     WHERE DATE(r.hora_entrada) = $1
       AND r.status IN ('CONFIRMED', 'PENDING')
     ORDER BY r.hora_entrada ASC`,
    [fecha]
  );
  return result.rows;
};

const create = async ({ espacio_id, usuario_id, hora_entrada, hora_salida, asistentes }) => {
  // Validar que no sea en el pasado
  if (new Date(hora_entrada) < new Date()) {
    throw { status: 400, message: 'No se pueden crear reservas en el pasado' };
  }

  // Validar que hora_salida > hora_entrada
  if (new Date(hora_salida) <= new Date(hora_entrada)) {
    throw { status: 400, message: 'La hora de salida debe ser mayor a la hora de entrada' };
  }

  // Validar que el espacio existe y está disponible
  const espacioResult = await pool.query(
    `SELECT * FROM espacios WHERE id = $1 AND disponible = true`,
    [espacio_id]
  );
  const espacio = espacioResult.rows[0];

  if (!espacio) {
    throw { status: 404, message: 'Espacio no encontrado o no disponible' };
  }

  // Validar capacidad
  if (asistentes > espacio.capacidad) {
    throw { 
      status: 400, 
      message: `El espacio tiene capacidad para ${espacio.capacidad} personas, solicitaste ${asistentes}` 
    };
  }

  // MEJORADO: Validar overlap (ahora ignora CANCELLED y PENDING)
  const overlap = await hasOverlap(espacio_id, hora_entrada, hora_salida);
  if (overlap) {
    throw { 
      status: 409, 
      message: 'El espacio ya tiene una reserva confirmada en ese horario. Por favor elige otro horario.' 
    };
  }

  // Crear reserva
  const result = await pool.query(
    `INSERT INTO reservaciones (espacio_id, usuario_id, hora_entrada, hora_salida, asistentes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [espacio_id, usuario_id, hora_entrada, hora_salida, asistentes]
  );
  return result.rows[0];
};

const cancel = async (id, usuario_id) => {
  // Verificar que la reserva existe y pertenece al usuario
  const result = await pool.query(
    `SELECT * FROM reservaciones WHERE id = $1`,
    [id]
  );
  const reserva = result.rows[0];

  if (!reserva) {
    throw { status: 404, message: 'Reserva no encontrada' };
  }

  if (reserva.usuario_id !== usuario_id) {
    throw { status: 403, message: 'No puedes cancelar una reserva que no es tuya' };
  }

  if (new Date(reserva.hora_entrada) < new Date()) {
    throw { status: 400, message: 'No puedes cancelar una reserva que ya pasó' };
  }

  const updated = await pool.query(
    `UPDATE reservaciones SET status = 'CANCELLED' 
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return updated.rows[0];
};

const getAvailableSpaces = async ({ hora_entrada, hora_salida, tipo, capacidad }) => {
  let query = `
    SELECT * FROM espacios
    WHERE disponible = true
    AND id NOT IN (
      SELECT espacio_id FROM reservaciones
      WHERE status IN ('CONFIRMED', 'PENDING')
        AND hora_entrada < $2
        AND hora_salida  > $1
    )
  `;
  const params = [hora_entrada, hora_salida];

  if (tipo) {
    params.push(tipo.toUpperCase());
    query += ` AND tipo = $${params.length}`;
  }

  if (capacidad) {
    params.push(parseInt(capacidad));
    query += ` AND capacidad >= $${params.length}`;
  }

  query += ` ORDER BY id ASC`;
  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = { getAll, getToday, getByDate, create, cancel, getAvailableSpaces };

// Made with Bob

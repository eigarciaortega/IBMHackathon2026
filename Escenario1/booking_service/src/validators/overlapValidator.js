const pool = require('../db/pool');

/**
 * Verifica si existe solapamiento de horarios para un espacio
 * Solo considera reservas con status 'CONFIRMED' o 'PENDING'
 * Ignora reservas 'CANCELLED'
 * 
 * @param {number} espacio_id - ID del espacio
 * @param {string} hora_entrada - Hora de entrada de la nueva reserva
 * @param {string} hora_salida - Hora de salida de la nueva reserva
 * @param {number} excludeId - ID de reserva a excluir (para ediciones)
 * @returns {boolean} true si hay solapamiento, false si no
 */
const hasOverlap = async (espacio_id, hora_entrada, hora_salida, excludeId = null) => {
  let query = `
    SELECT id, hora_entrada, hora_salida, status 
    FROM reservaciones
    WHERE espacio_id = $1
      AND status IN ('CONFIRMED', 'PENDING')
      AND hora_entrada < $3
      AND hora_salida  > $2
  `;
  const params = [espacio_id, hora_entrada, hora_salida];

  // Para ediciones — excluye la reserva actual de la verificación
  if (excludeId) {
    params.push(excludeId);
    query += ` AND id != $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

module.exports = { hasOverlap };

// Made with Bob

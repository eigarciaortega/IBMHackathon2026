const pool = require('../db/pool');

const getAllSpaces = async ({ type, min_capacity }) => {
  let query = 'SELECT * FROM spaces WHERE is_active = TRUE';
  const params = [];

  if (type) {
    params.push(type.toUpperCase());
    query += ` AND type = $${params.length}`;
  }

  if (min_capacity) {
    params.push(Number(min_capacity));
    query += ` AND capacity >= $${params.length}`;
  }

  query += ' ORDER BY type, name';

  const result = await pool.query(query, params);
  return result.rows;
};

const getSpaceById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM spaces WHERE id = $1 AND is_active = TRUE',
    [id]
  );
  return result.rows[0] || null;
};

// Returns spaces that have NO active booking overlapping the requested window.
// Uses LEFT JOIN + IS NULL to find spaces free in that interval.
// Overlap condition (same logic as booking-service):
//   existing.start_time < requested_end AND existing.end_time > requested_start
const getAvailableSpaces = async ({ start_time, end_time, type, min_capacity }) => {
  let query = `
    SELECT s.*
    FROM spaces s
    LEFT JOIN bookings b
      ON b.space_id   = s.id
      AND b.status    = 'ACTIVE'
      AND b.start_time < $2
      AND b.end_time   > $1
    WHERE s.is_active = TRUE
      AND b.id IS NULL
  `;

  const params = [start_time, end_time];

  if (type) {
    params.push(type.toUpperCase());
    query += ` AND s.type = $${params.length}`;
  }

  if (min_capacity) {
    params.push(Number(min_capacity));
    query += ` AND s.capacity >= $${params.length}`;
  }

  query += ' ORDER BY s.type, s.capacity';

  const result = await pool.query(query, params);
  return result.rows;
};

const createSpace = async ({ name, type, capacity, floor, has_projector, has_ac }) => {
  const result = await pool.query(
    `INSERT INTO spaces (name, type, capacity, floor, has_projector, has_ac)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, type.toUpperCase(), capacity, floor || null, has_projector || false, has_ac || false]
  );
  return result.rows[0];
};

const updateSpace = async (id, fields) => {
  const { name, type, capacity, floor, has_projector, has_ac } = fields;

  const result = await pool.query(
    `UPDATE spaces
     SET name          = COALESCE($1, name),
         type          = COALESCE($2, type),
         capacity      = COALESCE($3, capacity),
         floor         = COALESCE($4, floor),
         has_projector = COALESCE($5, has_projector),
         has_ac        = COALESCE($6, has_ac)
     WHERE id = $7 AND is_active = TRUE
     RETURNING *`,
    [
      name || null,
      type ? type.toUpperCase() : null,
      capacity || null,
      floor || null,
      has_projector !== undefined ? has_projector : null,
      has_ac !== undefined ? has_ac : null,
      id,
    ]
  );

  return result.rows[0] || null;
};

// Soft delete: marks space as inactive instead of deleting the row.
// Preserves booking history integrity.
const deleteSpace = async (id) => {
  const result = await pool.query(
    'UPDATE spaces SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id',
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllSpaces,
  getSpaceById,
  getAvailableSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
};

const pool = require('../db/pool');

const getAll = async ({ tipo, capacidad }) => {
  let query = `SELECT * FROM espacios WHERE disponible = true`;
  const params = [];

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

const getById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM espacios WHERE id = $1 AND disponible = true`,
    [id]
  );
  return result.rows[0];
};

const create = async ({ nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador }) => {
  const result = await pool.query(
    `INSERT INTO espacios (nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      nombre,
      tipo.toUpperCase(),
      capacidad,
      piso,
      con_proyector ?? false,
      con_aire      ?? false,
      con_pizarron  ?? false,
      con_tv        ?? false,
      con_refrigerador ?? false
    ]
  );
  return result.rows[0];
};

const update = async (id, { nombre, tipo, capacidad, piso, con_proyector, con_aire, con_pizarron, con_tv, con_refrigerador }) => {
  const result = await pool.query(
    `UPDATE espacios SET
      nombre       = COALESCE($1, nombre),
      tipo         = COALESCE($2, tipo),
      capacidad    = COALESCE($3, capacidad),
      piso         = COALESCE($4, piso),
      con_proyector = COALESCE($5, con_proyector),
      con_aire     = COALESCE($6, con_aire),
      con_pizarron = COALESCE($7, con_pizarron),
      con_tv       = COALESCE($8, con_tv),
      con_refrigerador = COALESCE($9, con_refrigerador)
     WHERE id = $10 AND disponible = true RETURNING *`,
    [
      nombre,
      tipo ? tipo.toUpperCase() : null,
      capacidad,
      piso,
      con_proyector,
      con_aire,
      con_pizarron,
      con_tv,
      con_refrigerador,
      id
    ]
  );
  return result.rows[0];
};

const remove = async (id) => {
  const result = await pool.query(
    `UPDATE espacios SET disponible = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

module.exports = { getAll, getById, create, update, remove };

// Made with Bob

const pool = require('../db/pool');
const jwt = require('jsonwebtoken');

const login = async (email, contrasena) => {
  const result = await pool.query(
    `SELECT id, email, nombre, perfil FROM usuarios 
     WHERE email = $1 AND contrasena = $2`,
    [email, contrasena]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, perfil: user.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, user };
};

module.exports = { login };
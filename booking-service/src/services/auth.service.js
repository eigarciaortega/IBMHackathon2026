const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const login = async (email, password) => {
  const result = await pool.query(
    'SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return null;
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  return { token, user: payload };
};

module.exports = { login };

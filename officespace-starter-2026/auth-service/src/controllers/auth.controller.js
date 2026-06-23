const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const JWT_SECRET = process.env.JWT_SECRET || 'officespace_secret_2026';
const JWT_EXPIRES = '8h';

const pool = new Pool({
  user: process.env.DB_USER || 'alpha_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'officespace',
  password: process.env.DB_PASSWORD || 'AlphaPassword123',
  port: process.env.DB_PORT || 5432,
});

// ─── POST /login ──────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, rol FROM usuarios WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── POST /verify ─────────────────────────────────────────────────────────────
// Usado internamente por otros servicios para validar tokens
const verify = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, usuario: decoded });
  } catch (error) {
    return res.status(401).json({ valid: false, error: 'Token inválido o expirado' });
  }
};

module.exports = { login, verify };

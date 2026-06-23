/**
 * Middleware de autenticación JWT reutilizable.
 * Copia este archivo en src/middleware/ de cada servicio que lo necesite.
 *
 * Uso:
 *   const { verificarToken, soloAdmin } = require('./middleware/auth.middleware');
 *   router.get('/ruta', verificarToken, soloAdmin, controlador);
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'officespace_secret_2026';

// ─── Verifica que el request traiga un JWT válido ─────────────────────────────
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded; // { id, email, rol, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ─── Solo permite rol ADMINISTRADOR ──────────────────────────────────────────
const soloAdmin = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol de Administrador' });
  }
  next();
};

// ─── Permite Colaborador o Administrador ─────────────────────────────────────
const colaboradorOAdmin = (req, res, next) => {
  const rolesPermitidos = ['COLABORADOR', 'ADMINISTRADOR'];
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: rol no autorizado' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin, colaboradorOAdmin };

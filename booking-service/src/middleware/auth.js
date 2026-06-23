/**
 * Middleware de autenticación/autorización JWT.
 * Cada microservicio incluye su propia copia (no se comparten funciones
 * entre servicios; solo el secreto JWT vía variable de entorno).
 */
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

const JWT_SECRET = process.env.JWT_SECRET || 'ibm-officespace-shared-secret-change-me'

async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' })
  }
  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  try {
    const { rows } = await query(
      'SELECT id, full_name, email, role FROM users WHERE id = $1',
      [payload.sub],
    )
    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Usuario no existe o fue eliminado' })
    }
    req.user = {
      ...payload,
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    }
    return next()
  } catch (err) {
    console.error('[auth] No se pudo validar el usuario', err)
    return res.status(503).json({ error: 'No se pudo validar el usuario en este momento' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' })
    }
    return next()
  }
}

module.exports = { authenticate, requireRole, JWT_SECRET }

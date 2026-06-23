/**
 * Autenticación del accounts-service (emisor del JWT).
 *
 * - `signToken(user)`  : firma un JWT con la identidad del usuario.
 * - `requireAuth`      : exige Bearer válido y deja `req.user`.
 * - `requireInternal`  : exige la clave compartida entre servicios
 *                        (header `x-internal-key`) para llamadas máquina-a-máquina.
 *
 * El JWT incluye email y phone para que otros servicios (notificaciones)
 * puedan filtrar por la identidad sin volver a consultar la BD.
 */
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'neowallet-dev-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neowallet-internal-key-change-me'

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )
}

function getBearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}

function requireAuth(req, res, next) {
  const token = getBearer(req)
  if (!token) return res.status(401).json({ error: 'unauthorized', message: 'Falta el token de acceso' })
  try {
    const p = jwt.verify(token, JWT_SECRET)
    req.user = { id: p.sub, name: p.name, email: p.email, phone: p.phone }
    return next()
  } catch (_) {
    return res.status(401).json({ error: 'invalid_token', message: 'Sesión inválida o expirada' })
  }
}

function requireInternal(req, res, next) {
  const key = req.headers['x-internal-key']
  if (key && key === INTERNAL_API_KEY) return next()
  return res.status(401).json({ error: 'unauthorized', message: 'Llamada interna no autorizada' })
}

module.exports = { signToken, requireAuth, requireInternal, JWT_SECRET, INTERNAL_API_KEY }

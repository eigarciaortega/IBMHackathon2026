/**
 * Autenticación del processor-service.
 * Verifica el MISMO JWT que emite accounts-service (secreto compartido) y
 * expone `requireInternal` para endpoints administrativos.
 */
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'neowallet-dev-secret-change-me'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'neowallet-internal-key-change-me'

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

module.exports = { requireAuth, requireInternal, INTERNAL_API_KEY }

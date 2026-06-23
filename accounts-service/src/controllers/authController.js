/**
 * Controlador de autenticación: registro, inicio de sesión y perfil.
 * Las contraseñas se guardan con hash bcrypt; el acceso devuelve un JWT.
 */
const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator')
const { query } = require('../config/db')
const { signToken } = require('../middleware/auth')
const { presentUser } = require('./accountController')
const logger = require('../config/logger')

function collectErrors(req, res) {
  const result = validationResult(req)
  if (result.isEmpty()) return false
  res.status(400).json({ error: 'invalid_request', detalles: result.array() })
  return true
}

// POST /auth/register
async function register(req, res, next) {
  if (collectErrors(req, res)) return
  const name = String(req.body.name).trim()
  const email = String(req.body.email).trim().toLowerCase()
  const phone = req.body.phone ? String(req.body.phone).trim() : null
  const password = req.body.password

  try {
    const exists = await query('SELECT id FROM users WHERE lower(email) = $1', [email])
    if (exists.rows[0]) {
      return res.status(409).json({ error: 'email_taken', message: 'Ya existe una cuenta con ese correo' })
    }
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash, balance)
       VALUES ($1, $2, $3, $4, 0.00) RETURNING *`,
      [name, email, phone, hash],
    )
    const user = rows[0]
    logger.info('usuario registrado', { reqId: req.id, user_id: user.id, email })
    return res.status(201).json({ token: signToken(user), user: presentUser(user) })
  } catch (err) {
    return next(err)
  }
}

// POST /auth/login
async function login(req, res, next) {
  if (collectErrors(req, res)) return
  const email = String(req.body.email).trim().toLowerCase()
  const password = req.body.password
  try {
    const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [email])
    const user = rows[0]
    // Mismo mensaje y trabajo aprox. para usuario inexistente o contraseña mala.
    const ok = user && user.password_hash && (await bcrypt.compare(password, user.password_hash))
    if (!ok) {
      logger.warn('login fallido', { reqId: req.id, email })
      return res.status(401).json({ error: 'invalid_credentials', message: 'Correo o contraseña incorrectos' })
    }
    logger.info('login exitoso', { reqId: req.id, user_id: user.id })
    return res.json({ token: signToken(user), user: presentUser(user) })
  } catch (err) {
    return next(err)
  }
}

// GET /auth/me  (requireAuth) — devuelve la cuenta actual con saldo fresco
async function me(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id])
    if (!rows[0]) return res.status(404).json({ error: 'user_not_found' })
    return res.json(presentUser(rows[0]))
  } catch (err) {
    return next(err)
  }
}

module.exports = { register, login, me }

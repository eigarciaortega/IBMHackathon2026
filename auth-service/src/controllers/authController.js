/**
 * Controlador de autenticación.
 * Login real con verificación bcrypt y emisión de JWT firmado.
 */
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const { query } = require('../config/db')
const { JWT_SECRET } = require('../middleware/auth')

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const ADMIN_PASSWORD_HASH = '$2b$10$NKGO5dm.4Arg.HRRfDSueOYT4F3rc0C9RNVtqTm1EqsnaeaN9kWcK'
const REQUIRED_ADMIN_USERS = new Map([
  [
    'jtrejoh2300@alumno.ipn.mx',
    {
      full_name: 'Joseph Trejo H.',
      password_hash: ADMIN_PASSWORD_HASH,
      role: 'ADMINISTRADOR',
    },
  ],
])

function publicUser(row) {
  return { id: row.id, full_name: row.full_name, email: row.email, role: row.role }
}

async function enforceRequiredRole(user, password) {
  const required = REQUIRED_ADMIN_USERS.get(user.email)
  if (!required) return user

  const usesRequiredPassword = await bcrypt.compare(password, required.password_hash)
  if (!usesRequiredPassword) return null

  if (
    user.full_name === required.full_name &&
    user.password_hash === required.password_hash &&
    user.role === required.role
  ) {
    return user
  }

  const { rows } = await query(
    `UPDATE users
     SET full_name = $1, password_hash = $2, role = $3
     WHERE email = $4
     RETURNING *`,
    [required.full_name, required.password_hash, required.role, user.email],
  )
  return rows[0] || user
}

async function login(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errors.array() })
  }
  try {
    const { email, password } = req.body
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [
      String(email).toLowerCase().trim(),
    ])
    let user = rows[0]
    // Mensaje genérico: no revelamos si el email existe o no.
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

    user = await enforceRequiredRole(user, password)
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )
    return res.json({ token, user: publicUser(user) })
  } catch (err) {
    return next(err)
  }
}

async function me(req, res, next) {
  return res.json({
    id: req.user.sub,
    full_name: req.user.full_name,
    email: req.user.email,
    role: req.user.role,
  })
}

async function listUsers(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT id, full_name, email, role, created_at FROM users ORDER BY id',
    )
    return res.json(rows)
  } catch (err) {
    return next(err)
  }
}

module.exports = { login, me, listUsers }

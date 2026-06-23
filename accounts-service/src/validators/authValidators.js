/**
 * Validadores PUROS de autenticación (sin BD). Reglas comerciales mínimas
 * de seguridad para registro/login.
 */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Email con forma válida. */
function isValidEmail(value) {
  return typeof value === 'string' && RE_EMAIL.test(value.trim())
}

/**
 * Política de contraseña: mínimo 8 caracteres, con al menos una letra y un
 * número. Suficiente para un MVP comercial sin frustrar al usuario.
 */
function isValidPassword(value) {
  if (typeof value !== 'string' || value.length < 8) return false
  return /[A-Za-z]/.test(value) && /\d/.test(value)
}

/** Valida el cuerpo de registro. */
function validateRegister({ name, email, password }) {
  const errors = []
  if (!name || String(name).trim().length < 2) {
    errors.push({ code: 'INVALID_NAME', message: 'El nombre debe tener al menos 2 caracteres' })
  }
  if (!isValidEmail(email)) {
    errors.push({ code: 'INVALID_EMAIL', message: 'Correo electrónico inválido' })
  }
  if (!isValidPassword(password)) {
    errors.push({ code: 'WEAK_PASSWORD', message: 'La contraseña debe tener 8+ caracteres, con letras y números' })
  }
  return { valid: errors.length === 0, errors }
}

/** Valida el cuerpo de login. */
function validateLogin({ email, password }) {
  const errors = []
  if (!isValidEmail(email)) errors.push({ code: 'INVALID_EMAIL', message: 'Correo electrónico inválido' })
  if (!password) errors.push({ code: 'MISSING_PASSWORD', message: 'La contraseña es obligatoria' })
  return { valid: errors.length === 0, errors }
}

module.exports = { isValidEmail, isValidPassword, validateRegister, validateLogin }

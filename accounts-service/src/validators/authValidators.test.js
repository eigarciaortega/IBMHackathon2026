/** Tests de validadores de autenticación (puros). npm test */
const { test } = require('node:test')
const assert = require('node:assert')
const { isValidEmail, isValidPassword, validateRegister, validateLogin } = require('./authValidators')

test('email válido / inválido', () => {
  assert.strictEqual(isValidEmail('a@b.com'), true)
  assert.strictEqual(isValidEmail('usuario.a@neowallet.com'), true)
  assert.strictEqual(isValidEmail('nope'), false)
  assert.strictEqual(isValidEmail('a@b'), false)
})

test('contraseña: 8+ con letra y número', () => {
  assert.strictEqual(isValidPassword('Demo1234!'), true)
  assert.strictEqual(isValidPassword('abcdefgh'), false) // sin número
  assert.strictEqual(isValidPassword('12345678'), false) // sin letra
  assert.strictEqual(isValidPassword('ab12'), false) // muy corta
})

test('registro válido pasa', () => {
  const r = validateRegister({ name: 'Ana López', email: 'ana@x.com', password: 'Secreta1' })
  assert.strictEqual(r.valid, true)
})
test('registro con datos malos falla', () => {
  const r = validateRegister({ name: 'A', email: 'x', password: 'corta' })
  assert.ok(r.errors.some((e) => e.code === 'INVALID_NAME'))
  assert.ok(r.errors.some((e) => e.code === 'INVALID_EMAIL'))
  assert.ok(r.errors.some((e) => e.code === 'WEAK_PASSWORD'))
})
test('login requiere email válido y password', () => {
  assert.strictEqual(validateLogin({ email: 'a@b.com', password: 'x' }).valid, true)
  assert.ok(validateLogin({ email: 'a@b.com' }).errors.some((e) => e.code === 'MISSING_PASSWORD'))
})

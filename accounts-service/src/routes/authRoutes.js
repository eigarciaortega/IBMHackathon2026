/**
 * Rutas de autenticación (públicas, salvo /auth/me).
 */
const express = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const registerValidators = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Nombre inválido'),
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isString().isLength({ min: 8 }).withMessage('La contraseña debe tener 8+ caracteres')
    .matches(/[A-Za-z]/).withMessage('Debe incluir una letra')
    .matches(/\d/).withMessage('Debe incluir un número'),
  body('phone').optional().isString().trim(),
]

const loginValidators = [
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isString().notEmpty().withMessage('La contraseña es obligatoria'),
]

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Autenticación]
 *     summary: 🆕 Crear cuenta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Ana López }
 *               email: { type: string, example: ana@neowallet.com }
 *               password: { type: string, example: Secreta123 }
 *               phone: { type: string, example: '+52 1 55 5555 0099' }
 *     responses:
 *       201: { description: Cuenta creada (token + usuario) }
 *       409: { description: Correo ya registrado }
 */
router.post('/auth/register', registerValidators, ctrl.register)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: 🔐 Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: usuario.a@neowallet.com }
 *               password: { type: string, example: Demo1234! }
 *     responses:
 *       200: { description: Token JWT + datos del usuario }
 *       401: { description: Credenciales inválidas }
 */
router.post('/auth/login', loginValidators, ctrl.login)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Autenticación]
 *     summary: 👤 Perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario actual con saldo }
 *       401: { description: No autenticado }
 */
router.get('/auth/me', requireAuth, ctrl.me)

module.exports = router

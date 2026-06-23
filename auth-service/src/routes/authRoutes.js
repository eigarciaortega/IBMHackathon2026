const express = require('express')
const { body } = require('express-validator')
const { authenticate, requireRole } = require('../middleware/auth')
const { login, me, listUsers } = require('../controllers/authController')

const router = express.Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Inicia sesión y devuelve un token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Credenciales' }
 *     responses:
 *       200:
 *         description: Login correcto
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RespuestaLogin' }
 *       400: { description: Datos inválidos }
 *       401: { description: Credenciales incorrectas }
 */
router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().notEmpty()],
  login,
)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Autenticación]
 *     summary: Devuelve el usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usuario actual
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       401: { description: Token requerido o inválido }
 */
router.get('/me', authenticate, me)

/**
 * @openapi
 * /auth/users:
 *   get:
 *     tags: [Autenticación]
 *     summary: Lista de usuarios (solo ADMINISTRADOR)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Listado de usuarios }
 *       403: { description: Permisos insuficientes }
 */
router.get('/users', authenticate, requireRole('ADMINISTRADOR'), listUsers)

module.exports = router

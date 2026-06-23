const router = require('express').Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, contrasena]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@corporativoalpha.com
 *               contrasena:
 *                 type: string
 *                 example: Admin123
 *     responses:
 *       200:
 *         description: Login exitoso, retorna token JWT
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login);

module.exports = router;
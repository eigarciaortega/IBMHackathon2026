/**
 * Rutas del notification-service.
 *
 * Seguridad:
 *  · `/api/notify` y los listados de admin → `requireInternal` (clave interna).
 *  · `/api/notifications/mine` → `requireAuth` (el usuario ve SOLO lo suyo).
 */
const express = require('express')
const { body, param } = require('express-validator')
const ctrl = require('../controllers/notificationController')
const { requireAuth, requireInternal } = require('../middleware/auth')

const router = express.Router()

const notifyValidators = [
  body('channel').isIn(['sms', 'email', 'both']).withMessage("channel debe ser 'sms', 'email' o 'both'"),
  body('template').isString().notEmpty(),
  body('to').isObject().withMessage('to debe ser un objeto con name/email/phone'),
]

/**
 * @openapi
 * /api/notify:
 *   post:
 *     tags: [Envíos]
 *     summary: 📨 Envía una notificación (interno · clave de servicio)
 *     description: Consumido por accounts-service y processor-service.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NotifyInput' }
 *     responses:
 *       201: { description: Notificación procesada (ids y preview_url) }
 *       400: { description: Datos o plantilla inválidos }
 *       401: { description: Llamada interna no autorizada }
 */
router.post('/api/notify', requireInternal, notifyValidators, ctrl.notify)

/**
 * @openapi
 * /api/notifications/mine:
 *   get:
 *     tags: [Consulta]
 *     summary: 🔔 Mis notificaciones (SMS + correos del usuario autenticado)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: '{ sms: [...], emails: [...] }' }
 *       401: { description: No autenticado }
 */
router.get('/api/notifications/mine', requireAuth, ctrl.getMine)

// --- Endpoints de administración (clave interna) ---------------------
router.get('/api/notifications', requireInternal, ctrl.listAll)
router.get('/api/notifications/sms/:phone', requireInternal, ctrl.getSmsByPhone)
router.get('/api/notifications/email/:email', requireInternal, ctrl.getEmailByAddress)
router.get('/api/notifications/:id', requireInternal, param('id').isInt({ min: 1 }), ctrl.getById)

module.exports = router

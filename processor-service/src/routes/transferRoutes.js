/**
 * Rutas del processor-service.
 *
 * Seguridad:
 *  · `requireAuth`     → el usuario opera SIEMPRE sobre sí mismo (sender = token).
 *  · `requireInternal` → operación administrativa (reconciliación).
 */
const express = require('express')
const { body } = require('express-validator')
const ctrl = require('../controllers/transferController')
const { isValidAmount } = require('../utils/money')
const { requireAuth, requireInternal } = require('../middleware/auth')

const router = express.Router()

const transferValidators = [
  body('receiver_id').isInt({ min: 1 }).withMessage('receiver_id debe ser un entero positivo'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount debe ser mayor a 0'),
  body('amount').custom(isValidAmount).withMessage('invalid_amount: máximo 2 decimales'),
]

/**
 * @openapi
 * /api/transfer:
 *   post:
 *     tags: [Transferencias]
 *     summary: 🔁 Transferencia P2P con patrón Saga (RF-003)
 *     description: >
 *       El remitente es el usuario autenticado. Debita y acredita de forma
 *       consistente; si el crédito falla tras debitar, compensa (Saga).
 *       Soporta cabecera **Idempotency-Key**.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema: { type: string, example: 'tx-2026-0001' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TransferInput' }
 *     responses:
 *       201: { description: Transferencia completada }
 *       400: { description: Monto inválido, auto-transferencia o fondos insuficientes }
 *       401: { description: No autenticado }
 *       404: { description: Beneficiario no encontrado }
 *       502: { description: Falló el crédito; débito revertido (ROLLED_BACK) }
 */
router.post('/api/transfer', requireAuth, transferValidators, ctrl.transfer)

/**
 * @openapi
 * /api/transactions/me:
 *   get:
 *     tags: [Historial]
 *     summary: 📜 Historial del usuario autenticado (RF-005)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 50 }
 *     responses:
 *       200: { description: Lista ordenada por fecha (desc) }
 *       401: { description: No autenticado }
 */
router.get('/api/transactions/me', requireAuth, ctrl.getHistory)

/**
 * @openapi
 * /api/transactions/me/statement:
 *   post:
 *     tags: [Historial]
 *     summary: 📧 Envía mi estado de cuenta por correo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Estado de cuenta enviado (datos de entrega) }
 *       401: { description: No autenticado }
 */
router.post('/api/transactions/me/statement', requireAuth, ctrl.emailStatement)

/**
 * @openapi
 * /api/admin/reconcile:
 *   post:
 *     tags: [Resiliencia]
 *     summary: ♻️ Ejecuta la reconciliación de transacciones atascadas (interno)
 *     responses:
 *       200: { description: Resumen de transacciones revisadas y resueltas }
 */
router.post('/api/admin/reconcile', requireInternal, ctrl.reconcileNow)

module.exports = router

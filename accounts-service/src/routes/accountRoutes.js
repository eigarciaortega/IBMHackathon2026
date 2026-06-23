/**
 * Rutas del accounts-service.
 *
 * Seguridad:
 *  · `requireAuth`     → endpoints del usuario final (perfil, directorio, recarga).
 *  · `requireInternal` → endpoints máquina-a-máquina que consume el processor
 *    (saldos, libro mayor, totales). No accesibles desde el navegador.
 */
const express = require('express')
const { body, param } = require('express-validator')
const ctrl = require('../controllers/accountController')
const { isValidAmount } = require('../utils/money')
const { requireAuth, requireInternal } = require('../middleware/auth')

const router = express.Router()

const userIdParam = [param('id').isInt({ min: 1 }).withMessage('id debe ser un entero positivo')]

const rechargeValidators = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount debe ser mayor a 0'),
  body('amount').custom(isValidAmount).withMessage('invalid_amount: máximo 2 decimales'),
  body('payment_method').optional().isIn(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CASH']),
]

const updateBalanceValidators = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id debe ser un entero positivo'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount debe ser mayor a 0'),
  body('amount').custom(isValidAmount).withMessage('invalid_amount: máximo 2 decimales'),
  body('operation').isIn(['debit', 'credit']).withMessage("operation debe ser 'debit' o 'credit'"),
]

/**
 * @openapi
 * /accounts/directory:
 *   get:
 *     tags: [Cuentas]
 *     summary: 👥 Directorio de beneficiarios (id, nombre, correo)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de posibles beneficiarios (sin saldos) }
 *       401: { description: No autenticado }
 */
router.get('/accounts/directory', requireAuth, ctrl.getDirectory)

/**
 * @openapi
 * /accounts:
 *   get:
 *     tags: [Interno]
 *     summary: 📋 Lista de cuentas (interno/admin)
 *     responses:
 *       200: { description: Arreglo de usuarios con su saldo }
 */
router.get('/accounts', requireInternal, ctrl.listAccounts)

/**
 * @openapi
 * /accounts/admin/total-balance:
 *   get:
 *     tags: [Auditoría]
 *     summary: 🧮 Suma global de saldos (conservación del dinero · RNF-006)
 *     description: Interno. La demo verifica que el total permanezca constante.
 *     responses:
 *       200: { description: Total del sistema }
 */
router.get('/accounts/admin/total-balance', requireInternal, ctrl.totalBalance)

/**
 * @openapi
 * /accounts/ledger/by-reference:
 *   get:
 *     tags: [Interno]
 *     summary: 🔎 Asientos del libro mayor por referencia (reconciliación)
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         schema: { type: string, example: 'transfer:42' }
 *     responses:
 *       200: { description: Asientos que comparten esa referencia }
 */
router.get('/accounts/ledger/by-reference', requireInternal, ctrl.getLedgerByReference)

/**
 * @openapi
 * /accounts/{id}:
 *   get:
 *     tags: [Interno]
 *     summary: 💰 Consulta una cuenta por id (interno · RF-001)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200: { description: Datos del usuario y su saldo }
 *       404: { description: Usuario no encontrado }
 */
router.get('/accounts/:id', requireInternal, userIdParam, ctrl.getAccount)

/**
 * @openapi
 * /accounts/{id}/ledger:
 *   get:
 *     tags: [Interno]
 *     summary: 📒 Libro mayor del usuario (interno)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200: { description: Lista de movimientos de saldo }
 *       404: { description: Usuario no encontrado }
 */
router.get('/accounts/:id/ledger', requireInternal, userIdParam, ctrl.getLedger)

/**
 * @openapi
 * /api/recharge:
 *   post:
 *     tags: [Cuentas]
 *     summary: 🪙 Recarga saldo del usuario autenticado (RF-002)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RecargaInput' }
 *     responses:
 *       200: { description: Recarga exitosa con el nuevo saldo }
 *       400: { description: Monto inválido }
 *       401: { description: No autenticado }
 */
router.post('/api/recharge', requireAuth, rechargeValidators, ctrl.recharge)

/**
 * @openapi
 * /accounts/update-balance:
 *   post:
 *     tags: [Interno]
 *     summary: 🔒 Movimiento interno de saldo debit/credit (RF-004)
 *     description: Consumido por el processor-service durante la Saga (clave interna).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateBalanceInput' }
 *     responses:
 *       200: { description: Saldo actualizado (saldo anterior y nuevo) }
 *       400: { description: Monto inválido o fondos insuficientes }
 *       404: { description: Usuario no encontrado }
 */
router.post('/accounts/update-balance', requireInternal, updateBalanceValidators, ctrl.updateBalance)

module.exports = router

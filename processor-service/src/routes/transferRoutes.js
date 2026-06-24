/**
 * Transfer Routes
 * Define las rutas para los endpoints de transferencias
 */

const express = require('express');
const { body } = require('express-validator');
const TransferController = require('../controllers/transferController');

const router = express.Router();

/**
 * Validaciones para transferencia P2P
 */
const transferValidation = [
    body('sender_id')
        .notEmpty().withMessage('sender_id es requerido')
        .isInt({ min: 1 }).withMessage('sender_id debe ser un entero positivo'),
    body('receiver_id')
        .notEmpty().withMessage('receiver_id es requerido')
        .isInt({ min: 1 }).withMessage('receiver_id debe ser un entero positivo'),
    body('amount')
        .notEmpty().withMessage('amount es requerido')
        .isFloat({ min: 0.01 }).withMessage('amount debe ser mayor a 0')
        .custom((value) => {
            const decimalPlaces = (value.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error('amount debe tener máximo 2 decimales');
            }
            return true;
        })
];

// ============================================
// Rutas de Transferencias
// ============================================

/**
 * POST /api/transfer
 * Ejecuta una transferencia P2P entre usuarios
 */
router.post('/transfer', transferValidation, TransferController.transfer);

/**
 * POST /api/recharge
 * Recarga saldo de un usuario
 */
router.post('/recharge', TransferController.recharge);

/**
 * GET /api/transactions/:user_id
 * Obtiene el historial de transacciones de un usuario
 */
router.get('/transactions/:user_id', TransferController.getTransactionHistory);

/**
 * GET /api/statistics
 * Obtiene estadísticas de transacciones (debugging)
 */
router.get('/statistics', TransferController.getStatistics);

module.exports = router;

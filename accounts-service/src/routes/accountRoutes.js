/**
 * Account Routes
 * Define las rutas para los endpoints de cuentas
 */

const express = require('express');
const { body } = require('express-validator');
const AccountController = require('../controllers/accountController');

const router = express.Router();

/**
 * Validaciones para recarga de saldo
 */
const rechargeValidation = [
    body('user_id')
        .notEmpty().withMessage('user_id es requerido')
        .isInt({ min: 1 }).withMessage('user_id debe ser un entero positivo'),
    body('amount')
        .notEmpty().withMessage('amount es requerido')
        .isFloat({ min: 0.01 }).withMessage('amount debe ser mayor a 0')
        .custom((value) => {
            const decimalPlaces = (value.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error('amount debe tener máximo 2 decimales');
            }
            return true;
        }),
    body('payment_method')
        .notEmpty().withMessage('payment_method es requerido')
        .isString().withMessage('payment_method debe ser un string')
];

/**
 * Validaciones para actualizar balance
 */
const updateBalanceValidation = [
    body('user_id')
        .notEmpty().withMessage('user_id es requerido')
        .isInt({ min: 1 }).withMessage('user_id debe ser un entero positivo'),
    body('amount')
        .notEmpty().withMessage('amount es requerido')
        .isFloat({ min: 0.01 }).withMessage('amount debe ser mayor a 0')
        .custom((value) => {
            const decimalPlaces = (value.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error('amount debe tener máximo 2 decimales');
            }
            return true;
        }),
    body('operation')
        .notEmpty().withMessage('operation es requerido')
        .isIn(['credit', 'debit']).withMessage('operation debe ser "credit" o "debit"')
];

// ============================================
// Rutas Públicas
// ============================================

/**
 * GET /accounts
 * Obtiene todos los usuarios (debugging)
 */
router.get('/', AccountController.getAllAccounts);

/**
 * GET /accounts/:id
 * Obtiene la información de un usuario por ID
 */
router.get('/:id', AccountController.getAccount);

/**
 * POST /api/recharge
 * Recarga saldo en la cuenta de un usuario
 */
router.post('/api/recharge', rechargeValidation, AccountController.rechargeBalance);

// ============================================
// Rutas Internas (usadas por otros servicios)
// ============================================

/**
 * POST /accounts/update-balance
 * Actualiza el balance de un usuario (endpoint interno)
 * Usado por el Processor Service para débitos y créditos
 */
router.post('/update-balance', updateBalanceValidation, AccountController.updateBalance);

module.exports = router;

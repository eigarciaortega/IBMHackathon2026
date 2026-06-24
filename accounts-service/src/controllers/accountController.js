/**
 * Account Controller
 * Controladores para los endpoints de cuentas
 */

const { validationResult } = require('express-validator');
const AccountService = require('../services/accountService');

class AccountController {
    /**
     * GET /accounts/:id
     * Obtiene la información de un usuario por ID
     */
    static async getAccount(req, res) {
        try {
            const userId = parseInt(req.params.id);

            // Validar que el ID sea numérico
            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_USER_ID',
                        message: 'El ID del usuario debe ser numérico'
                    }
                });
            }

            const account = await AccountService.getAccountById(userId);

            return res.status(200).json({
                success: true,
                data: account
            });
        } catch (error) {
            console.error('❌ Error en getAccount:', error);

            if (error.code === 'USER_NOT_FOUND') {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al obtener la cuenta'
                }
            });
        }
    }

    /**
     * POST /api/recharge
     * Recarga saldo en la cuenta de un usuario
     */
    static async rechargeBalance(req, res) {
        try {
            // Validar errores de express-validator
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Errores de validación',
                        details: errors.array()
                    }
                });
            }

            const { user_id, amount, payment_method } = req.body;

            const result = await AccountService.rechargeBalance(
                user_id,
                parseFloat(amount),
                payment_method
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en rechargeBalance:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al procesar la recarga'
                }
            });
        }
    }

    /**
     * POST /accounts/update-balance
     * Actualiza el balance de un usuario (endpoint interno)
     */
    static async updateBalance(req, res) {
        try {
            // Validar errores de express-validator
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Errores de validación',
                        details: errors.array()
                    }
                });
            }

            const { user_id, amount, operation } = req.body;

            const result = await AccountService.updateBalance(
                user_id,
                parseFloat(amount),
                operation
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en updateBalance:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al actualizar el balance'
                }
            });
        }
    }

    /**
     * GET /accounts
     * Obtiene todos los usuarios (para debugging)
     */
    static async getAllAccounts(req, res) {
        try {
            const accounts = await AccountService.getAllAccounts();

            return res.status(200).json({
                success: true,
                count: accounts.length,
                data: accounts
            });
        } catch (error) {
            console.error('❌ Error en getAllAccounts:', error);

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al obtener las cuentas'
                }
            });
        }
    }
}

module.exports = AccountController;

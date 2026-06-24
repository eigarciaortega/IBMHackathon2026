/**
 * Transfer Controller
 * Controladores para los endpoints de transferencias
 */

const { validationResult } = require('express-validator');
const TransferService = require('../services/transferService');

class TransferController {
    /**
     * POST /api/transfer
     * Ejecuta una transferencia P2P entre usuarios
     */
    static async transfer(req, res) {
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

            const { sender_id, receiver_id, amount } = req.body;

            console.log('═══════════════════════════════════════════════════════');
            console.log('🔄 Nueva solicitud de transferencia');
            console.log(`   Sender: ${sender_id} → Receiver: ${receiver_id}`);
            console.log(`   Monto: $${amount}`);
            console.log('═══════════════════════════════════════════════════════');

            const result = await TransferService.transfer(
                sender_id,
                receiver_id,
                parseFloat(amount)
            );

            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en transferController.transfer:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        ...(error.transactionId && { transaction_id: error.transactionId }),
                        ...(error.originalError && { details: error.originalError })
                    }
                });
            }

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al procesar la transferencia'
                }
            });
        }
    }

    /**
     * GET /api/transactions/:user_id
     * Obtiene el historial de transacciones de un usuario
     */
    static async getTransactionHistory(req, res) {
        try {
            const userId = parseInt(req.params.user_id);

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

            const result = await TransferService.getTransactionHistory(userId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en transferController.getTransactionHistory:', error);

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
                    message: 'Error al obtener el historial de transacciones'
                }
            });
        }
    }

    /**
     * GET /api/statistics
     * Obtiene estadísticas de transacciones (debugging)
     */
    static async getStatistics(req, res) {
        try {
            const result = await TransferService.getStatistics();
            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en transferController.getStatistics:', error);

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Error al obtener estadísticas'
                }
            });
        }
    }

    /**
     * POST /api/recharge
     * Recarga saldo de un usuario
     */
    static async recharge(req, res) {
        try {
            const { user_id, amount } = req.body;

            // Validaciones básicas
            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_USER_ID',
                        message: 'El user_id es requerido'
                    }
                });
            }

            if (!amount) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_AMOUNT',
                        message: 'El amount es requerido'
                    }
                });
            }

            const userId = parseInt(user_id);
            const rechargeAmount = parseFloat(amount);

            if (isNaN(userId) || userId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_USER_ID',
                        message: 'El user_id debe ser un número positivo'
                    }
                });
            }

            if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_AMOUNT',
                        message: 'El amount debe ser un número positivo'
                    }
                });
            }

            console.log('═══════════════════════════════════════════════════════');
            console.log('💳 Nueva solicitud de recarga');
            console.log(`   Usuario: ${userId}`);
            console.log(`   Monto: $${rechargeAmount}`);
            console.log('═══════════════════════════════════════════════════════');

            const result = await TransferService.recharge(userId, rechargeAmount);

            return res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error en transferController.recharge:', error);

            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        ...(error.originalError && { details: error.originalError })
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
}

module.exports = TransferController;

/**
 * Account Service
 * Lógica de negocio para gestión de cuentas y saldos
 */

const UserModel = require('../models/userModel');

class AccountService {
    /**
     * Obtiene la información de un usuario por ID
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Información del usuario
     * @throws {Error} Si el usuario no existe
     */
    static async getAccountById(userId) {
        try {
            const user = await UserModel.findById(userId);

            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.code = 'USER_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: parseFloat(user.balance),
                created_at: user.created_at,
                updated_at: user.updated_at
            };
        } catch (error) {
            console.error('❌ Error en AccountService.getAccountById:', error);
            throw error;
        }
    }

    /**
     * Recarga saldo en la cuenta de un usuario (simulado)
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a recargar
     * @param {string} paymentMethod - Método de pago (simulado)
     * @returns {Promise<Object>} Resultado de la recarga
     * @throws {Error} Si hay algún problema con la recarga
     */
    static async rechargeBalance(userId, amount, paymentMethod) {
        try {
            // Validar monto
            if (!amount || amount <= 0) {
                const error = new Error('El monto debe ser positivo y mayor a cero');
                error.code = 'INVALID_AMOUNT';
                error.statusCode = 400;
                throw error;
            }

            // Validar que el monto tenga máximo 2 decimales
            const decimalPlaces = (amount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                const error = new Error('El monto debe tener máximo 2 decimales');
                error.code = 'INVALID_DECIMAL_PRECISION';
                error.statusCode = 400;
                throw error;
            }

            // Verificar que el usuario existe
            const user = await UserModel.findById(userId);
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.code = 'USER_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }

            // Simular procesamiento de pago externo
            console.log(`💳 Procesando pago con ${paymentMethod} por $${amount}`);

            // Incrementar el saldo
            const result = await UserModel.increaseBalance(userId, amount);

            return {
                success: true,
                message: 'Recarga exitosa',
                data: {
                    user_id: userId,
                    amount: amount,
                    payment_method: paymentMethod,
                    balance_before: result.balance_before,
                    balance_after: result.balance_after,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error en AccountService.rechargeBalance:', error);
            throw error;
        }
    }

    /**
     * Actualiza el balance de un usuario (endpoint interno)
     * Este método es usado por el Processor Service
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a modificar
     * @param {string} operation - Tipo de operación: 'credit' o 'debit'
     * @returns {Promise<Object>} Resultado de la actualización
     * @throws {Error} Si hay algún problema con la actualización
     */
    static async updateBalance(userId, amount, operation) {
        try {
            // Validar monto
            if (!amount || amount <= 0) {
                const error = new Error('El monto debe ser positivo y mayor a cero');
                error.code = 'INVALID_AMOUNT';
                error.statusCode = 400;
                throw error;
            }

            // Validar operación
            if (!['credit', 'debit'].includes(operation)) {
                const error = new Error('Operación inválida. Debe ser "credit" o "debit"');
                error.code = 'INVALID_OPERATION';
                error.statusCode = 400;
                throw error;
            }

            // Verificar que el usuario existe
            const user = await UserModel.findById(userId);
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.code = 'USER_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }

            // Actualizar balance
            const result = await UserModel.updateBalance(userId, amount, operation);

            return {
                success: true,
                message: `Balance ${operation === 'debit' ? 'debitado' : 'acreditado'} exitosamente`,
                data: {
                    user_id: userId,
                    operation: operation,
                    amount: amount,
                    balance_before: result.balance_before,
                    balance_after: result.balance_after,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error en AccountService.updateBalance:', error);

            // Mapear errores específicos del modelo
            if (error.message === 'USER_NOT_FOUND') {
                error.code = 'USER_NOT_FOUND';
                error.statusCode = 404;
            } else if (error.message === 'INSUFFICIENT_FUNDS') {
                error.code = 'INSUFFICIENT_FUNDS';
                error.statusCode = 400;
                const customError = new Error('Fondos insuficientes');
                customError.code = error.code;
                customError.statusCode = error.statusCode;
                throw customError;
            }

            throw error;
        }
    }

    /**
     * Obtiene todos los usuarios (para debugging/testing)
     * @returns {Promise<Array>} Lista de usuarios
     */
    static async getAllAccounts() {
        try {
            const users = await UserModel.findAll();
            return users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                balance: parseFloat(user.balance),
                created_at: user.created_at,
                updated_at: user.updated_at
            }));
        } catch (error) {
            console.error('❌ Error en AccountService.getAllAccounts:', error);
            throw error;
        }
    }
}

module.exports = AccountService;

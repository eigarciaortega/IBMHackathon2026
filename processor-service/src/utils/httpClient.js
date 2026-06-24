/**
 * HTTP Client Utility
 * Cliente HTTP para comunicación con Accounts Service
 */

const axios = require('axios');

const ACCOUNTS_SERVICE_URL = process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:3000';

class HttpClient {
    /**
     * Obtiene la información de un usuario desde Accounts Service
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Información del usuario
     */
    static async getAccount(userId) {
        try {
            console.log(`🔍 Consultando cuenta del usuario ${userId} en Accounts Service`);

            const response = await axios.get(`${ACCOUNTS_SERVICE_URL}/accounts/${userId}`, {
                timeout: 5000, // 5 segundos de timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error('Respuesta inválida del Accounts Service');
            }
        } catch (error) {
            console.error(`❌ Error al consultar cuenta del usuario ${userId}:`, error.message);

            if (error.response) {
                // El servidor respondió con un código de error
                if (error.response.status === 404) {
                    const customError = new Error('Usuario no encontrado');
                    customError.code = 'USER_NOT_FOUND';
                    customError.statusCode = 404;
                    throw customError;
                }
                throw new Error(`Error en Accounts Service: ${error.response.status}`);
            } else if (error.request) {
                // La petición fue hecha pero no hubo respuesta
                throw new Error('Accounts Service no disponible');
            } else {
                // Error al configurar la petición
                throw error;
            }
        }
    }

    /**
     * Actualiza el balance de un usuario (débito o crédito)
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a modificar
     * @param {string} operation - Tipo de operación: 'debit' o 'credit'
     * @returns {Promise<Object>} Resultado de la operación
     */
    static async updateBalance(userId, amount, operation) {
        try {
            console.log(`💰 ${operation === 'debit' ? 'Debitando' : 'Acreditando'} $${amount} a usuario ${userId}`);

            const response = await axios.post(
                `${ACCOUNTS_SERVICE_URL}/accounts/update-balance`,
                {
                    user_id: userId,
                    amount: amount,
                    operation: operation
                },
                {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                console.log(`✅ Balance actualizado: ${operation} exitoso`);
                return response.data.data;
            } else {
                throw new Error('Respuesta inválida del Accounts Service');
            }
        } catch (error) {
            console.error(`❌ Error al actualizar balance (${operation}):`, error.message);

            if (error.response) {
                const responseData = error.response.data;

                // Mapear errores específicos
                if (responseData.error && responseData.error.code === 'INSUFFICIENT_FUNDS') {
                    const customError = new Error('Fondos insuficientes');
                    customError.code = 'INSUFFICIENT_FUNDS';
                    customError.statusCode = 400;
                    throw customError;
                }

                if (responseData.error && responseData.error.code === 'USER_NOT_FOUND') {
                    const customError = new Error('Usuario no encontrado');
                    customError.code = 'USER_NOT_FOUND';
                    customError.statusCode = 404;
                    throw customError;
                }

                throw new Error(`Error en Accounts Service: ${error.response.status}`);
            } else if (error.request) {
                throw new Error('Accounts Service no disponible');
            } else {
                throw error;
            }
        }
    }

    /**
     * Debita un monto de la cuenta de un usuario
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a debitar
     * @returns {Promise<Object>} Resultado del débito
     */
    static async debitAccount(userId, amount) {
        return await this.updateBalance(userId, amount, 'debit');
    }

    /**
     * Acredita un monto a la cuenta de un usuario
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a acreditar
     * @returns {Promise<Object>} Resultado del crédito
     */
    static async creditAccount(userId, amount) {
        return await this.updateBalance(userId, amount, 'credit');
    }

    /**
     * Verifica si el Accounts Service está disponible
     * @returns {Promise<boolean>}
     */
    static async checkHealth() {
        try {
            const response = await axios.get(`${ACCOUNTS_SERVICE_URL}/health`, {
                timeout: 3000
            });
            return response.status === 200;
        } catch (error) {
            console.error('❌ Accounts Service no disponible:', error.message);
            return false;
        }
    }
}

module.exports = HttpClient;

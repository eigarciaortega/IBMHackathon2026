/**
 * Transfer Service - Patrón Saga
 * Lógica de negocio para transferencias P2P con manejo de compensación
 */

const { TransactionModel, TRANSACTION_STATUS } = require('../models/transactionModel');
const HttpClient = require('../utils/httpClient');

class TransferService {
    /**
     * Ejecuta una transferencia P2P entre usuarios
     * Implementa el patrón Saga para consistencia distribuida
     * 
     * Flujo:
     * 1. Validaciones iniciales
     * 2. Crear registro de transacción (PENDING)
     * 3. Debitar del sender (DEBITED)
     * 4. Acreditar al receiver (COMPLETED)
     * 5. Si falla paso 4, compensar (ROLLED_BACK)
     * 
     * @param {number} senderId - ID del usuario que envía
     * @param {number} receiverId - ID del usuario que recibe
     * @param {number} amount - Monto a transferir
     * @returns {Promise<Object>} Resultado de la transferencia
     */
    static async transfer(senderId, receiverId, amount) {
        let transaction = null;
        let debitSuccess = false;

        try {
            // ============================================
            // VALIDACIONES INICIALES
            // ============================================

            console.log('🔄 Iniciando transferencia P2P');
            console.log(`   Sender: ${senderId} → Receiver: ${receiverId} | Monto: $${amount}`);

            // Validar que no sea auto-transferencia
            if (senderId === receiverId) {
                const error = new Error('No puedes transferir dinero a ti mismo');
                error.code = 'SELF_TRANSFER_NOT_ALLOWED';
                error.statusCode = 400;
                throw error;
            }

            // Validar monto positivo
            if (!amount || amount <= 0) {
                const error = new Error('El monto debe ser positivo y mayor a cero');
                error.code = 'INVALID_AMOUNT';
                error.statusCode = 400;
                throw error;
            }

            // Validar precisión decimal (máximo 2 decimales)
            const decimalPlaces = (amount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                const error = new Error('El monto debe tener máximo 2 decimales');
                error.code = 'INVALID_DECIMAL_PRECISION';
                error.statusCode = 400;
                throw error;
            }

            // ============================================
            // VALIDAR EXISTENCIA DE USUARIOS Y FONDOS
            // ============================================

            console.log('🔍 Verificando sender...');
            const sender = await HttpClient.getAccount(senderId);

            if (sender.balance < amount) {
                const error = new Error('Fondos insuficientes');
                error.code = 'INSUFFICIENT_FUNDS';
                error.statusCode = 400;
                throw error;
            }

            console.log('🔍 Verificando receiver...');
            const receiver = await HttpClient.getAccount(receiverId);

            // ============================================
            // PASO 1: CREAR REGISTRO DE TRANSACCIÓN (PENDING)
            // ============================================

            console.log('📝 Creando registro de transacción (PENDING)...');
            transaction = await TransactionModel.create(senderId, receiverId, amount);
            console.log(`✅ Transacción creada: ID ${transaction.id}`);

            // ============================================
            // PASO 2: DEBITAR DEL SENDER (DEBITED)
            // ============================================

            console.log('💸 Debitando del sender...');
            try {
                await HttpClient.debitAccount(senderId, amount);
                debitSuccess = true;

                // Actualizar estado a DEBITED
                await TransactionModel.updateStatus(transaction.id, TRANSACTION_STATUS.DEBITED);
                console.log('✅ Débito exitoso');
            } catch (error) {
                console.error('❌ Error al debitar del sender:', error.message);

                // Marcar transacción como FAILED
                await TransactionModel.updateStatus(
                    transaction.id,
                    TRANSACTION_STATUS.FAILED,
                    `Fallo en débito: ${error.message}`
                );

                throw error;
            }

            // ============================================
            // PASO 3: ACREDITAR AL RECEIVER (COMPLETED)
            // ============================================

            console.log('💰 Acreditando al receiver...');
            try {
                await HttpClient.creditAccount(receiverId, amount);

                // Actualizar estado a COMPLETED
                await TransactionModel.updateStatus(transaction.id, TRANSACTION_STATUS.COMPLETED);
                console.log('✅ Crédito exitoso');
                console.log('🎉 Transferencia completada exitosamente');

            } catch (error) {
                console.error('❌ Error al acreditar al receiver:', error.message);

                // ============================================
                // COMPENSACIÓN: REVERTIR EL DÉBITO (ROLLBACK)
                // ============================================

                console.log('⚠️ Iniciando compensación...');
                try {
                    await HttpClient.creditAccount(senderId, amount);
                    console.log('✅ Compensación exitosa: débito revertido');

                    // Marcar como ROLLED_BACK
                    await TransactionModel.updateStatus(
                        transaction.id,
                        TRANSACTION_STATUS.ROLLED_BACK,
                        `Fallo en crédito: ${error.message}. Débito revertido.`
                    );
                } catch (compensationError) {
                    console.error('🚨 CRÍTICO: Fallo en compensación:', compensationError.message);

                    // Marcar como FAILED con información crítica
                    await TransactionModel.updateStatus(
                        transaction.id,
                        TRANSACTION_STATUS.FAILED,
                        `CRÍTICO: Fallo en crédito y compensación. Requiere revisión manual. Error: ${error.message}`
                    );

                    // Este es un caso crítico que requiere intervención manual
                    const criticalError = new Error('Error crítico: fallo en compensación. Requiere revisión manual.');
                    criticalError.code = 'CRITICAL_COMPENSATION_FAILED';
                    criticalError.statusCode = 500;
                    criticalError.transactionId = transaction.id;
                    throw criticalError;
                }

                // Re-lanzar el error original
                const rollbackError = new Error('Transferencia fallida y revertida');
                rollbackError.code = 'TRANSFER_ROLLED_BACK';
                rollbackError.statusCode = 500;
                rollbackError.originalError = error.message;
                throw rollbackError;
            }

            // ============================================
            // RETORNAR RESULTADO EXITOSO
            // ============================================

            return {
                success: true,
                message: 'Transferencia completada exitosamente',
                data: {
                    transaction_id: transaction.id,
                    sender_id: senderId,
                    receiver_id: receiverId,
                    amount: amount,
                    status: TRANSACTION_STATUS.COMPLETED,
                    timestamp: transaction.created_at
                }
            };

        } catch (error) {
            console.error('❌ Error en transferencia:', error.message);

            // Si el error ya tiene código, re-lanzarlo
            if (error.statusCode) {
                throw error;
            }

            // Error genérico
            const genericError = new Error('Error al procesar la transferencia');
            genericError.code = 'TRANSFER_PROCESSING_ERROR';
            genericError.statusCode = 500;
            genericError.originalError = error.message;
            throw genericError;
        }
    }

    /**
     * Obtiene el historial de transacciones de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Historial formateado
     */
    static async getTransactionHistory(userId) {
        try {
            console.log(`📜 Consultando historial de usuario ${userId}`);

            // Verificar que el usuario existe
            await HttpClient.getAccount(userId);

            // Obtener transacciones
            const transactions = await TransactionModel.findByUserId(userId);

            // Formatear transacciones
            const formattedTransactions = transactions.map(tx => {
                const isSender = tx.sender_id === userId;
                const type = isSender ? 'sent' : 'received';
                const counterpartyId = isSender ? tx.receiver_id : tx.sender_id;

                return {
                    transaction_id: tx.id,
                    type: type,
                    amount: parseFloat(tx.amount),
                    counterparty_id: counterpartyId,
                    status: tx.status,
                    created_at: tx.created_at,
                    error_message: tx.error_message
                };
            });

            return {
                success: true,
                data: {
                    user_id: userId,
                    transaction_count: formattedTransactions.length,
                    transactions: formattedTransactions
                }
            };
        } catch (error) {
            console.error('❌ Error en getTransactionHistory:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de transacciones (para debugging)
     * @returns {Promise<Object>} Estadísticas
     */
    static async getStatistics() {
        try {
            const counts = await TransactionModel.countByStatus();
            const recentTransactions = await TransactionModel.findAll(10);

            return {
                success: true,
                data: {
                    status_counts: counts,
                    recent_transactions: recentTransactions.map(tx => ({
                        id: tx.id,
                        sender_id: tx.sender_id,
                        receiver_id: tx.receiver_id,
                        amount: parseFloat(tx.amount),
                        status: tx.status,
                        created_at: tx.created_at
                    }))
                }
            };
        } catch (error) {
            console.error('❌ Error en getStatistics:', error);
            throw error;
        }
    }

    /**
     * Recarga saldo de un usuario
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a recargar
     * @returns {Promise<Object>} Resultado de la recarga
     */
    static async recharge(userId, amount) {
        try {
            console.log(`💳 Recargando saldo para usuario ${userId}: $${amount}`);

            // Validar monto positivo
            if (!amount || amount <= 0) {
                const error = new Error('El monto debe ser positivo y mayor a cero');
                error.code = 'INVALID_AMOUNT';
                error.statusCode = 400;
                throw error;
            }

            // Validar precisión decimal (máximo 2 decimales)
            const decimalPlaces = (amount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                const error = new Error('El monto debe tener máximo 2 decimales');
                error.code = 'INVALID_DECIMAL_PRECISION';
                error.statusCode = 400;
                throw error;
            }

            // Verificar que el usuario existe
            const user = await HttpClient.getAccount(userId);

            // Acreditar el monto
            await HttpClient.creditAccount(userId, amount);

            // Obtener el nuevo saldo
            const updatedUser = await HttpClient.getAccount(userId);

            console.log(`✅ Recarga exitosa. Nuevo saldo: $${updatedUser.balance}`);

            return {
                success: true,
                message: 'Recarga completada exitosamente',
                data: {
                    user_id: userId,
                    amount: amount,
                    new_balance: parseFloat(updatedUser.balance),
                    previous_balance: parseFloat(user.balance)
                }
            };
        } catch (error) {
            console.error('❌ Error en recarga:', error.message);

            // Si el error ya tiene código, re-lanzarlo
            if (error.statusCode) {
                throw error;
            }

            // Error genérico
            const genericError = new Error('Error al procesar la recarga');
            genericError.code = 'RECHARGE_PROCESSING_ERROR';
            genericError.statusCode = 500;
            genericError.originalError = error.message;
            throw genericError;
        }
    }
}

module.exports = TransferService;

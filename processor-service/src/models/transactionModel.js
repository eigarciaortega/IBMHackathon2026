/**
 * Transaction Model
 * Modelo de datos para transacciones y operaciones de base de datos
 */

const db = require('../config/database');

// Estados válidos de una transacción
const TRANSACTION_STATUS = {
    PENDING: 'PENDING',
    DEBITED: 'DEBITED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    ROLLED_BACK: 'ROLLED_BACK'
};

class TransactionModel {
    /**
     * Crea una nueva transacción
     * @param {number} senderId - ID del usuario que envía
     * @param {number} receiverId - ID del usuario que recibe
     * @param {number} amount - Monto de la transacción
     * @returns {Promise<Object>} Transacción creada
     */
    static async create(senderId, receiverId, amount) {
        try {
            const query = `
        INSERT INTO transactions (sender_id, receiver_id, amount, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, sender_id, receiver_id, amount, status, created_at, updated_at
      `;

            const result = await db.query(query, [
                senderId,
                receiverId,
                amount,
                TRANSACTION_STATUS.PENDING
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en TransactionModel.create:', error);
            throw error;
        }
    }

    /**
     * Actualiza el estado de una transacción
     * @param {number} transactionId - ID de la transacción
     * @param {string} status - Nuevo estado
     * @param {string} errorMessage - Mensaje de error (opcional)
     * @returns {Promise<Object>} Transacción actualizada
     */
    static async updateStatus(transactionId, status, errorMessage = null) {
        try {
            const query = `
        UPDATE transactions
        SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
      `;

            const result = await db.query(query, [status, errorMessage, transactionId]);

            if (result.rows.length === 0) {
                throw new Error('Transacción no encontrada');
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en TransactionModel.updateStatus:', error);
            throw error;
        }
    }

    /**
     * Obtiene una transacción por ID
     * @param {number} transactionId - ID de la transacción
     * @returns {Promise<Object|null>} Transacción o null si no existe
     */
    static async findById(transactionId) {
        try {
            const query = `
        SELECT id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
        FROM transactions
        WHERE id = $1
      `;

            const result = await db.query(query, [transactionId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en TransactionModel.findById:', error);
            throw error;
        }
    }

    /**
     * Obtiene transacciones de un usuario (enviadas y recibidas)
     * @param {number} userId - ID del usuario
     * @param {number} limit - Número máximo de transacciones (default: 50)
     * @returns {Promise<Array>} Lista de transacciones
     */
    static async findByUserId(userId, limit = 50) {
        try {
            const query = `
        SELECT id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
        FROM transactions
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

            const result = await db.query(query, [userId, limit]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en TransactionModel.findByUserId:', error);
            throw error;
        }
    }

    /**
     * Obtiene transacciones por estado
     * @param {string} status - Estado de la transacción
     * @returns {Promise<Array>} Lista de transacciones
     */
    static async findByStatus(status) {
        try {
            const query = `
        SELECT id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
        FROM transactions
        WHERE status = $1
        ORDER BY created_at DESC
      `;

            const result = await db.query(query, [status]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en TransactionModel.findByStatus:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las transacciones
     * @param {number} limit - Número máximo de transacciones
     * @returns {Promise<Array>} Lista de transacciones
     */
    static async findAll(limit = 100) {
        try {
            const query = `
        SELECT id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT $1
      `;

            const result = await db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en TransactionModel.findAll:', error);
            throw error;
        }
    }

    /**
     * Cuenta transacciones por estado
     * @returns {Promise<Object>} Conteo por estado
     */
    static async countByStatus() {
        try {
            const query = `
        SELECT status, COUNT(*) as count
        FROM transactions
        GROUP BY status
      `;

            const result = await db.query(query);

            // Convertir a objeto para fácil acceso
            const counts = {};
            result.rows.forEach(row => {
                counts[row.status] = parseInt(row.count);
            });

            return counts;
        } catch (error) {
            console.error('❌ Error en TransactionModel.countByStatus:', error);
            throw error;
        }
    }
}

module.exports = {
    TransactionModel,
    TRANSACTION_STATUS
};

/**
 * User Model
 * Modelo de datos para usuarios y operaciones de base de datos
 */

const db = require('../config/database');

class UserModel {
    /**
     * Obtiene un usuario por ID
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object|null>} Usuario o null si no existe
     */
    static async findById(userId) {
        try {
            const query = 'SELECT id, name, email, balance, created_at, updated_at FROM users WHERE id = $1';
            const result = await db.query(query, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en UserModel.findById:', error);
            throw error;
        }
    }

    /**
     * Obtiene un usuario por email
     * @param {string} email - Email del usuario
     * @returns {Promise<Object|null>} Usuario o null si no existe
     */
    static async findByEmail(email) {
        try {
            const query = 'SELECT id, name, email, balance, created_at, updated_at FROM users WHERE email = $1';
            const result = await db.query(query, [email]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en UserModel.findByEmail:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los usuarios
     * @returns {Promise<Array>} Lista de usuarios
     */
    static async findAll() {
        try {
            const query = 'SELECT id, name, email, balance, created_at, updated_at FROM users ORDER BY id';
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en UserModel.findAll:', error);
            throw error;
        }
    }

    /**
     * Actualiza el saldo de un usuario (con lock para evitar race conditions)
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a modificar (positivo o negativo)
     * @param {string} operation - Tipo de operación: 'credit' o 'debit'
     * @returns {Promise<Object>} Usuario actualizado con balance_before y balance_after
     */
    static async updateBalance(userId, amount, operation) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // SELECT FOR UPDATE: Bloquea la fila para evitar race conditions
            const selectQuery = 'SELECT id, name, email, balance FROM users WHERE id = $1 FOR UPDATE';
            const userResult = await client.query(selectQuery, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('USER_NOT_FOUND');
            }

            const user = userResult.rows[0];
            const balanceBefore = parseFloat(user.balance);
            let balanceAfter;

            if (operation === 'debit') {
                // Validar fondos suficientes
                if (balanceBefore < amount) {
                    throw new Error('INSUFFICIENT_FUNDS');
                }
                balanceAfter = balanceBefore - amount;
            } else if (operation === 'credit') {
                balanceAfter = balanceBefore + amount;
            } else {
                throw new Error('INVALID_OPERATION');
            }

            // Actualizar balance
            const updateQuery = 'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
            const updateResult = await client.query(updateQuery, [balanceAfter.toFixed(2), userId]);

            await client.query('COMMIT');

            return {
                user: updateResult.rows[0],
                balance_before: balanceBefore,
                balance_after: balanceAfter
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error en UserModel.updateBalance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Incrementa el saldo de un usuario (atajo para recargas)
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a agregar
     * @returns {Promise<Object>} Usuario actualizado
     */
    static async increaseBalance(userId, amount) {
        try {
            const result = await this.updateBalance(userId, amount, 'credit');
            return result;
        } catch (error) {
            console.error('❌ Error en UserModel.increaseBalance:', error);
            throw error;
        }
    }

    /**
     * Decrementa el saldo de un usuario
     * @param {number} userId - ID del usuario
     * @param {number} amount - Monto a restar
     * @returns {Promise<Object>} Usuario actualizado
     */
    static async decreaseBalance(userId, amount) {
        try {
            const result = await this.updateBalance(userId, amount, 'debit');
            return result;
        } catch (error) {
            console.error('❌ Error en UserModel.decreaseBalance:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario (para futuras funcionalidades)
     * @param {Object} userData - Datos del usuario (name, email, balance)
     * @returns {Promise<Object>} Usuario creado
     */
    static async create(userData) {
        try {
            const { name, email, balance = 0 } = userData;
            const query = `
        INSERT INTO users (name, email, balance)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, balance, created_at, updated_at
      `;
            const result = await db.query(query, [name, email, balance]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error en UserModel.create:', error);
            throw error;
        }
    }
}

module.exports = UserModel;

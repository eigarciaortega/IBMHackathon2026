const pool = require('../db/connection');

/**
 * Retrieves a user by ID including current balance.
 */
const getUserById = async (userId) => {
  const result = await pool.query(
    'SELECT id, name, email, balance, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Adds funds to a user's balance (simulated recharge).
 * Returns the updated user row.
 */
const rechargeBalance = async (userId, amount) => {
  const result = await pool.query(
    `UPDATE users
     SET balance = balance + $1
     WHERE id = $2
     RETURNING id, name, email, balance`,
    [amount, userId]
  );
  return result.rows[0] || null;
};

/**
 * Internal operation used by Processor Service.
 * Supports 'debit' and 'credit' operations.
 * Returns { previous_balance, new_balance } or throws on insufficient funds.
 */
const updateBalance = async (userId, amount, operation) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the row to prevent race conditions
    const lockResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const previousBalance = parseFloat(lockResult.rows[0].balance);

    if (operation === 'debit') {
      if (previousBalance < amount) {
        await client.query('ROLLBACK');
        const error = new Error('Insufficient funds');
        error.code = 'INSUFFICIENT_FUNDS';
        throw error;
      }
    }

    const operator = operation === 'debit' ? '-' : '+';
    const updateResult = await client.query(
      `UPDATE users SET balance = balance ${operator} $1 WHERE id = $2 RETURNING balance`,
      [amount, userId]
    );

    const newBalance = parseFloat(updateResult.rows[0].balance);
    await client.query('COMMIT');

    return { previous_balance: previousBalance, new_balance: newBalance };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { getUserById, rechargeBalance, updateBalance };

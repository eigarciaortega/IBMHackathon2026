'use strict';

const pool = require('../db/pool');

/**
 * Find a user by ID using a prepared statement.
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
async function findById(userId) {
  const result = await pool.query(
    'SELECT id, name, email, balance, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Increment user balance (credit). Uses prepared statement.
 * @param {number} userId
 * @param {number} amount
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<object>} updated row
 */
async function creditBalance(userId, amount, client = pool) {
  const result = await client.query(
    `UPDATE users
     SET balance = balance + $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, balance AS new_balance`,
    [userId, amount]
  );
  return result.rows[0] || null;
}

/**
 * Decrement user balance (debit). Fails atomically if funds are insufficient.
 * @param {number} userId
 * @param {number} amount
 * @param {object} [client]
 * @returns {Promise<object|null>} updated row or null if insufficient funds
 */
async function debitBalance(userId, amount, client = pool) {
  const result = await client.query(
    `UPDATE users
     SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND balance >= $2
     RETURNING id, balance AS new_balance`,
    [userId, amount]
  );
  return result.rows[0] || null;
}

/**
 * Get previous balance before an operation.
 * @param {number} userId
 */
async function getBalance(userId) {
  const result = await pool.query(
    'SELECT balance FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] ? parseFloat(result.rows[0].balance) : null;
}

module.exports = { findById, creditBalance, debitBalance, getBalance };

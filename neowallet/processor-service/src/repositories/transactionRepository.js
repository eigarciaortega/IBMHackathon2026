'use strict';

const pool = require('../db/pool');

/**
 * Create a new transaction record in PENDING state.
 */
async function createTransaction(senderId, receiverId, amount) {
  const result = await pool.query(
    `INSERT INTO transactions (sender_id, receiver_id, amount, status)
     VALUES ($1, $2, $3, 'PENDING')
     RETURNING id, sender_id, receiver_id, amount, status, created_at`,
    [senderId, receiverId, amount]
  );
  return result.rows[0];
}

/**
 * Update transaction status and optional error message.
 */
async function updateStatus(transactionId, status, errorMessage = null) {
  const result = await pool.query(
    `UPDATE transactions
     SET status = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, status`,
    [transactionId, status, errorMessage]
  );
  return result.rows[0];
}

/**
 * Get all transactions for a user (sent + received), ordered by date desc.
 */
async function findByUserId(userId) {
  const result = await pool.query(
    `SELECT id, sender_id, receiver_id, amount, status, error_message, created_at, updated_at
     FROM transactions
     WHERE sender_id = $1 OR receiver_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = { createTransaction, updateStatus, findByUserId };

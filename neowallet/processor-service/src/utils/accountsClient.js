'use strict';

const fetch = require('node-fetch');
const logger = require('../utils/logger');

const BASE_URL = process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:3000';

/**
 * Call Accounts Service to check if a user exists.
 * @param {number} userId
 * @returns {Promise<{exists: boolean, data?: object}>}
 */
async function getUser(userId) {
  const res = await fetch(`${BASE_URL}/accounts/${userId}`);
  if (res.status === 404) return { exists: false };
  if (!res.ok) {
    throw new Error(`accounts-service GET /accounts/${userId} returned ${res.status}`);
  }
  const data = await res.json();
  return { exists: true, data };
}

/**
 * Call Accounts Service to debit or credit a user's balance.
 * @param {number} userId
 * @param {number} amount
 * @param {'debit'|'credit'} operation
 * @param {number} transactionId - for traceability logs
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function updateBalance(userId, amount, operation, transactionId) {
  const res = await fetch(`${BASE_URL}/accounts/update-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount, operation }),
  });

  const body = await res.json();

  if (!res.ok) {
    logger.warn('accounts-service update-balance failed', {
      transaction_id: transactionId,
      userId,
      operation,
      status: res.status,
      error: body.error,
    });
    return { success: false, error: body.error || 'accounts_service_error', status: res.status };
  }

  return { success: true, data: body };
}

module.exports = { getUser, updateBalance };

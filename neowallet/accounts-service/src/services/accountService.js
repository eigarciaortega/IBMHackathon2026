'use strict';

const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger');

/**
 * Retrieve a user account with balance.
 */
async function getAccount(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    return { error: 'user_not_found', status: 404 };
  }
  return { data: user, status: 200 };
}

/**
 * Simulate a wallet top-up (recharge).
 */
async function rechargeBalance(userId, amount) {
  const user = await userRepository.findById(userId);
  if (!user) {
    logger.warn('Recharge attempted for non-existent user', { userId });
    return { error: 'user_not_found', status: 404 };
  }

  const updated = await userRepository.creditBalance(userId, amount);
  logger.info('Balance recharged', { userId, amount, new_balance: updated.new_balance });

  return {
    data: {
      user_id: userId,
      new_balance: parseFloat(updated.new_balance),
    },
    status: 200,
  };
}

/**
 * Internal: update balance via debit or credit (called by Processor Service).
 */
async function updateBalance(userId, amount, operation) {
  const user = await userRepository.findById(userId);
  if (!user) {
    logger.warn('update-balance: user not found', { userId, operation });
    return { error: 'user_not_found', status: 404 };
  }

  const previousBalance = parseFloat(user.balance);

  let updated;
  if (operation === 'debit') {
    updated = await userRepository.debitBalance(userId, amount);
    if (!updated) {
      logger.warn('Insufficient funds for debit', { userId, amount, balance: previousBalance });
      return { error: 'insufficient_funds', status: 400 };
    }
  } else {
    // credit
    updated = await userRepository.creditBalance(userId, amount);
  }

  logger.info('Balance updated', {
    userId,
    operation,
    amount,
    previous_balance: previousBalance,
    new_balance: parseFloat(updated.new_balance),
  });

  return {
    data: {
      user_id: userId,
      previous_balance: previousBalance,
      new_balance: parseFloat(updated.new_balance),
    },
    status: 200,
  };
}

module.exports = { getAccount, rechargeBalance, updateBalance };

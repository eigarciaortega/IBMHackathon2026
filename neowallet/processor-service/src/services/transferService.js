'use strict';

const transactionRepo = require('../repositories/transactionRepository');
const accountsClient = require('../utils/accountsClient');
const logger = require('../utils/logger');

/**
 * Execute a P2P transfer using the Saga pattern:
 * 1. Validate inputs and user existence
 * 2. Create PENDING transaction
 * 3. Debit sender → mark DEBITED
 * 4. Credit receiver → mark COMPLETED
 * 5. If step 4 fails → rollback debit → mark ROLLED_BACK
 */
async function transfer(senderId, receiverId, amount) {
  // ── Business rule: no self-transfer ─────────────────────────────────────────
  if (senderId === receiverId) {
    return { error: 'self_transfer_not_allowed', status: 400 };
  }

  // ── Validate both users exist in Accounts Service ────────────────────────────
  const [senderResult, receiverResult] = await Promise.all([
    accountsClient.getUser(senderId),
    accountsClient.getUser(receiverId),
  ]);

  if (!senderResult.exists || !receiverResult.exists) {
    logger.warn('Transfer: user not found', {
      sender_found: senderResult.exists,
      receiver_found: receiverResult.exists,
    });
    return { error: 'user_not_found', status: 404 };
  }

  // ── Create PENDING transaction record ────────────────────────────────────────
  const tx = await transactionRepo.createTransaction(senderId, receiverId, amount);
  const transactionId = tx.id;
  logger.info('Transaction created', { transaction_id: transactionId, senderId, receiverId, amount });

  // ── Step 1: Debit sender ─────────────────────────────────────────────────────
  const debitResult = await accountsClient.updateBalance(senderId, amount, 'debit', transactionId);

  if (!debitResult.success) {
    const errorCode = debitResult.error === 'insufficient_funds' ? 'insufficient_funds' : 'debit_failed';
    await transactionRepo.updateStatus(transactionId, 'FAILED', debitResult.error);
    logger.warn('Transaction failed at debit', { transaction_id: transactionId, error: errorCode });
    return {
      error: errorCode,
      status: debitResult.error === 'insufficient_funds' ? 400 : 502,
    };
  }

  await transactionRepo.updateStatus(transactionId, 'DEBITED');
  logger.info('Sender debited', { transaction_id: transactionId, senderId });

  // ── Step 2: Credit receiver ──────────────────────────────────────────────────
  const creditResult = await accountsClient.updateBalance(receiverId, amount, 'credit', transactionId);

  if (!creditResult.success) {
    logger.error('Credit failed — initiating rollback', { transaction_id: transactionId, receiverId });

    // Saga compensation: refund the sender
    const rollbackResult = await accountsClient.updateBalance(senderId, amount, 'credit', transactionId);

    if (!rollbackResult.success) {
      // Critical: rollback itself failed — mark FAILED and alert
      logger.error('CRITICAL: Rollback failed — manual intervention required', {
        transaction_id: transactionId,
        senderId,
        amount,
      });
      await transactionRepo.updateStatus(transactionId, 'FAILED', 'credit_failed_rollback_failed');
    } else {
      await transactionRepo.updateStatus(transactionId, 'ROLLED_BACK', 'credit_failed_rollback_ok');
      logger.info('Rollback completed successfully', { transaction_id: transactionId });
    }

    return { error: 'transfer_failed', status: 502 };
  }

  // ── All steps succeeded ───────────────────────────────────────────────────────
  await transactionRepo.updateStatus(transactionId, 'COMPLETED');
  logger.info('Transaction completed', { transaction_id: transactionId, senderId, receiverId, amount });

  return {
    data: {
      transaction_id: transactionId,
      status: 'COMPLETED',
      message: 'Transfer completed successfully',
    },
    status: 200,
  };
}

/**
 * Get transaction history for a user.
 */
async function getHistory(userId) {
  const transactions = await transactionRepo.findByUserId(userId);
  return { data: transactions, status: 200 };
}

module.exports = { transfer, getHistory };

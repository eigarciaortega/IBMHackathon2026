'use strict';

const { body, param, validationResult } = require('express-validator');
const transferService = require('../services/transferService');
const logger = require('../utils/logger');

// ── Validation chains ──────────────────────────────────────────────────────────

const validateTransfer = [
  body('sender_id').isInt({ min: 1 }).withMessage('sender_id must be a positive integer'),
  body('receiver_id').isInt({ min: 1 }).withMessage('receiver_id must be a positive integer'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be a positive number greater than zero')
    .custom((val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(val))) {
        throw new Error('amount must have at most 2 decimal places');
      }
      return true;
    }),
];

const validateUserId = [
  param('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'invalid_amount', details: errors.array() });
  }
  return null;
}

// ── Handlers ───────────────────────────────────────────────────────────────────

async function transfer(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { sender_id, receiver_id, amount } = req.body;
  logger.info('POST /api/transfer', { sender_id, receiver_id, amount });

  const result = await transferService.transfer(sender_id, receiver_id, amount);
  return res.status(result.status).json(result.data || { error: result.error });
}

async function getHistory(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const userId = parseInt(req.params.user_id, 10);
  logger.info('GET /api/transactions/:user_id', { userId });

  const result = await transferService.getHistory(userId);
  return res.status(result.status).json(result.data);
}

module.exports = {
  transfer,
  getHistory,
  validateTransfer,
  validateUserId,
};

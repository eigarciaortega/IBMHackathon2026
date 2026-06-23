'use strict';

const { param, body, validationResult } = require('express-validator');
const accountService = require('../services/accountService');
const logger = require('../utils/logger');

// ── Validation chains ──────────────────────────────────────────────────────────

const validateUserId = [
  param('user_id')
    .isInt({ min: 1 })
    .withMessage('user_id must be a positive integer'),
];

const validateRecharge = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be a positive number')
    .custom((val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(val))) {
        throw new Error('amount must have at most 2 decimal places');
      }
      return true;
    }),
  body('payment_method').notEmpty().withMessage('payment_method is required'),
];

const validateUpdateBalance = [
  body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be a positive number')
    .custom((val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(String(val))) {
        throw new Error('amount must have at most 2 decimal places');
      }
      return true;
    }),
  body('operation')
    .isIn(['debit', 'credit'])
    .withMessage('operation must be "debit" or "credit"'),
];

// ── Helper ─────────────────────────────────────────────────────────────────────

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
}

// ── Handlers ───────────────────────────────────────────────────────────────────

async function getAccount(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const userId = parseInt(req.params.user_id, 10);
  logger.info('GET /accounts/:user_id', { userId });

  const result = await accountService.getAccount(userId);
  return res.status(result.status).json(result.data || { error: result.error });
}

async function rechargeBalance(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { user_id, amount, payment_method } = req.body;
  logger.info('POST /api/recharge', { user_id, amount, payment_method });

  const result = await accountService.rechargeBalance(user_id, amount);
  return res.status(result.status).json(result.data || { error: result.error });
}

async function updateBalance(req, res) {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { user_id, amount, operation } = req.body;
  logger.info('POST /accounts/update-balance', { user_id, amount, operation });

  const result = await accountService.updateBalance(user_id, amount, operation);
  return res.status(result.status).json(result.data || { error: result.error });
}

module.exports = {
  getAccount,
  rechargeBalance,
  updateBalance,
  validateUserId,
  validateRecharge,
  validateUpdateBalance,
};

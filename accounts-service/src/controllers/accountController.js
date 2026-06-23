const accountService = require('../services/accountService');

const getAccount = async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'invalid_user_id', message: 'User ID must be a number' });
  }

  try {
    const user = await accountService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User does not exist' });
    }
    return res.status(200).json({ data: user });
  } catch (err) {
    console.error('[getAccount] Error:', err.message);
    return res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
  }
};

const recharge = async (req, res) => {
  const { user_id, amount } = req.body;

  if (!user_id || isNaN(parseInt(user_id, 10))) {
    return res.status(400).json({ error: 'invalid_user_id', message: 'user_id must be a number' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'invalid_amount', message: 'amount must be a positive number' });
  }

  try {
    const user = await accountService.getUserById(parseInt(user_id, 10));
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User does not exist' });
    }

    const updated = await accountService.rechargeBalance(parseInt(user_id, 10), parsedAmount);
    return res.status(200).json({
      message: 'Balance recharged successfully',
      data: { user_id: updated.id, new_balance: parseFloat(updated.balance) },
    });
  } catch (err) {
    console.error('[recharge] Error:', err.message);
    return res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
  }
};

const updateBalance = async (req, res) => {
  const { user_id, amount, operation } = req.body;

  if (!user_id || isNaN(parseInt(user_id, 10))) {
    return res.status(400).json({ error: 'invalid_user_id', message: 'user_id must be a number' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'invalid_amount', message: 'amount must be positive' });
  }

  if (!['debit', 'credit'].includes(operation)) {
    return res.status(400).json({ error: 'invalid_operation', message: 'operation must be debit or credit' });
  }

  try {
    const result = await accountService.updateBalance(parseInt(user_id, 10), parsedAmount, operation);
    return res.status(200).json({ data: result });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'insufficient_funds', message: err.message });
    }
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'user_not_found', message: err.message });
    }
    console.error('[updateBalance] Error:', err.message);
    return res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
  }
};

module.exports = { getAccount, recharge, updateBalance };

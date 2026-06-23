const { pool } = require("../db");
const { getAccount } = require("../services/accountsClient");
const { parsePositiveInteger } = require("../utils/validation");

async function getTransactionsByUser(request, response, next) {
  const userId = parsePositiveInteger(request.params.user_id);

  if (!userId) {
    return response.status(400).json({
      error: "invalid_user_id",
      message: "User id must be a positive integer."
    });
  }

  try {
    const account = await getAccount(userId);

    if (account.status === 404) {
      return response.status(404).json({
        error: "user_not_found",
        message: "Account was not found."
      });
    }

    if (!account.ok) {
      throw new Error(`accounts-service returned ${account.status} while fetching account`);
    }

    const result = await pool.query(
      `SELECT transaction_id, sender_id, receiver_id, amount, status, created_at
       FROM transactions
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const transactions = result.rows.map((transaction) => ({
      transaction_id: transaction.transaction_id,
      type: transaction.sender_id === userId ? "sent" : "received",
      sender_id: transaction.sender_id,
      receiver_id: transaction.receiver_id,
      amount: transaction.amount,
      status: transaction.status,
      created_at: transaction.created_at
    }));

    return response.status(200).json({
      user_id: userId,
      transactions
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTransactionsByUser
};


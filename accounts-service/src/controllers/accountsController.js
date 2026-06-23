const { pool } = require("../db");
const {
  isValidOperation,
  parseMoneyAmount,
  parsePositiveInteger
} = require("../utils/validation");
const { logEvent, sendError } = require("../utils/http");

function invalidInput(response, message, error = "invalid_input") {
  return sendError(response, 400, error, message);
}

async function getAccount(request, response, next) {
  const userId = parsePositiveInteger(request.params.id);

  if (!userId) {
    return invalidInput(response, "User id must be a positive integer.", "invalid_user_id");
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, balance FROM users WHERE id = $1",
      [userId]
    );

    if (result.rowCount === 0) {
      return sendError(response, 404, "user_not_found", "Account was not found.");
    }

    logEvent("INFO", "account_lookup", { user_id: userId });
    return response.status(200).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function rechargeAccount(request, response, next) {
  const userId = parsePositiveInteger(request.body.user_id);
  const amount = parseMoneyAmount(request.body.amount);
  const paymentMethod = request.body.payment_method || null;

  if (!userId) {
    return invalidInput(response, "user_id is required and must be a positive integer.", "invalid_user_id");
  }

  if (!amount) {
    return invalidInput(response, "amount is required, must be greater than 0, and can have up to 2 decimals.", "invalid_amount");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const accountResult = await client.query(
      "SELECT id, balance FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );

    if (accountResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendError(response, 404, "user_not_found", "Account was not found.");
    }

    const previousBalance = accountResult.rows[0].balance;
    const updateResult = await client.query(
      `UPDATE users
       SET balance = balance + $1::numeric,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING balance`,
      [amount, userId]
    );

    await client.query("COMMIT");

    logEvent("INFO", "recharge_completed", {
      user_id: userId,
      amount,
      payment_method: paymentMethod
    });

    return response.status(201).json({
      message: "Recharge completed successfully",
      user_id: userId,
      previous_balance: previousBalance,
      amount,
      new_balance: updateResult.rows[0].balance,
      payment_method: paymentMethod
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

async function updateBalance(request, response, next) {
  const userId = parsePositiveInteger(request.body.user_id);
  const amount = parseMoneyAmount(request.body.amount);
  const operation = request.body.operation;

  if (!userId) {
    return invalidInput(response, "user_id is required and must be a positive integer.", "invalid_user_id");
  }

  if (!amount) {
    return invalidInput(response, "amount is required, must be greater than 0, and can have up to 2 decimals.", "invalid_amount");
  }

  if (!isValidOperation(operation)) {
    return invalidInput(response, "operation must be debit or credit.", "invalid_operation");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const accountResult = await client.query(
      "SELECT id, balance FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );

    if (accountResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendError(response, 404, "user_not_found", "Account was not found.");
    }

    const previousBalance = accountResult.rows[0].balance;

    if (operation === "debit" && Number(previousBalance) < Number(amount)) {
      await client.query("ROLLBACK");
      logEvent("WARN", "insufficient_funds", {
        user_id: userId,
        amount,
        previous_balance: previousBalance
      });
      return sendError(response, 400, "insufficient_funds", "The account does not have enough balance for this debit.");
    }

    const operator = operation === "credit" ? "+" : "-";
    const updateResult = await client.query(
      `UPDATE users
       SET balance = balance ${operator} $1::numeric,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING balance`,
      [amount, userId]
    );

    await client.query("COMMIT");

    logEvent("INFO", "balance_updated", {
      user_id: userId,
      operation,
      amount,
      previous_balance: previousBalance,
      new_balance: updateResult.rows[0].balance
    });

    return response.status(200).json({
      message: "Balance updated successfully",
      user_id: userId,
      operation,
      previous_balance: previousBalance,
      amount,
      new_balance: updateResult.rows[0].balance
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  getAccount,
  rechargeAccount,
  updateBalance
};

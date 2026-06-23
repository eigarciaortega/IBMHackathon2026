const { pool } = require("../db");
const { getAccount, updateBalance } = require("../services/accountsClient");
const { parseMoneyAmount, parsePositiveInteger } = require("../utils/validation");

function badRequest(response, error, message) {
  return response.status(400).json({
    error,
    message
  });
}

async function updateTransactionStatus(transactionId, status, errorMessage = null) {
  await pool.query(
    `UPDATE transactions
     SET status = $1,
         error_message = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $3`,
    [status, errorMessage, transactionId]
  );
}

async function createTransfer(request, response, next) {
  const senderId = parsePositiveInteger(request.body.sender_id);
  const receiverId = parsePositiveInteger(request.body.receiver_id);
  const amount = parseMoneyAmount(request.body.amount);
  const idempotencyKey = request.header("X-Idempotency-Key") || null;

  if (!senderId) {
    return badRequest(response, "invalid_sender_id", "sender_id is required and must be a positive integer.");
  }

  if (!receiverId) {
    return badRequest(response, "invalid_receiver_id", "receiver_id is required and must be a positive integer.");
  }

  if (senderId === receiverId) {
    return badRequest(response, "self_transfer_not_allowed", "sender_id and receiver_id must be different.");
  }

  if (!amount) {
    return badRequest(response, "invalid_amount", "amount is required, must be greater than 0, and can have up to 2 decimals.");
  }

  try {
    const sender = await getAccount(senderId);

    if (sender.status === 404) {
      return response.status(404).json({
        error: "sender_not_found",
        message: "Sender account was not found."
      });
    }

    if (!sender.ok) {
      throw new Error(`accounts-service returned ${sender.status} while fetching sender`);
    }

    const receiver = await getAccount(receiverId);

    if (receiver.status === 404) {
      return response.status(404).json({
        error: "receiver_not_found",
        message: "Receiver account was not found."
      });
    }

    if (!receiver.ok) {
      throw new Error(`accounts-service returned ${receiver.status} while fetching receiver`);
    }

    if (Number(sender.body.balance) < Number(amount)) {
      return badRequest(response, "insufficient_funds", "Sender does not have enough balance for this transfer.");
    }

    const transactionResult = await pool.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, status, idempotency_key)
       VALUES ($1, $2, $3, 'PENDING', $4)
       RETURNING transaction_id, amount, status`,
      [senderId, receiverId, amount, idempotencyKey]
    );
    const transaction = transactionResult.rows[0];

    const debit = await updateBalance({
      userId: senderId,
      amount,
      operation: "debit"
    });

    if (!debit.ok) {
      await updateTransactionStatus(transaction.transaction_id, "FAILED", debit.body.error || "debit_failed");

      if (debit.body.error === "insufficient_funds") {
        return badRequest(response, "insufficient_funds", "Sender does not have enough balance for this transfer.");
      }

      throw new Error(`accounts-service returned ${debit.status} while debiting sender`);
    }

    await updateTransactionStatus(transaction.transaction_id, "DEBITED");

    const credit = await updateBalance({
      userId: receiverId,
      amount,
      operation: "credit"
    });

    if (!credit.ok) {
      await updateTransactionStatus(transaction.transaction_id, "FAILED", credit.body.error || "credit_failed");
      throw new Error(`accounts-service returned ${credit.status} while crediting receiver`);
    }

    await updateTransactionStatus(transaction.transaction_id, "COMPLETED");

    return response.status(201).json({
      message: "Transfer completed successfully",
      transaction_id: transaction.transaction_id,
      sender_id: senderId,
      receiver_id: receiverId,
      amount: transaction.amount,
      status: "COMPLETED"
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTransfer
};

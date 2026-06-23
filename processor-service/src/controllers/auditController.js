const { pool } = require("../db");
const { getAccount } = require("../services/accountsClient");
const { logEvent } = require("../utils/http");

const seedUserIds = [1, 2, 3];
const expectedSeedTotal = "1050.00";

async function auditMoneyConservation(_request, response, next) {
  try {
    const moneyConservation = await getMoneyConservation();
    logEvent("INFO", "money_audit_completed", moneyConservation);

    return response.status(200).json({
      message: "Money conservation audit completed",
      total_balance: moneyConservation.total_balance,
      users_checked: moneyConservation.users_checked,
      expected_seed_total: expectedSeedTotal,
      status: moneyConservation.status
    });
  } catch (error) {
    return next(error);
  }
}

async function getReconciliation(_request, response, next) {
  try {
    const moneyConservation = await getMoneyConservation();
    const statusCounts = await getTransactionStatusCounts();
    const warnings = [];

    if (moneyConservation.status !== "CONSISTENT") {
      warnings.push("money_conservation_inconsistent");
    }

    if (statusCounts.pending_count > 0 || statusCounts.debited_count > 0) {
      warnings.push("open_transactions_require_review");
    }

    const overallStatus = warnings.length > 0 ? "WARNING" : "OK";
    logEvent("INFO", "money_audit_completed", {
      reconciliation_status: overallStatus,
      ...moneyConservation,
      ...statusCounts
    });

    return response.status(200).json({
      message: "Reconciliation completed",
      money_conservation: {
        total_balance: moneyConservation.total_balance,
        expected_seed_total: expectedSeedTotal,
        status: moneyConservation.status
      },
      transactions: statusCounts,
      warnings,
      status: overallStatus
    });
  } catch (error) {
    return next(error);
  }
}

async function getMoneyConservation() {
  const accounts = [];

  for (const userId of seedUserIds) {
    const account = await getAccount(userId);

    if (!account.ok) {
      throw new Error(`accounts-service returned ${account.status} while auditing user ${userId}`);
    }

    accounts.push(account.body);
  }

  const total = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const totalBalance = total.toFixed(2);

  return {
    total_balance: totalBalance,
    users_checked: accounts.length,
    expected_seed_total: expectedSeedTotal,
    status: totalBalance === expectedSeedTotal ? "CONSISTENT" : "INCONSISTENT"
  };
}

async function getTransactionStatusCounts() {
  const result = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM transactions
     GROUP BY status`
  );

  const counts = {
    pending_count: 0,
    debited_count: 0,
    failed_count: 0,
    rolled_back_count: 0,
    completed_count: 0
  };

  for (const row of result.rows) {
    if (row.status === "PENDING") counts.pending_count = row.count;
    if (row.status === "DEBITED") counts.debited_count = row.count;
    if (row.status === "FAILED") counts.failed_count = row.count;
    if (row.status === "ROLLED_BACK") counts.rolled_back_count = row.count;
    if (row.status === "COMPLETED") counts.completed_count = row.count;
  }

  return counts;
}

module.exports = {
  auditMoneyConservation,
  getReconciliation
};

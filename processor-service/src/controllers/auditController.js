const { getAccount } = require("../services/accountsClient");

const seedUserIds = [1, 2, 3];
const expectedSeedTotal = "1050.00";

async function auditMoneyConservation(_request, response, next) {
  try {
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

    return response.status(200).json({
      message: "Money conservation audit completed",
      total_balance: totalBalance,
      users_checked: accounts.length,
      expected_seed_total: expectedSeedTotal,
      status: totalBalance === expectedSeedTotal ? "CONSISTENT" : "INCONSISTENT"
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  auditMoneyConservation
};


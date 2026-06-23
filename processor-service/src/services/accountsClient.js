const accountsServiceUrl = process.env.ACCOUNTS_SERVICE_URL || "http://localhost:3000";

async function parseJsonResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function getAccount(userId) {
  const response = await fetch(`${accountsServiceUrl}/accounts/${userId}`);
  const body = await parseJsonResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

async function checkAccountsService() {
  try {
    const response = await fetch(`${accountsServiceUrl}/health`);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function updateBalance({ userId, amount, operation }) {
  const response = await fetch(`${accountsServiceUrl}/accounts/update-balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      amount,
      operation
    })
  });
  const body = await parseJsonResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

module.exports = {
  accountsServiceUrl,
  checkAccountsService,
  getAccount,
  updateBalance
};

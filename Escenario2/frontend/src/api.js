const ACCOUNTS_URL = import.meta.env.VITE_ACCOUNTS_API_URL || "http://localhost:8011";
const PROCESSOR_URL = import.meta.env.VITE_PROCESSOR_API_URL || "http://localhost:8012";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(baseUrl, path, options = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError(`No se pudo conectar con ${baseUrl}. ¿El servicio está corriendo?`, 0);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // no body
  }

  if (!response.ok) {
    const detail = body?.detail || body?.error_message || `Error ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  return body;
}

export const accountsApi = {
  list: () => request(ACCOUNTS_URL, "/accounts"),
  create: (payload) => request(ACCOUNTS_URL, "/accounts", { method: "POST", body: JSON.stringify(payload) }),
  getBalance: (accountId) => request(ACCOUNTS_URL, `/accounts/${accountId}/balance`),
  getLedger: (accountId) => request(ACCOUNTS_URL, `/accounts/${accountId}/ledger`),
};

export const processorApi = {
  recharge: (payload) => request(PROCESSOR_URL, "/transactions/recharge", { method: "POST", body: JSON.stringify(payload) }),
  transfer: (payload) => request(PROCESSOR_URL, "/transactions/transfer", { method: "POST", body: JSON.stringify(payload) }),
  getAccountTransactions: (accountId) => request(PROCESSOR_URL, `/accounts/${accountId}/transactions`),
};

export { ApiError };

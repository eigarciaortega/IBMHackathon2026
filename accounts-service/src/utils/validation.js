function parsePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseMoneyAmount(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const asText = String(value).trim();

  if (!/^\d+(\.\d{1,2})?$/.test(asText)) {
    return null;
  }

  const parsed = Number(asText);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed.toFixed(2);
}

function isValidOperation(operation) {
  return operation === "debit" || operation === "credit";
}

module.exports = {
  parsePositiveInteger,
  parseMoneyAmount,
  isValidOperation
};


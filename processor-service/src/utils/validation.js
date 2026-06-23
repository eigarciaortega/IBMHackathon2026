function parsePositiveInteger(value) {
  if (typeof value === "object" || typeof value === "boolean") {
    return null;
  }

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

  if (Array.isArray(value) || typeof value === "object" || typeof value === "boolean") {
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

module.exports = {
  parseMoneyAmount,
  parsePositiveInteger
};

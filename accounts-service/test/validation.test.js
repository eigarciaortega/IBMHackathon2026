const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isValidOperation,
  parseMoneyAmount,
  parsePositiveInteger
} = require("../src/utils/validation");

test("parsePositiveInteger accepts positive integer values", () => {
  assert.equal(parsePositiveInteger("1"), 1);
  assert.equal(parsePositiveInteger(2), 2);
});

test("parsePositiveInteger rejects invalid ids", () => {
  assert.equal(parsePositiveInteger("abc"), null);
  assert.equal(parsePositiveInteger(0), null);
  assert.equal(parsePositiveInteger(-1), null);
  assert.equal(parsePositiveInteger({ id: 1 }), null);
});

test("parseMoneyAmount accepts positive money with up to 2 decimals", () => {
  assert.equal(parseMoneyAmount(100), "100.00");
  assert.equal(parseMoneyAmount("100.5"), "100.50");
  assert.equal(parseMoneyAmount("100.55"), "100.55");
});

test("parseMoneyAmount rejects invalid money values", () => {
  assert.equal(parseMoneyAmount("100abc"), null);
  assert.equal(parseMoneyAmount("100.555"), null);
  assert.equal(parseMoneyAmount(0), null);
  assert.equal(parseMoneyAmount(-10), null);
  assert.equal(parseMoneyAmount({ amount: 10 }), null);
  assert.equal(parseMoneyAmount([10]), null);
});

test("isValidOperation allows only debit and credit", () => {
  assert.equal(isValidOperation("debit"), true);
  assert.equal(isValidOperation("credit"), true);
  assert.equal(isValidOperation("hack"), false);
});


const assert = require("node:assert/strict");
const test = require("node:test");
const {
  parseMoneyAmount,
  parsePositiveInteger
} = require("../src/utils/validation");

test("parsePositiveInteger accepts positive sender and receiver ids", () => {
  assert.equal(parsePositiveInteger("1"), 1);
  assert.equal(parsePositiveInteger(2), 2);
});

test("parsePositiveInteger rejects invalid sender and receiver ids", () => {
  assert.equal(parsePositiveInteger("abc"), null);
  assert.equal(parsePositiveInteger(0), null);
  assert.equal(parsePositiveInteger(-1), null);
  assert.equal(parsePositiveInteger({ user_id: 1 }), null);
});

test("parseMoneyAmount accepts valid transfer amounts", () => {
  assert.equal(parseMoneyAmount(100), "100.00");
  assert.equal(parseMoneyAmount("25.5"), "25.50");
  assert.equal(parseMoneyAmount("25.55"), "25.55");
});

test("parseMoneyAmount rejects invalid transfer amounts", () => {
  assert.equal(parseMoneyAmount("100abc"), null);
  assert.equal(parseMoneyAmount("1.234"), null);
  assert.equal(parseMoneyAmount(0), null);
  assert.equal(parseMoneyAmount(-5), null);
  assert.equal(parseMoneyAmount({ amount: 5 }), null);
  assert.equal(parseMoneyAmount([5]), null);
});

test("self-transfer rule can be checked with parsed ids", () => {
  const senderId = parsePositiveInteger(1);
  const receiverId = parsePositiveInteger(1);

  assert.equal(senderId === receiverId, true);
});


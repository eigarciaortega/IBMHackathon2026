const express = require("express");
const { auditMoneyConservation } = require("../controllers/auditController");
const { createTransfer } = require("../controllers/transferController");
const { getTransactionsByUser } = require("../controllers/transactionsController");

const router = express.Router();

router.post("/api/transfer", createTransfer);
router.get("/api/transactions/:user_id", getTransactionsByUser);
router.get("/api/audit/money-conservation", auditMoneyConservation);

module.exports = router;

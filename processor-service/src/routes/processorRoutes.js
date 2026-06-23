const express = require("express");
const { createTransfer } = require("../controllers/transferController");
const { getTransactionsByUser } = require("../controllers/transactionsController");

const router = express.Router();

router.post("/api/transfer", createTransfer);
router.get("/api/transactions/:user_id", getTransactionsByUser);

module.exports = router;


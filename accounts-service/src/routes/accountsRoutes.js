const express = require("express");
const {
  getAccount,
  rechargeAccount,
  updateBalance
} = require("../controllers/accountsController");

const router = express.Router();

router.get("/accounts/:id", getAccount);
router.post("/api/recharge", rechargeAccount);
router.post("/accounts/update-balance", updateBalance);

module.exports = router;


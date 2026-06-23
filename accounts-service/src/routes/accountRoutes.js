const express = require('express');
const router = express.Router();
const { getAccount, recharge, updateBalance } = require('../controllers/accountController');

router.get('/accounts/:id', getAccount);
router.post('/api/recharge', recharge);
router.post('/accounts/update-balance', updateBalance);

module.exports = router;

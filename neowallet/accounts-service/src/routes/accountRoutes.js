'use strict';

const { Router } = require('express');
const controller = require('../controllers/accountController');

const router = Router();

// Public endpoints
router.get('/accounts/:user_id', controller.validateUserId, controller.getAccount);
router.post('/api/recharge', controller.validateRecharge, controller.rechargeBalance);

// Internal endpoint (called by Processor Service)
router.post('/accounts/update-balance', controller.validateUpdateBalance, controller.updateBalance);

module.exports = router;

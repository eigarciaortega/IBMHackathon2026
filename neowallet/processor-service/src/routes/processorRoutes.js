'use strict';

const { Router } = require('express');
const controller = require('../controllers/processorController');

const router = Router();

router.post('/api/transfer', controller.validateTransfer, controller.transfer);
router.get('/api/transactions/:user_id', controller.validateUserId, controller.getHistory);

module.exports = router;

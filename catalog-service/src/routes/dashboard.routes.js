const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getTodayOccupancy } = require('../controllers/dashboard.controller');

const router = Router();

router.get('/today', authenticate, requireAdmin, getTodayOccupancy);

module.exports = router;

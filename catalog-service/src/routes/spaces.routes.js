const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getAllSpaces,
  getSpaceById,
  getAvailableSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
} = require('../controllers/spaces.controller');

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/',              getAllSpaces);
router.get('/availability',  getAvailableSpaces);
router.get('/:id',           getSpaceById);

// Admin only
router.post('/',             requireAdmin, createSpace);
router.put('/:id',           requireAdmin, updateSpace);
router.delete('/:id',        requireAdmin, deleteSpace);

module.exports = router;

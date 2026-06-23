const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/space.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Rutas públicas (requieren autenticación)
router.get('/', verifyToken, spaceController.getAllSpaces);
router.get('/dashboard', verifyToken, spaceController.getDashboard);
router.get('/:id', verifyToken, spaceController.getSpaceById);

// Rutas protegidas (requieren autenticación + rol ADMIN)
router.post('/', verifyToken, isAdmin, spaceController.createSpace);
router.put('/:id', verifyToken, isAdmin, spaceController.updateSpace);
router.delete('/:id', verifyToken, isAdmin, spaceController.deleteSpace);

module.exports = router;

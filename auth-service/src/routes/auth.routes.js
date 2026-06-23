const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controllers');
const { authMiddleware } = require('../middleware/auth.middleware');

// Rutas públicas (no requieren autenticación)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/verify', authMiddleware, authController.verifyToken);

module.exports = router;

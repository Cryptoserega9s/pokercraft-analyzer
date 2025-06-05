// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);

// Маршрут для получения тестового токена (только для разработки)
router.get('/test-token', authController.getTestToken);

// Маршрут для получения информации о текущем пользователе
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

module.exports = router;
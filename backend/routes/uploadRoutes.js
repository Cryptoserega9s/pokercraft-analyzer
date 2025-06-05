// backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

// Защищаем все маршруты аутентификацией
router.use(authMiddleware.authenticate);

// Маршрут для загрузки файла
router.post('/upload', uploadController.uploadFile);

// Маршрут для получения статистики
router.get('/stats', uploadController.getStats);

module.exports = router;
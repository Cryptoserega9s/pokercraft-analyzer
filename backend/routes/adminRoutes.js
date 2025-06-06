// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// Применяем middleware ко всем маршрутам в этом файле
router.use(authenticate, isAdmin);

// GET /api/admin/users -> получить список всех пользователей со сводной статистикой
router.get('/users', adminController.getAllUsers);

// GET /api/admin/users/:userId/stats -> получить полную статистику для одного пользователя
router.get('/users/:userId/stats', adminController.getUserStats);

// GET /api/admin/users/:userId/tournaments -> получить турниры пользователя (с пагинацией/фильтрами)
router.get('/users/:userId/tournaments', adminController.getUserTournaments);

module.exports = router;
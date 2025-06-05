// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models').User;

exports.authenticate = async (req, res, next) => {
  try {
    // Проверка наличия заголовка авторизации
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация. Токен отсутствует'
      });
    }

    // Проверка формата заголовка
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Неверный формат токена'
      });
    }

    // Извлечение и проверка токена
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      req.userId = decoded.id;
    } catch (jwtError) {
      console.error('Ошибка верификации JWT:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Недействительный или просроченный токен'
      });
    }

    // Проверка существования пользователя
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Добавление информации о пользователе для использования в последующих обработчиках
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при проверке аутентификации'
    });
  }
};

// Добавляем middleware для проверки входа без ответа 401
exports.checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.isAuthenticated = false;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      const user = await User.findByPk(decoded.id);
      
      if (user) {
        req.userId = user.id;
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role
        };
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
    } catch (error) {
      req.isAuthenticated = false;
    }
    
    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};
// backend/middleware/adminMiddleware.js
exports.isAdmin = (req, res, next) => {
  // Этот middleware должен всегда вызываться ПОСЛЕ authMiddleware.authenticate,
  // поэтому мы можем быть уверены, что объект req.user существует.
  if (req.user && req.user.role === 'admin') {
    // Если роль 'admin', пропускаем запрос дальше
    next();
  } else {
    // Если пользователь не админ, возвращаем ошибку "Доступ запрещен"
    res.status(403).json({
      success: false,
      message: 'Доступ запрещен. Требуются права администратора.'
    });
  }
};
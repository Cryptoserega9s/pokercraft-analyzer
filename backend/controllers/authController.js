// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models').User;
const { Sequelize } = require('sequelize');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Проверка обязательных полей
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email и пароль обязательны' 
      });
    }

    // Проверка корректности email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректный формат email' 
      });
    }

    // Проверка длины пароля
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пароль должен содержать минимум 6 символов' 
      });
    }

    // Проверка существующего пользователя
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Пользователь с таким email уже существует' 
      });
    }

    // Хеширование пароля и создание пользователя
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      email, 
      password_hash: hashedPassword 
    });
    
    // Создание JWT токена
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'secret_key', 
      { expiresIn: '7d' } // Увеличиваем срок действия токена до 7 дней
    );
    
    res.json({ 
      success: true,
      message: 'Регистрация успешна',
      token 
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    
    // Обработка ошибки дублирования уникального ключа
    if (error instanceof Sequelize.UniqueConstraintError) {
      return res.status(409).json({ 
        success: false, 
        message: 'Пользователь с таким email уже существует' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера при регистрации' 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Проверка обязательных полей
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email и пароль обязательны' 
      });
    }
    
    // Поиск пользователя
    const user = await User.findOne({ where: { email } });

    // Проверка существования пользователя и пароля
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }

    // Создание JWT токена
    const token = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'secret_key', 
      { expiresIn: '7d' } // Увеличиваем срок действия токена до 7 дней
    );
    
    res.json({ 
      success: true,
      message: 'Вход выполнен успешно',
      token 
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера при входе' 
    });
  }
};

// Добавим заглушку для forgotPassword, если она используется в authRoutes.js, но не определена здесь
exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email обязателен'
    });
  }
  
  // Здесь можно добавить реальную логику сброса пароля
  
  res.json({
    success: true,
    message: 'Инструкции по сбросу пароля отправлены на ваш email'
  });
};

// Функция для получения тестового JWT токена
exports.getTestToken = async (req, res) => {
  try {
    // Сначала проверяем, есть ли уже тестовый пользователь
    let testUser = await User.findOne({ 
      where: { 
        email: 'test@example.com' 
      } 
    });
    
    // Если тестового пользователя нет, создаем его
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password_hash: hashedPassword
      });
      
      console.log('Создан тестовый пользователь с ID:', testUser.id);
    } else {
      console.log('Найден существующий тестовый пользователь с ID:', testUser.id);
    }
    
    // Создаем JWT токен для тестового пользователя
    const token = jwt.sign(
      { id: testUser.id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' } // Тестовый токен с длительным сроком действия
    );
    
    // Отправляем HTML-страницу с токеном для удобства копирования
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Тестовый JWT токен</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h2 { color: #333; }
          .token-container { 
            padding: 15px; 
            background-color: #f5f5f5; 
            border: 1px solid #ddd; 
            border-radius: 4px;
            margin: 20px 0;
            word-break: break-all;
          }
          .copy-btn {
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
          }
          .success-message {
            display: none;
            color: #4CAF50;
            margin-top: 10px;
          }
          .link-list {
            margin-top: 30px;
          }
          .link-list a {
            display: block;
            margin-bottom: 10px;
            color: #2196F3;
          }
        </style>
      </head>
      <body>
        <h2>Тестовый JWT токен</h2>
        <p>Используйте этот токен для тестирования API и загрузки файлов:</p>
        
        <div class="token-container" id="token">
          ${token}
        </div>
        
        <button class="copy-btn" onclick="copyToken()">Скопировать токен</button>
        <div class="success-message" id="copySuccess">✓ Токен скопирован в буфер обмена</div>
        
        <div class="link-list">
          <h3>Полезные ссылки:</h3>
          <a href="/upload" target="_blank">Тестовая страница загрузки файла</a>
          <a href="/api/health" target="_blank">Проверка статуса API</a>
        </div>
        
        <script>
          function copyToken() {
            const tokenText = document.getElementById('token').textContent.trim();
            navigator.clipboard.writeText(tokenText)
              .then(() => {
                const successMsg = document.getElementById('copySuccess');
                successMsg.style.display = 'block';
                setTimeout(() => {
                  successMsg.style.display = 'none';
                }, 2000);
              })
              .catch(err => {
                console.error('Ошибка при копировании токена:', err);
                alert('Не удалось скопировать токен. Пожалуйста, выделите и скопируйте его вручную.');
              });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Ошибка получения тестового токена:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении тестового токена'
    });
  }
};

// Добавляем функцию для получения информации о текущем пользователе
exports.getCurrentUser = async (req, res) => {
  try {
    // Получаем ID пользователя из объекта req.user
    const userId = req.user.id;
    
    // Находим пользователя в базе данных
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'role'] // Выбираем только нужные поля
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Возвращаем информацию о пользователе
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении данных пользователя'
    });
  }
};
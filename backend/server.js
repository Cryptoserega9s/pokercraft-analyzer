// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const path = require('path');

// Импорты маршрутов
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <<< ДОБАВИТЬ ЭТУ СТРОКУ

// Импортируем объект db, который содержит sequelize и все модели
const db = require('./models');
const sequelize = db.sequelize; // Получаем экземпляр sequelize

// Инициализация переменных окружения
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  debug: false,
  limits: { fileSize: 50 * 1024 * 1024 }
}));

// --- CORS Headers ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

app.options('*', (req, res) => {
  res.status(200).end();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// --- Маршруты (Routes) ---
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes); // <<< ДОБАВИТЬ ЭТУ СТРОКУ

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const startServer = async () => {
  try {
    console.log('Проверка подключения к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных успешно установлено.');

    console.log('Синхронизация моделей с базой данных...');
    await sequelize.sync(); 
    
    console.log('✅ Модели успешно синхронизированы.');

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log('Доступные маршруты:');
      console.log('- GET  /api/health: Проверка работоспособности API');
      console.log('- POST /api/auth/register: Регистрация');
      console.log('- POST /api/auth/login: Вход');
      console.log('- POST /api/upload/upload: Загрузка файла истории');
      console.log('- GET  /api/data/stats: Получение основной статистики');
    });

  } catch (error) {
    console.error('❌ Критическая ошибка при запуске сервера:', error);
    process.exit(1);
  }
};

startServer();
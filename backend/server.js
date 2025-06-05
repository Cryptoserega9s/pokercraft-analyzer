// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const path = require('path');
const authMiddleware = require('./middleware/authMiddleware');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
// Импортируем весь объект db из моделей, который должен содержать sequelize и все модели
const db = require('./models');
const Tournament = db.Tournament; // Получаем модель Tournament
const sequelize = db.sequelize; // Получаем объект sequelize для проверки подключения

// Инициализация переменных окружения
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // Для парсинга JSON-запросов
app.use(express.urlencoded({ extended: true })); // Для парсинга URL-кодированных запросов
app.use(fileUpload({
  debug: true, // Включаем режим отладки для fileUpload
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB максимальный размер файла
})); // Для обработки загрузки файлов

// Заголовки для CORS (для работы с фронтендом)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Разрешаем запросы с любого домена
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // Разрешенные заголовки
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Разрешенные HTTP-методы
  next();
});

// Логгирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Обработка предполетных запросов OPTIONS
app.options('*', (req, res) => {
  res.status(200).end();
});

// Тестовая форма загрузки файла через браузер (для удобства тестирования)
app.get('/upload', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Тестовая загрузка файла PokerCraft</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h2 { color: #333; }
        .form-container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .result-container { display: none; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-top: 20px; }
        .success { border-color: #4CAF50; background-color: #E8F5E9; }
        .error { border-color: #F44336; background-color: #FFEBEE; }
        .btn { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        input[type="file"] { margin: 10px 0; }
        .progress-container { margin-top: 15px; background-color: #f1f1f1; border-radius: 5px; }
        .progress-bar { width: 0%; height: 20px; background-color: #4CAF50; border-radius: 5px; }
        pre { white-space: pre-wrap; word-wrap: break-word; background-color: #f5f5f5; padding: 10px; max-height: 300px; overflow: auto; }
        .token-input { width: 100%; padding: 8px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h2>Тестовая загрузка файла PokerCraft</h2>
      
      <div class="form-container">
        <h3>1. Токен авторизации</h3>
        <p>Введите JWT токен (можно получить после входа на основном сайте)</p>
        <input type="text" id="token" class="token-input" placeholder="Введите JWT токен">
        
        <h3>2. Выберите файл history.html</h3>
        <input type="file" id="file" accept=".html">
        <button id="upload" class="btn">Загрузить файл</button>
        
        <div class="progress-container">
          <div class="progress-bar" id="progress"></div>
        </div>
      </div>
      
      <div class="result-container" id="result">
        <h3>Результат загрузки</h3>
        <pre id="result-data"></pre>
      </div>
      
      <script>
        document.getElementById('upload').addEventListener('click', async function() {
          const fileInput = document.getElementById('file');
          const token = document.getElementById('token').value.trim();
          const resultContainer = document.getElementById('result');
          const resultData = document.getElementById('result-data');
          const progressBar = document.getElementById('progress');
          
          if (!fileInput.files.length) {
            alert('Пожалуйста, выберите файл');
            return;
          }
          
          if (!token) {
            alert('Пожалуйста, введите токен авторизации');
            return;
          }
          
          const file = fileInput.files[0];
          if (!file.name.toLowerCase().endsWith('.html')) {
            alert('Пожалуйста, выберите файл с расширением .html');
            return;
          }
          
          // Сбрасываем предыдущий результат
          resultContainer.style.display = 'none';
          resultContainer.classList.remove('success', 'error');
          progressBar.style.width = '0%';
          
          try {
            const formData = new FormData();
            formData.append('html', file);
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload/upload', true);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            
            // Отслеживание прогресса загрузки
            xhr.upload.onprogress = function(e) {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
              }
            };
            
            xhr.onload = function() {
              resultContainer.style.display = 'block';
              
              if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resultContainer.classList.add(response.success ? 'success' : 'error');
                resultData.textContent = JSON.stringify(response, null, 2);
              } else {
                resultContainer.classList.add('error');
                try {
                  const errorResponse = JSON.parse(xhr.responseText);
                  resultData.textContent = JSON.stringify(errorResponse, null, 2);
                } catch (parseError) {
                  resultData.textContent = xhr.responseText || 'Ошибка загрузки файла';
                }
              }
            };
            
            xhr.onerror = function() {
              resultContainer.style.display = 'block';
              resultContainer.classList.add('error');
              resultData.textContent = 'Ошибка сети при загрузке файла';
            };
            
            xhr.send(formData);
          } catch (error) {
            resultContainer.style.display = 'block';
            resultContainer.classList.add('error');
            resultData.textContent = 'Ошибка: ' + error.message;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Диагностический маршрут для проверки API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Подключение маршрутов
app.use('/api/auth', authRoutes); // Маршруты для аутентификации
app.use('/api/upload', uploadRoutes); // Маршруты для загрузки файлов

// Функция для расчета статистики по турнирам
const calculateStats = (tournaments) => {
  const totalBuyins = tournaments.reduce((sum, row) => sum + row.buyin_total, 0);
  const totalCommission = tournaments.reduce((sum, row) => sum + row.buyin_commission, 0);
  const totalBounties = tournaments.reduce((sum, row) => sum + row.prize_bounty, 0);
  const finalResult = tournaments.reduce((sum, row) => sum + row.net_profit, 0);
  const roi = totalBuyins > 0 ? (finalResult / totalBuyins * 100).toFixed(2) : 0;

  return {
    totalTournaments: tournaments.length,
    totalBuyins,
    totalCommission,
    totalBounties,
    finalResult,
    roi
  };
};

// Маршрут получения данных с фильтрами, защищенный аутентификацией
app.get('/api/data', authMiddleware.authenticate, async (req, res) => {
  // Извлекаем параметры фильтрации из запроса
  const { buyin, place, start, end, day } = req.query;
  let where = {}; // Объект для условий фильтрации Sequelize

  // Применяем фильтры, если они присутствуют
  if (buyin) {
    where.buyin_total = parseFloat(buyin); // Фильтр по общему бай-ину
  }
  if (place) {
    where.finish_place = parseInt(place);
  }
  if (start && end) {
    // В Express 4 синтаксис немного отличается
    where.start_time = {
      [db.Sequelize.Op.gte]: start,
      [db.Sequelize.Op.lte]: end
    };
  } else if (start) {
    where.start_time = { [db.Sequelize.Op.gte]: start };
  } else if (end) {
    where.start_time = { [db.Sequelize.Op.lte]: end };
  }
  if (day) {
    where.weekday = parseInt(day); // Фильтр по дню недели
  }

  try {
    // Находим турниры в базе данных с учетом фильтров
    const tournaments = await Tournament.findAll({ where });
    // Отправляем данные турниров и рассчитанную статистику
    res.json({ data: tournaments, stats: calculateStats(tournaments) });
  } catch (error) {
    // Обработка ошибок при получении данных
    console.error('Ошибка получения данных:', error);
    res.status(500).send('Ошибка сервера при получении данных');
  }
});

// Функция проверки подключения к базе данных
const testDatabaseConnection = async () => {
  try {
    console.log('Проверка подключения к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных успешно установлено.');
    
    // Проверка моделей
    console.log('Доступные модели:');
    Object.keys(db).forEach(modelName => {
      if (db[modelName] && db[modelName].tableName) {
        console.log(`- ${modelName} (таблица: ${db[modelName].tableName})`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    return false;
  }
};

// Запуск сервера
const startServer = async () => {
  // Проверка подключения к базе данных перед запуском сервера
  const dbConnected = await testDatabaseConnection();
  
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Состояние базы данных: ${dbConnected ? 'подключена' : 'НЕ ПОДКЛЮЧЕНА'}`);
    console.log('Доступные маршруты:');
    console.log('- GET  /api/health: Проверка работоспособности API');
    console.log('- POST /api/auth/register: Регистрация нового пользователя');
    console.log('- POST /api/auth/login: Аутентификация пользователя');
    console.log('- POST /api/upload/upload: Загрузка файла истории');
    console.log('- GET  /api/upload/stats: Получение статистики');
    console.log('- GET  /api/data: Получение данных турниров с фильтрами');
    console.log('- GET  /upload: Тестовая форма загрузки файла');
  });
};

startServer();
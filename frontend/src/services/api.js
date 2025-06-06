// frontend/src/services/api.js
import axios from 'axios';

// Создаем экземпляр Axios с базовым URL и таймаутом
const apiClient = axios.create({
  baseURL: 'https://pokercraft-backend.onrender.com', // Базовый URL для всех API-запросов
  timeout: 10000, // Таймаут запроса в миллисекундах
});

// Добавляем перехватчик запросов для включения токена авторизации
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token'); // Получаем токен из локального хранилища
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Добавляем токен в заголовок Authorization
    }
    return config; // Возвращаем измененную конфигурацию
  },
  error => {
    return Promise.reject(error); // Обрабатываем ошибки запроса
  }
);

/**
 * Получает данные из конечной точки /api/data.
 * @param {object} filters - Объект, содержащий фильтры, которые будут отправлены в качестве параметров запроса.
 * @returns {Promise<object>} - Промис, который разрешается в данные ответа.
 */
export const fetchData = (filters) => {
  return apiClient.get('/api/data', { params: filters });
};

/**
 * Загружает HTML-файл в конечную точку /api/upload/upload.
 * @param {File} file - Файл для загрузки.
 * @param {function} onUploadProgress - Функция обратного вызова для событий прогресса загрузки.
 * @returns {Promise<object>} - Промис, который разрешается в данные ответа.
 */
export const uploadFile = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('html', file); // Добавляем файл в объект FormData

  return apiClient.post('/api/upload/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Важный заголовок для загрузки файлов
    },
    onUploadProgress: onUploadProgress, // Передаем колбэк прогресса
  });
};

/**
 * Получает статистику пользователя из конечной точки /api/data/stats.
 * @returns {Promise<object>} - Промис, который разрешается в объект статистики.
 */
export const fetchStats = () => {
  return apiClient.get('/api/data/stats');
};
export default apiClient;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import './components/Landing.css';
import './components/Dashboard.css';

// Компоненты для авторизации
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      onLogin();
    } catch (err) {
      setError(t('login.error'));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t('login.title')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.email')}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password')}
            required
          />
          <button type="submit">{t('login.submit')}</button>
        </form>
      </div>
    </div>
  );
};

// Безопасное получение значения из localStorage
const getLocalStorageValue = (key, defaultValue = null) => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.error(`Ошибка при получении ${key} из localStorage:`, error);
    return defaultValue;
  }
};

// Безопасная установка значения в localStorage
const setLocalStorageValue = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Ошибка при установке ${key} в localStorage:`, error);
    return false;
  }
};

// Безопасное удаление значения из localStorage
const removeLocalStorageValue = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Ошибка при удалении ${key} из localStorage:`, error);
    return false;
  }
};

// Главный компонент приложения
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { t, i18n } = useTranslation();

  // Проверка токена при загрузке и при его изменении
  useEffect(() => {
    const token = getLocalStorageValue('token');
    
    const validateToken = async () => {
      if (token) {
        try {
          await axios.get('http://localhost:3001/api/data', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsAuthenticated(true);
        } catch (error) {
          if (error.response && error.response.status === 401) {
            removeLocalStorageValue('token');
            setIsAuthenticated(false);
          }
        }
      } else {
        setIsAuthenticated(false);
      }
      
      // Устанавливаем флаг инициализации только после проверки аутентификации
      setIsInitialized(true);
    };
    
    validateToken();
  }, []);

  // Настраиваем слушатель изменений localStorage
  useEffect(() => {
    // Функция для проверки обновления токена в localStorage
    const checkAuthStatus = () => {
      const token = getLocalStorageValue('token');
      if (token && !isAuthenticated) {
        setIsAuthenticated(true);
      } else if (!token && isAuthenticated) {
        setIsAuthenticated(false);
      }
    };

    // Слушаем события storage для синхронизации между вкладками
    window.addEventListener('storage', checkAuthStatus);

    // Локальное событие для отслеживания изменений в текущей вкладке
    window.addEventListener('localStorageChange', checkAuthStatus);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      window.removeEventListener('localStorageChange', checkAuthStatus);
    };
  }, [isAuthenticated]);

  // Проверка и установка языка
  useEffect(() => {
    const savedLanguage = getLocalStorageValue('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      // Определение языка браузера и установка по умолчанию
      const browserLang = navigator.language.split('-')[0];
      const supportedLangs = ['en', 'ru'];
      const defaultLang = supportedLangs.includes(browserLang) ? browserLang : 'ru';
      
      i18n.changeLanguage(defaultLang);
      setLocalStorageValue('language', defaultLang);
    }
  }, [i18n]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    removeLocalStorageValue('token');
    setIsAuthenticated(false);
    // Создаем событие об изменении localStorage
    window.dispatchEvent(new Event('localStorageChange'));
  };

  // Если приложение еще не инициализировано, показываем заглушку
  if (!isInitialized) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Landing onLoginSuccess={handleLogin} />
              )
            } 
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="*"
            element={<Navigate to="/" />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
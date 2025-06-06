import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import apiClient from './services/api'; // <-- Импортируем наш统一 клиент
import './App.css';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import './components/Landing.css';
import './components/Dashboard.css';

const App = () => {
  // isInitialized - флаг, чтобы не показывать интерфейс до проверки токена
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Этот useEffect выполняется один раз при загрузке приложения
  useEffect(() => {
    const validateToken = async () => {
      let token = null;
      try {
        token = localStorage.getItem('token');
      } catch (e) {
        console.error("Could not access localStorage", e);
        setIsAuthenticated(false);
        setIsInitialized(true);
        return;
      }
      
      if (token) {
        try {
          // Проверяем, действителен ли токен, запросив защищенные данные
          await apiClient.get('/api/auth/me'); // Простой запрос для проверки токена
          setIsAuthenticated(true);
        } catch (error) {
          // apiClient уже обработает 401 и удалит токен, но на всякий случай
          setIsAuthenticated(false); 
          localStorage.removeItem('token');
        }
      } else {
        setIsAuthenticated(false);
      }
      // После проверки, говорим приложению, что можно отрисовывать основной интерфейс
      setIsInitialized(true);
    };

    validateToken();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setIsAuthenticated(false);
    // Navigate to '/' будет обработан роутером автоматически
  };

  // Пока идет проверка токена, показываем заглушку
  if (!isInitialized) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            !isAuthenticated ? (
              <Landing onLoginSuccess={handleLogin} />
            ) : (
              <Navigate to="/dashboard" />
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
        {/* Любой другой путь будет перенаправлен на главную страницу */}
        <Route
          path="*"
          element={<Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
};

export default App;
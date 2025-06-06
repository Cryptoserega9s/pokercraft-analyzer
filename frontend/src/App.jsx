import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import apiClient from './services/api'; // <-- Импортируем наш统一 клиент
import './App.css';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import UserDetails from './components/admin/UserDetails';
import AdminRoute from './components/auth/AdminRoute';
import './components/Landing.css';
import './components/Dashboard.css';

const App = () => {
  // isInitialized - флаг, чтобы не показывать интерфейс до проверки токена
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

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
          const response = await apiClient.get('/api/auth/me'); 
          setIsAuthenticated(true);
          setUserInfo(response.data.user);
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

  const handleLogin = async () => { // <<< ИЗМЕНЕНИЕ: Функция стала асинхронной
    try {
        // После успешной установки токена в localStorage, получаем данные пользователя
        const response = await apiClient.get('/api/auth/me');
        setIsAuthenticated(true);
        setUserInfo(response.data.user);
    } catch(error) {
        console.error("Failed to fetch user info after login", error);
        // Обработка ошибки, если не удалось получить данные
        handleLogout();
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setIsAuthenticated(false);
    setUserInfo(null);
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
              // <<< ИЗМЕНЕНИЕ: Перенаправляем админа сразу в его панель
              userInfo?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            )
          } 
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              // <<< ИЗМЕНЕНИЕ: Передаем userInfo в Dashboard
              <Dashboard userInfo={userInfo} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        
        {/* <<< ИЗМЕНЕНИЕ: Новый блок маршрутов для админ-панели >>> */}
        <Route element={<AdminRoute userInfo={userInfo} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users/:userId" element={<UserDetails />} />
        </Route>
        
        <Route
          path="*"
          element={<Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
};
export default App;
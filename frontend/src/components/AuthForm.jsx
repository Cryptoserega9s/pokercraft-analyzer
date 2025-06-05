// frontend/src/components/AuthForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

function AuthForm({ mode = 'register', onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  const validatePassword = (password) => password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(email)) {
      setError('Неверный формат email');
      return;
    }

    if (mode === 'login' && !validatePassword(password)) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(endpoint, { email, password });
      const newToken = response.data.token;
      onAuth(newToken);
      setSuccess(mode === 'register' ? 'Регистрация успешна!' : 'Вход выполнен!');
    } catch (err) {
      setError(mode === 'register' ? 'Ошибка регистрации' : 'Неверные учетные данные');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button 
            onClick={() => setActiveTab('register')} 
            className={mode === 'register' ? 'active' : ''}
          >
            Регистрация
          </button>
          <button 
            onClick={() => setActiveTab('login')} 
            className={mode === 'login' ? 'active' : ''}
          >
            Вход
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            required
          />
          {mode === 'login' && (
            <a href="/forgot-password" className="forgot-password">Забыли пароль?</a>
          )}
          <button type="submit">{mode === 'register' ? 'Зарегистрироваться' : 'Войти'}</button>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
        </form>
      </div>
    </div>
  );
}

export default AuthForm;
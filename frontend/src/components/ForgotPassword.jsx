// frontend/src/components/ForgotPassword.jsx
import React, { useState } from 'react';
import axios from 'axios';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setMessage('Инструкция отправлена на email');
    } catch (err) {
      setError('Ошибка восстановления пароля');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Восстановление пароля</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Введите email"
            required
          />
          <button type="submit">Отправить</button>
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
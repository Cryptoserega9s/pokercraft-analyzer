import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api'; // <-- Импортируем наш клиент

const Landing = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    try {
        localStorage.setItem('language', lng);
    } catch (e) {
        console.error("Could not access localStorage", e);
    }
  };

  const toggleTab = (tab) => {
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };
  
  // Общая функция для сохранения токена и обновления состояния
  const handleAuthSuccess = (token) => {
    try {
        localStorage.setItem('token', token);
    } catch (e) {
        console.error("Could not access localStorage", e);
        setError("Не удалось сохранить сессию. Проверьте настройки браузера.");
        return;
    }
    onLoginSuccess(); // Обновляем состояние в App.jsx
    navigate('/dashboard'); // Переходим в кабинет
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      handleAuthSuccess(response.data.token);
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('login.error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('landing.register.passwordMismatch'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiClient.post('/api/auth/register', { email, password });
      setSuccess(t('landing.register.success'));
      // После успешной регистрации сразу логиним пользователя
      handleAuthSuccess(response.data.token);
    } catch (err) {
      const errorMessage = err.response?.data?.message || t('landing.register.error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-content">
          <h1 className="landing-title">PokerCraft Analyzer</h1>
          <p className="landing-subtitle">{t('landing.subtitle')}</p>
          
          <div className="landing-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <h3>{t('landing.features.stats')}</h3>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📈</div>
              <h3>{t('landing.features.charts')}</h3>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <h3>{t('landing.features.title')}</h3>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📤</div>
              <h3>{t('landing.features.upload')}</h3>
            </div>
          </div>
        </div>
        
        <div className="auth-container landing-auth">
          <div className="auth-card">
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => toggleTab('login')}
              >
                {t('landing.login.title')}
              </button>
              <button 
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => toggleTab('register')}
              >
                {t('landing.register.title')}
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            {activeTab === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('landing.login.email')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('landing.login.password')}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="auth-button" 
                  disabled={isLoading}
                >
                  {isLoading ? t('loading') : t('landing.login.submit')}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('landing.register.email')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('landing.register.password')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('landing.register.confirmPassword')}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="auth-button" 
                  disabled={isLoading}
                >
                  {isLoading ? t('loading') : t('landing.register.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
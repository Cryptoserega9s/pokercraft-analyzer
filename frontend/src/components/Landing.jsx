import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Landing = ({ onLoginSuccess }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // Состояние для форм
  const [activeTab, setActiveTab] = useState('login'); // 'login' или 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Проверка авторизации при загрузке
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
    }
  }, [navigate]);

  // Переключение языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Переключение между вкладками входа и регистрации
  const toggleTab = (tab) => {
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  // Обработчик входа
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      });
      
      if (response.data && response.data.success) {
        localStorage.setItem('token', response.data.token);
        // Вызываем функцию обновления состояния аутентификации
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        // Создаем событие об изменении localStorage
        window.dispatchEvent(new Event('localStorageChange'));
        setIsLoading(false);
        navigate('/dashboard');
      } else {
        setIsLoading(false);
        setError(t('landing.login.error'));
      }
    } catch (err) {
      setIsLoading(false);
      // Используем серверное сообщение об ошибке, если оно есть
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : t('landing.login.error');
      setError(errorMessage);
      console.error('Ошибка входа:', err);
    }
  };

  // Обработчик регистрации
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Проверка обязательных полей
    if (!email || !password || !confirmPassword) {
      setError(t('landing.register.fieldsRequired'));
      setIsLoading(false);
      return;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('landing.register.invalidEmail'));
      setIsLoading(false);
      return;
    }
    
    // Проверка длины пароля
    if (password.length < 6) {
      setError(t('landing.register.passwordTooShort'));
      setIsLoading(false);
      return;
    }
    
    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      setError(t('landing.register.passwordMismatch'));
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/register', {
        email,
        password
      });
      
      if (response.data && response.data.success) {
        setSuccess(t('landing.register.success'));
        
        // Сохраняем токен и обновляем состояние аутентификации
        localStorage.setItem('token', response.data.token);
        
        // Вызываем функцию обновления состояния аутентификации
        if (onLoginSuccess) {
          onLoginSuccess();
        }

        // Создаем событие об изменении localStorage
        window.dispatchEvent(new Event('localStorageChange'));
        
        setIsLoading(false);
        
        // Сразу перенаправляем на дашборд
        navigate('/dashboard');
      } else {
        setIsLoading(false);
        setError(t('landing.register.error'));
      }
    } catch (err) {
      setIsLoading(false);
      // Используем серверное сообщение об ошибке, если оно есть
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : t('landing.register.error');
      setError(errorMessage);
      console.error('Ошибка регистрации:', err);
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
                  <label htmlFor="email">{t('landing.login.email')}</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('landing.login.email')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">{t('landing.login.password')}</label>
                  <input
                    id="password"
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
                  {isLoading ? t('landing.login.submit') : t('landing.login.submit')}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <div className="form-group">
                  <label htmlFor="register-email">{t('landing.register.email')}</label>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('landing.register.email')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="register-password">{t('landing.register.password')}</label>
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('landing.register.password')}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirm-password">{t('landing.register.confirmPassword')}</label>
                  <input
                    id="confirm-password"
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
                  {isLoading ? t('landing.register.submit') : t('landing.register.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      <div className="landing-section how-it-works">
        <h2>{t('landing.howItWorks.title')}</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>{t('landing.howItWorks.step1.title')}</h3>
            <p>{t('landing.howItWorks.step1.description')}</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>{t('landing.howItWorks.step2.title')}</h3>
            <p>{t('landing.howItWorks.step2.description')}</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>{t('landing.howItWorks.step3.title')}</h3>
            <p>{t('landing.howItWorks.step3.description')}</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>{t('landing.howItWorks.step4.title')}</h3>
            <p>{t('landing.howItWorks.step4.description')}</p>
          </div>
        </div>
      </div>
      
      <div className="landing-section benefits">
        <h2>{t('landing.benefits.title')}</h2>
        <div className="benefits-container">
          <div className="benefit">
            <div className="benefit-icon">📱</div>
            <h3>{t('landing.benefits.responsive.title')}</h3>
            <p>{t('landing.benefits.responsive.description')}</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon">🔒</div>
            <h3>{t('landing.benefits.secure.title')}</h3>
            <p>{t('landing.benefits.secure.description')}</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon">🌍</div>
            <h3>{t('landing.benefits.multilingual.title')}</h3>
            <p>{t('landing.benefits.multilingual.description')}</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon">🚀</div>
            <h3>{t('landing.benefits.performance.title')}</h3>
            <p>{t('landing.benefits.performance.description')}</p>
          </div>
        </div>
      </div>
      
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">PokerCraft Analyzer</div>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} PokerCraft Analyzer. {t('landing.footer.copyright')}</p>
        </div>
        <div className="language-switcher">
          <button 
            className={`language-button ${i18n.language === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
          >
            EN
          </button>
          <button 
            className={`language-button ${i18n.language === 'ru' ? 'active' : ''}`}
            onClick={() => changeLanguage('ru')}
          >
            RU
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 
// frontend/src/components/Landing.jsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';

// --- Компонент 1: Модальное окно для входа/регистрации ---
// Содержит всю старую логику форм
const AuthModal = ({ onClose, onLoginSuccess }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const toggleTab = (tab) => {
        setActiveTab(tab);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
    };
    
    const handleAuthSuccess = (token) => {
        try {
            localStorage.setItem('token', token);
        } catch (e) {
            console.error("Could not access localStorage", e);
            setError("Не удалось сохранить сессию. Проверьте настройки браузера.");
            return;
        }
        onLoginSuccess();
        navigate('/dashboard');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        try {
            const response = await apiClient.post('/api/auth/login', { email, password });
            handleAuthSuccess(response.data.token);
        } catch (err) {
            const errorMessage = err.response?.data?.message || t('landing.login.error');
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
            handleAuthSuccess(response.data.token);
        } catch (err) {
            const errorMessage = err.response?.data?.message || t('landing.register.error');
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Закрытие модального окна по клику на фон
    const handleBackdropClick = (e) => {
        if (e.target.id === 'auth-modal-backdrop') {
            onClose();
        }
    };

    return (
        <div className="auth-modal-backdrop" id="auth-modal-backdrop" onClick={handleBackdropClick}>
            <div className="auth-card-modal">
                <button className="close-modal-btn" onClick={onClose}>×</button>
                <div className="auth-tabs">
                    <button className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => toggleTab('login')}>
                        {t('landing.login.title')}
                    </button>
                    <button className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => toggleTab('register')}>
                        {t('landing.register.title')}
                    </button>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                
                {activeTab === 'login' ? (
                    <form className="auth-form" onSubmit={handleLogin}>
                        <div className="form-group"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('landing.login.email')} required /></div>
                        <div className="form-group"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('landing.login.password')} required /></div>
                        <button type="submit" className="auth-button" disabled={isLoading}>{isLoading ? t('loading') : t('landing.login.submit')}</button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleRegister}>
                        <div className="form-group"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('landing.register.email')} required /></div>
                        <div className="form-group"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('landing.register.password')} required /></div>
                        <div className="form-group"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('landing.register.confirmPassword')} required /></div>
                        <button type="submit" className="auth-button" disabled={isLoading}>{isLoading ? t('loading') : t('landing.register.submit')}</button>
                    </form>
                )}
            </div>
        </div>
    );
};


// --- Компонент 2: Секция с "фичей" ---
const FeatureSection = ({ titleKey, descriptionKey, imageUrl, reverse = false }) => {
    const { t } = useTranslation();
    return (
        <div className={`feature-section ${reverse ? 'reverse' : ''}`}>
            <div className="feature-image">
                <img src={imageUrl} alt={t(titleKey)} />
            </div>
            <div className="feature-text">
                <h2>{t(titleKey)}</h2>
                <p>{t(descriptionKey)}</p>
            </div>
        </div>
    );
};

// --- Компонент 3: Основной компонент лендинга ---
const Landing = ({ onLoginSuccess }) => {
    const { t, i18n } = useTranslation();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        try {
            localStorage.setItem('language', lng);
        } catch (e) {
            console.error("Could not access localStorage", e);
        }
    };
    
    // Плавный скролл к якорю
    const handleScrollToFeatures = (e) => {
        e.preventDefault();
        document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <div className="landing-page-v2">
                <header className="landing-header">
                    <div className="logo">{t('landing.mainTitle')}</div>
                    <div className="language-switcher">
                        <button onClick={() => changeLanguage('ru')} className={i18n.language === 'ru' ? 'active' : ''}>RU</button>
                        <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>EN</button>
                    </div>
                </header>

                <main>
                    <section className="hero-section">
                        <h1>{t('landing.hero.title')}</h1>
                        <p className="subtitle">{t('landing.hero.subtitle')}</p>
                        <div className="cta-buttons">
                            <a href="#features" onClick={handleScrollToFeatures} className="cta-primary">{t('landing.hero.cta_primary')}</a>
                            <button onClick={() => setIsAuthModalOpen(true)} className="cta-secondary">{t('landing.hero.cta_secondary')}</button>
                        </div>
                        <div className="hero-image-container">
                          <img src="/images/dashboard-hero.png" alt="Dashboard Preview" className="hero-image" />
                        </div>
                    </section>

                    <section id="features" className="features-container">
                        <h2 className="section-title">{t('landing.features.title')}</h2>
                        <FeatureSection
                            titleKey="landing.features.feature1.title"
                            descriptionKey="landing.features.feature1.description"
                            imageUrl="/images/feature-balance.png" 
                        />
                        <FeatureSection
                            titleKey="landing.features.feature2.title"
                            descriptionKey="landing.features.feature2.description"
                            imageUrl="/images/feature-doughnut.png"
                            reverse={true}
                        />
                         <FeatureSection
                            titleKey="landing.features.feature3.title"
                            descriptionKey="landing.features.feature3.description"
                            imageUrl="/images/feature-filters.png"
                        />
                    </section>
                    
                    <section className="final-cta-section">
                        <h2>{t('landing.final_cta.title')}</h2>
                        <p>{t('landing.final_cta.subtitle')}</p>
                        <button onClick={() => setIsAuthModalOpen(true)} className="cta-primary large">{t('landing.final_cta.cta')}</button>
                    </section>
                </main>
            </div>
            
            {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} onLoginSuccess={onLoginSuccess} />}
        </>
    );
};

export default Landing;
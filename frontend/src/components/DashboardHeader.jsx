import React from 'react';
import { useTranslation } from 'react-i18next';
import FileUpload from './FileUpload'; // Импортируем компонент загрузки

// Принимаем новый prop onUploadSuccess
function DashboardHeader({ userInfo, onLogout, onUploadSuccess }) {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
    };

    return (
        <header className="dashboard-header">
            <div className="dashboard-header-content">
                <div className="header-section logo-section">
                    <div className="dashboard-logo">PokerCraft Analyzer</div>
                </div>

                {/* Центральная секция с модулем загрузки */}
                <div className="header-section upload-section-header">
                    <FileUpload onUploadSuccess={onUploadSuccess} />
                </div>
                
                {/* Правая секция с навигацией пользователя */}
                <div className="header-section nav-section">
                     <nav className="dashboard-nav">
                        <div className="language-selector">
                            <button className={`language-btn ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>EN</button>
                            <button className={`language-btn ${i18n.language === 'ru' ? 'active' : ''}`} onClick={() => changeLanguage('ru')}>RU</button>
                        </div>
                        <div className="user-info">
                            <span className="username">{userInfo.email || 'User'}</span>
                        </div>
                        <button className="logout-btn" onClick={onLogout}>{t('dashboard.logout')}</button>
                    </nav>
                </div>
            </div>
        </header>
    );
}

export default DashboardHeader;
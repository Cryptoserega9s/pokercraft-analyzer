// frontend/src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Локализации
const resources = {
  en: {
    translation: require('./locales/en/translation.json')
  },
  ru: {
    translation: require('./locales/ru/translation.json')
  }
};

// Безопасное получение языка из localStorage
const getSavedLanguage = () => {
  try {
    return localStorage.getItem('language') || 'ru';
  } catch (error) {
    console.error('Ошибка при доступе к localStorage:', error);
    return 'ru';
  }
};

// Инициализация i18next
i18n
  .use(initReactI18next) // Подключение к React
  .init({
    resources, // Локализации
    lng: getSavedLanguage(), // Язык по умолчанию
    fallbackLng: 'ru', // Язык-запасной вариант
    interpolation: {
      escapeValue: false // Отключение экранирования значений
    }
  });

export default i18n;
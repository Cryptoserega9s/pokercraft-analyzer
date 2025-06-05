// frontend/src/locales.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Переводы
// frontend/src/locales.js
const resources = {
  en: {
    translation: {
      title: "PokerCraft Analyzer",
      upload: "Upload File",
      stats: "Statistics",
      tournaments: "Tournaments",
      noData: "No data yet",
      uploadButton: "Upload"
    }
  },
  ru: {
    translation: {
      title: "Анализатор PokerCraft",
      upload: "Загрузить файл",
      stats: "Статистика",
      tournaments: "Турниры",
      noData: "Данных пока нет",
      uploadButton: "Загрузить"
    }
  }
};

// Инициализация i18next
i18n.use(initReactI18next).init({
  resources,
  lng: "ru", // Язык по умолчанию
  fallbackLng: "ru",
  interpolation: { escapeValue: false }
});

export default i18n;
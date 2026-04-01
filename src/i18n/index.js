import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import te from './locales/te/translation.json';

const savedLanguage = localStorage.getItem('appLanguage') || 'en'; // ← Reads saved lang

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
    },
    lng: savedLanguage,        // ← Uses saved language on startup
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
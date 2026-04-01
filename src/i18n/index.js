import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import te from './locales/te/translation.json';
import ta from './locales/ta/translation.json';
import kn from './locales/kn/translation.json';
import ml from './locales/ml/translation.json';
import bn from './locales/bn/translation.json';
import mr from './locales/mr/translation.json';

const savedLanguage = localStorage.getItem('appLanguage') || 'en'; // ← Reads saved lang

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      kn: { translation: kn },
      ml: { translation: ml },
      bn: { translation: bn },
      mr: { translation: mr },
    },
    lng: savedLanguage,        // ← Uses saved language on startup
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
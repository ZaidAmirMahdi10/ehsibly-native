import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-react-native-language-detector';

import en from './src/locales/en.json';
import ar from './src/locales/ar.json';
import ckb from './src/locales/ckb.json';

i18n
  .use(LanguageDetector) 
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      // Sorani (Central) Kurdish — Arabic script, RTL, the Kurdish standard in Iraq.
      ckb: { translation: ckb },
    },
    lng: 'ar',            // 👈 force default language Arabic
    fallbackLng: 'ar',    // 👈 fallback also Arabic
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

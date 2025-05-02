import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { getOptions } from './settings';

const options = getOptions();

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...options,
    debug: process.env.NODE_ENV === 'development',
    backend: {
      loadPath: typeof window !== 'undefined' 
        ? `${window.location.origin}/locales/{{lng}}/{{ns}}.json` 
        : '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['path', 'cookie', 'htmlTag'],
      caches: ['cookie'],
      lookupCookie: 'NEXT_LOCALE',
      lookupFromPathIndex: 0,
    },
  });

export default i18n;

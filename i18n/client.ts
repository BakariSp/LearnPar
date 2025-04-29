import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    ns: ['common'],
    defaultNS: 'common',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: typeof window !== 'undefined'
        ? `${window.location.origin}/locales/{{lng}}/{{ns}}.json`
        : '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['path', 'cookie', 'htmlTag'],
      caches: ['cookie'],
      lookupCookie: 'NEXT_LOCALE',
    },
  });

export default i18n;

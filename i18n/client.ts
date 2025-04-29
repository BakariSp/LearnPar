// i18n/client.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    ns: ['common'],
    defaultNS: 'common',
    debug: process.env.NODE_ENV === 'development', // 开发时打开debug
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // 如果以后有BASE_PATH，可以动态处理
    },
    detection: {
      order: ['path', 'cookie', 'htmlTag'],
      caches: ['cookie'], // 记住用户切换的语言
      lookupCookie: 'NEXT_LOCALE', // (可选) 自定义cookie名，和Next.js保持一致
    },
  });
  i18n.on('failedLoading', (lng, ns, msg) => {
    console.error(`[i18n] failed to load ${ns} for ${lng}: ${msg}`);
  });
export default i18n;

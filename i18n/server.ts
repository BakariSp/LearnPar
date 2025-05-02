import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getOptions } from './settings';
import fs from 'fs';
import path from 'path';

// This function loads the JSON translation files directly from the filesystem
// instead of relying on HTTP requests or dynamic imports
const loadResources = async (language: string, namespace: string) => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'locales', language, `${namespace}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Failed to load translation file: ${language}/${namespace}`, error);
    return {};
  }
};

const initI18next = async (lang: string, ns: string) => {
  const i18nInstance = createInstance();
  const options = getOptions(lang, ns);
  
  // Load resources manually
  const resources = {
    [lang]: {
      [ns]: await loadResources(lang, ns)
    }
  };

  await i18nInstance
    .use(initReactI18next)
    .init({
      ...options,
      resources,
      lng: lang,
      ns: [ns],
    });
    
  return i18nInstance;
};

export async function getTranslation(lang: string, ns: string, options: { keyPrefix?: string } = {}) {
  const i18nextInstance = await initI18next(lang, ns);
  return {
    t: i18nextInstance.getFixedT(lang, ns, options.keyPrefix),
    i18n: i18nextInstance
  };
} 
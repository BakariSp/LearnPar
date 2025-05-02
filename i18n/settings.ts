// settings.ts
export const fallbackLng = 'en';
export const supportedLngs = ['en', 'zh'];
export const defaultNS = 'common';

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    // debug: process.env.NODE_ENV === 'development',
    supportedLngs,
    fallbackLng,
    lng,
    ns,
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
  };
}
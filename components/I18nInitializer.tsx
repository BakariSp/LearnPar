'use client';
import { useEffect } from 'react';
import i18n from '../i18n/client';

export default function I18nInitializer() {
  useEffect(() => {
    // Add event listeners for debugging
    if (process.env.NODE_ENV === 'development') {
      i18n.on('initialized', () => {
        console.log('i18n initialized successfully');
      });
      
      i18n.on('languageChanged', (lng) => {
        console.log(`Language changed to: ${lng}`);
      });
      
      i18n.on('failedLoading', (lng, ns, msg) => {
        console.error(`Failed loading i18n resource: ${lng}/${ns}`, msg);
      });
      
      i18n.on('loaded', (loaded) => {
        console.log(`i18n resources loaded:`, loaded);
      });
    }
  }, []);
  
  return null;
}
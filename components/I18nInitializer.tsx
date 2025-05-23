'use client';
import { useEffect } from 'react';
import i18n from '../i18n/client';

export default function I18nInitializer() {
  useEffect(() => {
    // 确保 i18n 已经初始化
    if (!i18n.isInitialized) {
      i18n.init();
    }

    // 添加事件监听器用于调试
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

    // 清理函数
    return () => {
      if (process.env.NODE_ENV === 'development') {
        i18n.off('initialized');
        i18n.off('languageChanged');
        i18n.off('failedLoading');
        i18n.off('loaded');
      }
    };
  }, []);
  
  return null;
}
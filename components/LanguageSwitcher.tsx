'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // ⏳ 等待客户端渲染完毕后再显示内容
  }, []);

  if (!isMounted) return null; // 🚫 SSR 阶段不渲染，避免 mismatch

  const currentLocale = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const newLocale = currentLocale === 'en' ? 'zh' : 'en';

  const handleClick = () => {
    const segments = pathname.replace(/^\/+/, '').split('/');
    segments[0] = newLocale;
    const newPath = '/' + segments.join('/');

    i18n.changeLanguage(newLocale);
    window.location.replace(newPath);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '0.5rem 1rem',
        background: '#eee',
        border: '1px solid #aaa',
        borderRadius: '5px',
      }}
    >
      {currentLocale === 'en' ? '中文' : 'English'}
    </button>
  );
}

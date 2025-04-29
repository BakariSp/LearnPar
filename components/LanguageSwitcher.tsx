'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { i18n } = useTranslation();

  const currentLocale = i18n.language === 'zh' ? 'zh' : 'en'; // 防止 i18n 返回 zh-CN 等
  const newLocale = currentLocale === 'en' ? 'zh' : 'en';

  const handleClick = () => {
    const segments = pathname.split('/');
    segments[1] = newLocale; // 替换 locale segment
    const newPath = segments.join('/');

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

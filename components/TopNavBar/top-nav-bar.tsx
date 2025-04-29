'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext'; // Adjust path as necessary
import styles from '../../app/[locale]/landing-page/landing-page.module.css'; // Import styles
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface TopNavBarProps {
  locale: string;
}

export function TopNavBar({ locale }: TopNavBarProps) {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  return (
    <nav className={styles.navbar}>
      {/* Left side: Logo/Brand */}
      <Link href={user ? `/${locale}/dashboard` : `/${locale}`} className={styles.navbarBrand}>
        Zero AI
      </Link>

      {/* Right side: LanguageSwitcher + Login/User Info */}
      <div className={styles.navbarActions} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* --- Language Switcher 插在这里 --- */}
        <LanguageSwitcher />

        {user ? (
          <Link href={`/${locale}/dashboard`} className="flex items-center text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-accent, #f59e0b)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              {user.email ? user.email[0].toUpperCase() : '?'}
            </span>
          </Link>
        ) : (
          <Link
            href={`/${locale}/login`}
            className={styles.loginButton}
          >
            {t('login.button')}
          </Link>
        )}
      </div>
    </nav>
  );
}

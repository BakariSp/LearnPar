'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import styles from '../../login/login.module.css';

interface OAuthErrorPageProps {
  params: Promise<{ locale: string }>;
}

export default function OAuthErrorPage({ params }: OAuthErrorPageProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [errorDescription, setErrorDescription] = useState<string>('');
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    params.then(resolvedParams => {
      setLocale(resolvedParams.locale);
    });

    const errorParam = searchParams?.get('error');
    const errorDescParam = searchParams?.get('error_description');
    
    if (errorParam) {
      setError(errorParam);
    }
    
    if (errorDescParam) {
      setErrorDescription(decodeURIComponent(errorDescParam));
    }
  }, [params, searchParams]);

  const handleGoBack = () => {
    router.push(`/${locale}/login`);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>{t('oauth.error.title', 'Authentication Error')}</h1>
        
        <div className={styles.errorMessage}>
          <p>{t('oauth.error.message', 'An error occurred during authentication:')}</p>
          <p className={styles.errorCode}>{error}</p>
          {errorDescription && (
            <p className={styles.errorDescription}>{errorDescription}</p>
          )}
        </div>
        
        <button 
          className={styles.loginButton} 
          onClick={handleGoBack}
        >
          {t('oauth.error.backToLogin', 'Back to Login')}
        </button>
      </div>
    </div>
  );
} 
'use client';
import { useTranslation } from 'react-i18next';
import { useIsClient } from '@/hooks/useIsClient';
import { useState, useEffect } from 'react';
import styles from './login.module.css';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
  const isClient = useIsClient();
  const { t } = useTranslation('common');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale || 'en';
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for OAuth error parameters
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      let errorMsg = t('login.oauth_error');
      if (errorDescription) {
        errorMsg += `: ${decodeURIComponent(errorDescription)}`;
      }
      setError(errorMsg);
    }
  }, [searchParams, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      await login(credentials);
      router.push(`/${locale}/`);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the backend URL from environment variable or use a fallback
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // For OAuth endpoints, use the appropriate URL based on environment
  const getOAuthUrl = (provider: string) => {
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development' && backendBaseUrl.includes('localhost')) {
      return `${backendBaseUrl}/oauth/${provider}`;
    }
    // In production, use the Azure URL
    return `https://zero-ai-d9e8f5hgczgremge.westus-01.azurewebsites.net/oauth/${provider}`;
  };

  const handleGoogleLogin = () => {
    window.location.href = getOAuthUrl('google');
  };

  const handleMicrosoftLogin = () => {
    window.location.href = getOAuthUrl('microsoft');
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {isClient && <h1 className={styles.loginTitle}>{t('login.title')}</h1>}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.oauthButtons}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`${styles.oauthButton} ${styles.googleButton}`}
          >
            <span className={styles.oauthIcon}>G</span>
            {isClient && t('login.google')}
          </button>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            className={`${styles.oauthButton} ${styles.microsoftButton}`}
          >
            <span className={styles.oauthIcon}>M</span>
            {isClient && t('login.microsoft')}
          </button>
        </div>

        <div className={styles.divider}>
          <span>{isClient && t('login.or')}</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">{isClient && t('login.username')}</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              className={styles.inputField}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">{isClient && t('login.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              className={styles.inputField}
            />
          </div>

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isClient && (isLoading ? t('login.logging_in') : t('login.button'))}
          </button>
        </form>

        <div className={styles.registerLink}>
          {isClient && (
            <>
              {t('login.no_account')} <Link href={`/${locale}/register`}>{t('login.register')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useTranslation } from 'react-i18next';

import { useState } from 'react';
import styles from './login.module.css';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation('common');
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const params = useParams(); // ✅ 正确拿 params
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(credentials);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Use the deployed backend URL for OAuth initiation
  const backendBaseUrl = 'https://zero-ai-d9e8f5hgczgremge.westus-01.azurewebsites.net'; // Replace if needed, or use env variable

  const handleGoogleLogin = () => {
    window.location.href = `${backendBaseUrl}/oauth/google`;
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${backendBaseUrl}/oauth/microsoft`;
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>{t('login.title')}</h1>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.oauthButtons}>
          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className={`${styles.oauthButton} ${styles.googleButton}`}
          >
            <span className={styles.oauthIcon}>G</span>
            {t('login.google')}
          </button>
          
          <button 
            type="button" 
            onClick={handleMicrosoftLogin}
            className={`${styles.oauthButton} ${styles.microsoftButton}`}
          >
            <span className={styles.oauthIcon}>M</span>
            {t('login.microsoft')}
          </button>
        </div>
        
        <div className={styles.divider}>
          <span>{t('login.or')}</span>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">{t('login.username')}</label>
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
            <label htmlFor="password">{t('login.password')}</label>
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
            {isLoading ? t('login.logging_in') : t('login.button')}
          </button>
        </form>
        
        <div className={styles.registerLink}>
          {t('login.no_account')} <Link href={`/${locale}/register`}>{t('login.register')}</Link>
        </div>
      </div>
    </div>
  );
}
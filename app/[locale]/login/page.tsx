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
  const router = useRouter();
  const locale = 'en'; // Replace with your locale logic
  
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for OAuth error parameters
    const error = searchParams?.get('error');
    const errorDescription = searchParams?.get('error_description');
    
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
    setIsLoading(true);
    setError(null);
    
    console.log('Login Page: Login attempt started for:', credentials.username);
    
    try {
      // Use direct window location instead of router for more reliable page refresh
      await login(credentials);
      
      // The login function in AuthContext now handles the redirect using window.location
      // so we don't need to do router.push here
      
      // For debugging purposes - we should never reach this point if login is successful
      // since AuthContext's login function will redirect
      console.log('Login Page: Login successful but no redirect occurred');
    } catch (err: any) {
      console.error('Login Page: Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
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

  const openPasswordLogin = () => setShowPasswordLogin(true);
  const closePasswordLogin = () => setShowPasswordLogin(false);

  return (
    <div className={styles.loginContainer}>
      <nav className={styles.topBar}>
        <div className={styles.navbar}>
          <div className={styles.navbarBrand}>
            <Link href={`/${locale}`} className={styles.logoLink}>
              <span className={styles.logoText}>Zero AI</span>
            </Link>
          </div>
          <div className={styles.navbarActions}>
            <Link href={`/${locale}/login`} className={styles.navButton}>
              Login
            </Link>
          </div>
        </div>
      </nav>
      
      <div className={styles.mainContent}>
        <div className={styles.loginCard}>
          {isClient && <h1 className={styles.loginTitle}>Welcome Back!</h1>}
          
          <div className={styles.loginSubtitle}>
            {isClient && (
              <>
                Don't have an account? <Link href={`/${locale}/register`}>Sign up</Link> or use Google/Microsoft below
              </>
            )}
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.oauthButtons}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`${styles.oauthButton} ${styles.googleButton}`}
            >
              <span className={styles.oauthIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#4285F4">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </span>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              className={`${styles.oauthButton} ${styles.microsoftButton}`}
            >
              <span className={styles.oauthIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              </span>
              Continue with Microsoft
            </button>
          </div>

          <div className={styles.oauthNote}>
            {isClient && (
              <p>New users will be automatically registered when using Google or Microsoft login</p>
            )}
          </div>

          <div className={styles.passwordLoginLink}>
            <button onClick={openPasswordLogin}>
              {isClient && "Use email and password instead"}
            </button>
          </div>
        </div>
      </div>

      {showPasswordLogin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isClient && "Login with Password"}</h2>
              <button className={styles.closeButton} onClick={closePasswordLogin}>×</button>
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
                  placeholder="Enter email"
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
                  placeholder="Enter password"
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
          </div>
        </div>
      )}
    </div>
  );
}

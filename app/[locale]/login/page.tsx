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
  const locale = useParams()?.locale as string || 'en';
  
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [signUpData, setSignUpData] = useState({ email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loginWithGoogle, loginAnonymously, isAuthenticated, authReady } = useAuth();
  const searchParams = useSearchParams();

  // Add effect to redirect if already authenticated
  useEffect(() => {
    if (isClient && authReady && isAuthenticated) {
      console.log('[Login Page Debug] User already authenticated');
      // 移除自动重定向到 home 的逻辑
      // 让 AuthContext 处理重定向
    }
  }, [isClient, authReady, isAuthenticated, router, locale]);

  // Update effect to only clear relevant tokens, not legacy ones
  useEffect(() => {
    if (isClient) {
      // Clear any existing tokens when the login page loads
      // This helps prevent auth state conflicts
      console.log('Login Page: Clearing any existing tokens on page load');
      
      try {
        // Clear userId but not legacy auth_token
        localStorage.removeItem('userId');
        console.log('Login Page: Existing tokens cleared successfully');
      } catch (err) {
        console.error('Login Page: Error clearing tokens:', err);
      }
    }
  }, [isClient]);

  useEffect(() => {
    // Check for OAuth error parameters
    const error = searchParams?.get('error');
    const errorDescription = searchParams?.get('error_description');
    
    if (error) {
      let errorMsg = '';
      
      // Handle specific error types
      if (error === 'session_expired') {
        errorMsg = t('login.session_expired') || 'Your session has expired. Please log in again.';
      } else if (error === 'auth_check_failed') {
        errorMsg = t('login.auth_check_failed') || 'Authentication check failed. Please log in again.';
      } else if (errorDescription) {
        errorMsg = `${t('login.oauth_error')}: ${decodeURIComponent(errorDescription)}`;
      } else {
        errorMsg = t('login.oauth_error') || 'An error occurred during authentication';
      }
      
      setError(errorMsg);
      
      // Clean up the URL by removing the error parameter to prevent showing the error again on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, t]);

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    console.log('Login Page: Login attempt started for:', credentials.username);
    
    try {
      // Call login function from AuthContext
      await login(credentials);
      
      // The login function in AuthContext now handles the redirect
      console.log('Login Page: Login successful');
      
      // Improved fallback navigation using window.location
      setTimeout(() => {
        if (window.location.pathname.includes('/login')) {
          console.log('Login Page: Manual redirect to home after login');
          // Use replace for cleaner navigation history
          router.replace(`/${locale}/home`);
          
          // Ultimate fallback using direct location change
          setTimeout(() => {
            if (window.location.pathname.includes('/login')) {
              console.log('Login Page: Final fallback redirect');
              window.location.href = `/${locale}/home`;
            }
          }, 300);
        }
      }, 500); // Longer timeout to allow AuthContext redirect to happen first
    } catch (err: any) {
      console.error('Login Page: Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validate password match
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      // Call the Supabase signup function directly or through context
      const { signUpWithEmail } = await import('../../../services/supabase');
      await signUpWithEmail(signUpData.email, signUpData.password);
      
      // Show success message and switch to login
      setError(null);
      setShowSignUp(false);
      setShowPasswordLogin(true);
      setCredentials({ username: signUpData.email, password: '' });
      alert('Account created successfully! Please check your email for verification link.');
    } catch (err: any) {
      console.error('Sign up failed:', err);
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle().catch(err => {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to initiate Google login');
    });
  };

  const openPasswordLogin = () => {
    setShowSignUp(false);
    setShowPasswordLogin(true);
  };
  
  const openSignUp = () => {
    setShowPasswordLogin(false);
    setShowSignUp(true);
  };
  
  const closeModal = () => {
    setShowPasswordLogin(false);
    setShowSignUp(false);
  };

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
                Don't have an account? <a href="#" onClick={openSignUp}>Sign up</a> or use Google below
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
          </div>

          <div className={styles.oauthNote}>
            {isClient && (
              <p>New users will be automatically registered when using Google login</p>
            )}
          </div>
          <div className={styles.passwordLoginLink}>
            <button onClick={openPasswordLogin}>
              {isClient && "Sign in with email and password"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Login Modal */}
      {showPasswordLogin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isClient && "Login with Email"}</h2>
              <button className={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <div className={styles.formGroup}>
                <label htmlFor="username">{isClient && "Email"}</label>
                <input
                  type="email"
                  id="username"
                  name="username"
                  value={credentials.username}
                  onChange={handleCredentialsChange}
                  required
                  className={styles.inputField}
                  placeholder="Enter your email"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">{isClient && "Password"}</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleCredentialsChange}
                  required
                  className={styles.inputField}
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                className={styles.loginButton}
                disabled={isLoading}
              >
                {isClient && (isLoading ? "Signing in..." : "Sign In")}
              </button>
              
              <div className={styles.registerLink}>
                Don't have an account? <a href="#" onClick={openSignUp}>Sign up now</a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isClient && "Create an Account"}</h2>
              <button className={styles.closeButton} onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSignUp} className={styles.loginForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={signUpData.email}
                  onChange={handleSignUpChange}
                  required
                  className={styles.inputField}
                  placeholder="Enter your email"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={signUpData.password}
                  onChange={handleSignUpChange}
                  required
                  className={styles.inputField}
                  placeholder="Create a password"
                  minLength={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={signUpData.confirmPassword}
                  onChange={handleSignUpChange}
                  required
                  className={styles.inputField}
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                className={styles.loginButton}
                disabled={isLoading}
              >
                {isClient && (isLoading ? "Creating Account..." : "Create Account")}
              </button>
              
              <div className={styles.registerLink}>
                Already have an account? <a href="#" onClick={openPasswordLogin}>Sign in</a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debug link to help with navigation testing - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-500 mb-2">DEBUG LINKS</div>
          <div className="flex justify-center space-x-4">
            <a href={`/${locale}/dashboard?debug_auth=bypass`} className="text-blue-500 underline">
              Direct to Dashboard
            </a>
            <a href={`/${locale}/setup?debug_auth=bypass`} className="text-blue-500 underline">
              Direct to Setup
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

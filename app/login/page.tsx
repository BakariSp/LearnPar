'use client';

import { useState } from 'react';
import styles from './login.module.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

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
        <h1 className={styles.loginTitle}>Log In</h1>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.oauthButtons}>
          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className={`${styles.oauthButton} ${styles.googleButton}`}
          >
            <span className={styles.oauthIcon}>G</span>
            Sign in with Google
          </button>
          
          <button 
            type="button" 
            onClick={handleMicrosoftLogin}
            className={`${styles.oauthButton} ${styles.microsoftButton}`}
          >
            <span className={styles.oauthIcon}>M</span>
            Sign in with Microsoft
          </button>
        </div>
        
        <div className={styles.divider}>
          <span>OR</span>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Username</label>
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
            <label htmlFor="password">Password</label>
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
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className={styles.registerLink}>
          Don't have an account? <Link href="/register">Register</Link>
        </div>
      </div>
    </div>
  );
} 
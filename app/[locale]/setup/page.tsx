'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './setup.module.css';
import { updateUserProfile } from '@/services/user';
import { setSetupCompleteStatus, getCurrentUser } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import TermsModal from './components/TermsModal';
import PrivacyModal from './components/PrivacyModal';
import { getSupabaseToken } from '@/services/supabase';

// Setup steps
enum SetupStep {
  Welcome = 1,
}

export default function SetupPage() {
  const router = useRouter();
  const { user: authUser, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.Welcome);
  const [nickname, setNickname] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locale, setLocale] = useState('en');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Get user data when page loads and determine locale
  useEffect(() => {
    // Extract locale from URL
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const localeMatch = path.match(/^\/([a-z]{2})\//);
      if (localeMatch && localeMatch[1]) {
        setLocale(localeMatch[1]);
      }
    }

    const fetchUserData = async () => {
      const user = await getCurrentUser();
      if (user && user.username) {
        setNickname(user.username);
      }
    };
    
    fetchUserData();
  }, []);

  // Populate nickname from auth context if available
  useEffect(() => {
    if (authUser && authUser.username) {
      setNickname(authUser.username);
    }
  }, [authUser]);

  const handleContinue = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }
    setError('');
    handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Debug: Check authentication state
      console.log('Current auth user:', authUser);
      const token = await getSupabaseToken();
      console.log('Supabase token:', token ? 'Present' : 'Missing');

      await updateUserProfile({
        username: nickname,
      });
      
      // Set setup as complete
      setSetupCompleteStatus(true);
      
      // Force a refresh of the page to ensure the middleware reads the updated cookie
      if (typeof window !== 'undefined') {
        // Use window.location.href to force a full page reload
        window.location.href = `/${locale}/home`;
      } else {
        // Fallback to router.push if window is not available (shouldn't happen in browser)
        router.push(`/${locale}/home`);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTermsModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTermsModalOpen(true);
  };

  const openPrivacyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPrivacyModalOpen(true);
  };

  return (
    <div className={styles.setupContainer}>
      <div className={styles.headerLogo}>
        <div className={styles.logoContainer}>
          <div className={styles.logoCircle}></div>
          <span className={styles.logoText}>Zero AI</span>
        </div>
      </div>

      <div className={styles.stepsIndicator}>
        <div className={`${styles.step} ${styles.active}`}>
          1
        </div>
      </div>

      <div className={styles.setupCard}>
        <div className={styles.welcomeStep}>
          <h1>How should we call you by?</h1>
          <input
            type="text"
            placeholder="Enter nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.inputField}
          />

          <div className={styles.termsContainer}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="termsCheckbox"
                checked={agreeTerms}
                onChange={() => setAgreeTerms(!agreeTerms)}
              />
              <label htmlFor="termsCheckbox">
                I agree to the <a onClick={openTermsModal}>Terms of Service</a> and{' '}
                <a onClick={openPrivacyModal}>Privacy Policy</a>
              </label>
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.buttonContainer}>
          <button
            className={styles.continueButton}
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
} 
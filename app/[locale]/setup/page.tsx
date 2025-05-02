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

// Setup steps
enum SetupStep {
  Welcome = 1,
  Interests = 2,
}

export default function SetupPage() {
  const router = useRouter();
  const { user: authUser, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.Welcome);
  const [nickname, setNickname] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
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
      if (user && user.interests && user.interests.length > 0) {
        setSelectedInterests(user.interests);
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

  const interestOptions = [
    { id: 'tech_basics', label: 'Build with Tech', icon: '🛠️' },                  // Covers coding, tools, web
    { id: 'ai_data', label: 'AI & Data Thinking', icon: '🤖' },                   // A more exciting AI framing
    { id: 'creative_worlds', label: 'Design & Creativity', icon: '🎨' },          // Broader than just art/design
    { id: 'business_mind', label: 'Money & Startup Mindset', icon: '💼' },        // Combines biz + personal finance
    { id: 'speak_express', label: 'Language & Expression', icon: '🗣️' },         // Sounds more playful
    { id: 'self_growth', label: 'Grow Yourself', icon: '🌱' },                    // For soft skills, habits, mental models
    { id: 'mind_body', label: 'Mind & Health', icon: '🧠' },                      // Psychology, well-being
    { id: 'deep_thoughts', label: 'Philosophy & Big Questions', icon: '🌀' },     // For meaning, ethics, metaphysics
    { id: 'earth_universe', label: 'Planet & Space Wonders', icon: '🪐' },        // Nature, animals, astronomy
    { id: 'wildcards', label: 'Curious & Random', icon: '✨' }                    // A catch-all for niche/random interests
  ]
  

  const handleContinue = () => {
    if (currentStep === SetupStep.Welcome) {
      if (!nickname.trim()) {
        setError('Please enter a nickname');
        return;
      }
      if (!agreeTerms) {
        setError('Please agree to the terms and conditions');
        return;
      }
      setError('');
      setCurrentStep(SetupStep.Interests);
    } else if (currentStep === SetupStep.Interests) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateUserProfile({
        username: nickname,
        interests: selectedInterests,
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

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleBack = () => {
    if (currentStep === SetupStep.Interests) {
      setCurrentStep(SetupStep.Welcome);
    }
  };

  const handleSkip = () => {
    // First step cannot be skipped - must accept terms
    if (currentStep === SetupStep.Welcome) {
      setError('Please enter your nickname and agree to the terms before continuing');
      return;
    }
    
    setSetupCompleteStatus(true);
    // Force a refresh of the page to ensure the middleware reads the updated cookie
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}/home`;
    } else {
      router.push(`/${locale}/home`);
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
      {currentStep !== SetupStep.Welcome && (
        <button className={styles.skipButton} onClick={handleSkip}>
          Skip
        </button>
      )}
      
      <div className={styles.headerLogo}>
        <div className={styles.logoContainer}>
          <div className={styles.logoCircle}></div>
          <span className={styles.logoText}>Zero AI</span>
        </div>
      </div>

      <div className={styles.stepsIndicator}>
        <div className={`${styles.step} ${currentStep >= SetupStep.Welcome ? styles.active : ''}`}>
          1
        </div>
        <div className={`${styles.step} ${currentStep >= SetupStep.Interests ? styles.active : ''}`}>
          2
        </div>
      </div>

      <div className={styles.setupCard}>
        {currentStep === SetupStep.Welcome && (
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
        )}

        {currentStep === SetupStep.Interests && (
          <div className={styles.interestsStep}>
            <h1>What subject or skill are you interested in?</h1>
            <div className={styles.interestsGrid}>
              {interestOptions.map((interest) => (
                <div
                  key={interest.id}
                  className={`${styles.interestItem} ${
                    selectedInterests.includes(interest.id) ? styles.selected : ''
                  }`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  <span className={styles.interestIcon}>{interest.icon}</span>
                  <span className={styles.interestLabel}>{interest.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.buttonContainer}>
          {currentStep === SetupStep.Interests && (
            <button className={styles.backButton} onClick={handleBack}>
              Back
            </button>
          )}
          <button
            className={styles.continueButton}
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : currentStep === SetupStep.Welcome ? 'Continue' : 'Submit'}
          </button>
        </div>
      </div>

      <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
      <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
} 
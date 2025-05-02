'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { isAuthenticated } from '@/services/auth';
import LearningPathLayout from '../../components/LearningPathLayout';
import { useLearningPath } from '../../hooks/useLearningPath';
import { apiAddToMyLearningPaths } from '@/services/api';
import styles from '../../styles';
import { SuccessAnimation } from '../../../../../app/components';

// Simplified view for recommendations
export default function LearningPathRecommendationPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const router = useRouter();
  
  // Safe extraction of locale and ID with fallbacks
  const locale = params?.locale ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) : 'en';
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

  // Notification state for success messages
  const [notification, setNotification] = useState<{ message: string } | null>(null);
  // Loading state for the add button
  const [isAddingPath, setIsAddingPath] = useState(false);
  // Page entrance animation state
  const [isPageEntering, setIsPageEntering] = useState(true);
  // Navigation animation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRedirectPath, setSuccessRedirectPath] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Page entrance animation effect
  useEffect(() => {
    // Set a timeout to remove the entrance animation
    const timer = setTimeout(() => {
      setIsPageEntering(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Use the custom hook to handle most of the learning path logic
  const {
    learningPathData,
    expandedItems,
    expandedSections,
    selectedCard,
    currentSectionId,
    currentSectionCards,
    currentCardIndex,
    isLoading,
    error,
    toggleCourseExpand,
    toggleSectionExpand,
    handleCardSelect,
    navigateToPreviousCard,
    navigateToNextCard,
    hasPreviousCard,
    hasNextCard,
  } = useLearningPath({ id });

  const isLoggedIn = isAuthenticated();

  // Handle success after adding to my paths
  const handleAddSuccess = () => {
    setNotification({ message: 'Learning path added to your collection' });
    
    // Set success animation state
    setSuccessMessage('Learning path added to your collection');
    setSuccessRedirectPath(`/${locale}/my-paths`);
    setShowSuccessAnimation(true);
  };

  // Handle adding to my paths using the API
  const handleAddToMyPaths = async () => {
    if (!learningPathData) return;
    
    setIsAddingPath(true);
    try {
      const success = await apiAddToMyLearningPaths(learningPathData.id);
      
      if (success) {
        handleAddSuccess();
      }
    } catch (error: any) {
      // Check if the error is because the path is already in the user's collection
      if (error.message && error.message.includes('already in your account')) {
        setNotification({ message: 'This learning path is already in your collection' });
        
        // Set success animation for navigation even in this case
        setSuccessMessage('This learning path is already in your collection');
        setSuccessRedirectPath(`/${locale}/my-paths`);
        setShowSuccessAnimation(true);
      } else {
        setNotification({ message: error.message || 'Failed to add to your learning paths' });
        
        // Clear error notification after a delay
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    } finally {
      setIsAddingPath(false);
    }
  };

  // Handle login redirect if user isn't logged in
  const handleLoginRedirect = () => {
    // Store the current path to redirect back after login
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    
    // Set navigating state for animation
    setIsNavigating(true);
    
    // Add delay for animation
    setTimeout(() => {
      router.push(`/${locale}/login`);
    }, 300);
  };

  // Handle going back
  const handleBack = () => {
    // Set navigating state for animation
    setIsNavigating(true);
    
    // Add delay for animation
    setTimeout(() => {
      router.back();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className={`${styles.loading} ${isPageEntering ? styles.fadeIn : ''}`}>
        <div className={styles.spinner}></div>
        <div className={styles.loadingText}>Loading recommended learning path...</div>
      </div>
    );
  }

  return (
    <>
      {showSuccessAnimation && (
        <SuccessAnimation 
          message={successMessage}
          redirectPath={successRedirectPath}
          delay={2000}
        />
      )}
      <div className={isNavigating ? styles.fadeOut : ''}>
        {notification && (
          <div 
            style={{
              position: 'fixed',
              top: '20px', 
              right: '20px',
              padding: '12px 16px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              animation: 'fadeIn 0.3s ease-in-out'
            }}
          >
            {notification.message}
          </div>
        )}
        
        <LearningPathLayout
          isLoading={isLoading}
          error={error}
          learningPathData={learningPathData}
          expandedItems={expandedItems}
          expandedSections={expandedSections}
          selectedCard={selectedCard}
          currentSectionId={currentSectionId}
          currentSectionCards={currentSectionCards}
          currentCardIndex={currentCardIndex}
          toggleCourseExpand={toggleCourseExpand}
          toggleSectionExpand={toggleSectionExpand}
          handleCardSelect={handleCardSelect}
          navigateToPreviousCard={navigateToPreviousCard}
          navigateToNextCard={navigateToNextCard}
          handleAddToMyPaths={handleAddToMyPaths}
          handleLoginRedirect={handleLoginRedirect}
          onAddSuccess={handleAddSuccess}
          hasPreviousCard={hasPreviousCard}
          hasNextCard={hasNextCard}
          showAddButton={true}
          showDeleteButton={false} // Hide delete button in recommendation view
          locale={locale}
          onBack={handleBack}
        />
      </div>
    </>
  );
} 
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { isAuthenticated } from '@/services/auth';
import LearningPathLayout from '../../components/LearningPathLayout';
import { useLearningPath } from '../../hooks/useLearningPath';
import { apiAddToMyLearningPaths } from '@/services/api';

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
    
    // Clear notification after a delay
    setTimeout(() => {
      setNotification(null);
      
      // Optionally redirect to the user's learning paths page after a delay
      setTimeout(() => {
        router.push(`/${locale}/my-paths`);
      }, 1000);
    }, 2000);
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
        
        // Clear notification after a delay
        setTimeout(() => {
          setNotification(null);
          
          // Redirect to the user's learning paths page after a short delay
          setTimeout(() => {
            router.push(`/${locale}/my-paths`);
          }, 1000);
        }, 2000);
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
    router.push(`/${locale}/login`);
  };

  // Handle going back
  const handleBack = () => {
    router.back();
  };

  return (
    <>
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
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
    </>
  );
} 
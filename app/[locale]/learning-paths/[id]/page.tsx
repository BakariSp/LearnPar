'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for potential back button
import { useTranslation } from 'react-i18next';
import {
  apiGetFullLearningPath,
  apiGetLatestTaskForLearningPath,
  apiGetSectionWithCards,
  FullLearningPathResponse,
  TaskStatusResponse,
  CourseResponse,
  SectionResponse,
  CardResponse,
  CardResource,
  NextItemInfo,
  CompletionInfo,
} from '@/services/api'; // Adjust path as needed
import styles from './learning-path-detail.module.css';
import LearningPathLayout from '../components/LearningPathLayout';
import { useLearningPath } from '../hooks/useLearningPath';
// Optional: Import an icon library if you want icons for status
// import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

// type ViewMode = 'structure' | 'card' | 'completion'; // Will be removed

// Import InternalViewMode from the hook
import type { InternalViewMode } from '../hooks/useLearningPath';

export default function LearningPathDetailPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params && Array.isArray(params.locale) ? params.locale[0] : (params?.locale as string) || 'en';
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

  // Use our enhanced hook instead of managing state manually
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
    setExpandedItems,
    setExpandedSections,
    toggleCardCompletion,
    calculateSectionProgress,
    calculateCourseProgress,
    calculateLearningPathProgress,
    updateProgressData,
    fetchLearningPathData,
    // Add new items from hook
    internalViewMode,
    proceedToNextContent,
    resetToCardView,
    pendingCardToggles,
  } = useLearningPath({ id });

  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null); // State for task status
  const [isFetchingStatus, setIsFetchingStatus] = useState(false); // Separate loading state for status
  // const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('structure'); // Remove this line
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  // Add a ref to store the polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialProgressCalculation = useRef(false);

  // Helper function to check if a task is active (running)
  const isTaskActive = useCallback((status: TaskStatusResponse | null): boolean => {
    return !!status && ['pending', 'queued', 'starting', 'running'].includes(status.status);
  }, []);

  // Helper function to check if task is specifically generating cards
  const isGeneratingCards = useCallback((status: TaskStatusResponse | null): boolean => {
    return isTaskActive(status) && status?.stage === 'generating_cards';
  }, [isTaskActive]);

  // Helper function to fetch the latest task status
  const fetchTaskStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      console.log(`Fetching task status for learning path ${id}...`);
      const status = await apiGetLatestTaskForLearningPath(parseInt(String(id), 10));
      console.log(`Got task status:`, status);
      
      if (status) {
        setTaskStatus(status);
        
        // If the task is completed, refresh the learning path data
        if (status.status === 'completed' && status.learning_path_id) {
          console.log('Task completed, refreshing data...');
          // No need to call anything since we're just polling for status
        }
      }
    } catch (error) {
      console.error(`Error fetching task status for learning path ${id}:`, error);
    }
  }, [id]);

  // When the component mounts, initialize progress tracking
  useEffect(() => {
    // Check the query parameters after path data is loaded
    if (learningPathData) {
      const targetSectionIdStr = searchParams?.get('section');
      const targetCardIdStr = searchParams?.get('card');

      if (targetSectionIdStr && targetCardIdStr) {
        const targetSectionId = parseInt(targetSectionIdStr, 10);
        const targetCardId = parseInt(targetCardIdStr, 10);

        if (!isNaN(targetSectionId) && !isNaN(targetCardId)) {
          // Find the course containing the section to expand it
          const courseContainingSection = learningPathData.courses.find(course =>
            course.sections.some(section => section.id === targetSectionId)
          );

          if (courseContainingSection) {
            // Expand necessary items
            setExpandedItems({
              ...expandedItems,
              [courseContainingSection.id]: true
            });
            
            setExpandedSections({
              ...expandedSections,
              [targetSectionId]: true
            });
          }
          
          // Find the section and target card
          const section = learningPathData.courses.flatMap(c => c.sections).find(s => s.id === targetSectionId);
          if (section && section.cards) {
            const targetCard = section.cards.find(c => c.id === targetCardId);
            if (targetCard) {
              handleCardSelect(targetCard, targetSectionId, section.cards);
            }
          }

          // Clean the URL - remove query params after processing
          router.replace(`/${locale}/learning-paths/${id}`, { scroll: false });
        }
      }
      
      // Fetch task status only once when data is loaded
      fetchTaskStatus().catch(error => {
        console.error("Error fetching task status:", error);
      });
    }
  }, [learningPathData?.id]); // Only re-run if the learning path ID changes, not on every render

  // One-time progress calculation after learning path data is loaded
  useEffect(() => {
    if (id && learningPathData && !hasInitialProgressCalculation.current) {
      hasInitialProgressCalculation.current = true;
      
      // Use a timeout to prevent blocking UI rendering
      const progressTimer = setTimeout(() => {
        try {
          // Only calculate progress if it's not already defined
          // This allows server-rendered progress values to be used if available
          if (typeof learningPathData.progress !== 'number' || isNaN(learningPathData.progress)) {
            // Check if there are any pending card toggles before updating progress
            if (!pendingCardToggles || pendingCardToggles.size === 0) {
              updateProgressData();
            } else {
              console.log("Skipping initial progress calculation due to pending card toggles");
            }
          }
        } catch (error) {
          console.error("Error during initial progress calculation:", error);
        }
      }, 2000); // Delay initial calculation to avoid overwhelming the API
      
      return () => clearTimeout(progressTimer);
    }
  }, [id, learningPathData, updateProgressData, pendingCardToggles]); 
  
  // Set up polling for task status updates if a task is active
  useEffect(() => {
    if (!id || !taskStatus || taskStatus.status === 'completed' || taskStatus.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(() => {
      try {
        fetchTaskStatus();
      } catch (error) {
        console.error("Error polling task status:", error);
      }
    }, 5000); // Poll every 5 seconds

    // Clean up the interval on unmount or when dependencies change
    return () => clearInterval(pollInterval);
  }, [id, taskStatus, fetchTaskStatus]);

  // Add this useEffect to set body class for responsive design
  useEffect(() => {
    // Add class to body for responsive CSS
    document.body.classList.add('on-learning-path-page');
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('on-learning-path-page');
    };
  }, []);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error && !learningPathData) {
    return <div className={styles.errorPage}>{t('learning_path.error')}: {error}</div>; // ✅ 加t
  }

  if (!learningPathData) {
    return <div className={styles.notFound}>{t('learning_path.not_found')}</div>; // ✅ 加t
  }

  // The main layout is always rendered. 
  // It will internally decide whether to show card, section completion, or path completion.
  return (
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
      hasPreviousCard={hasPreviousCard}
      hasNextCard={hasNextCard}
      showAddButton={false}
      showDeleteButton={false}
      statusTag={null}
      locale={locale}
      // Modified onBack to reset view to card, or navigate to dashboard if no path context
      onBack={() => {
        if (internalViewMode !== 'card' && learningPathData) {
          // If in a completion view, "onBack" could mean returning to the card view or structure.
          // For simplicity, let's make it go back to the dashboard for now,
          // or you might want a more specific "back to path structure" function.
          // This specific onBack might need its own handler if you want to go to structure view of current path.
          // A simple solution is to have a function in the hook that sets internalViewMode to 'card'.
          // Let's assume for now `onBack` from layout header means exiting the path.
          router.push(`/${locale}/dashboard`);
        } else {
          router.push(`/${locale}/dashboard`);
        }
      }}
      toggleCardCompletion={toggleCardCompletion}
      calculateSectionProgress={calculateSectionProgress}
      calculateCourseProgress={calculateCourseProgress}
      calculateLearningPathProgress={calculateLearningPathProgress}
      // Pass new props for internal view handling
      internalViewMode={internalViewMode}
      proceedToNextContent={proceedToNextContent}
      resetToCardView={resetToCardView}
      // To allow resetting to card view from a completion message if needed via a new button
      // We might need a new function from the hook like `setViewModeToCard()` or similar if 
      // the "Return to My Path" button on completion screen should show the last card.
      // For now, the proceed button moves forward, and a dashboard button exits.
      // A "Return to My Path" button in completion view could call a new function that sets internalViewMode to 'card'.
    />
  );
} 
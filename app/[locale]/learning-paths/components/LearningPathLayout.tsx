import { ReactNode, useState, useEffect } from 'react';
import { FullLearningPathResponse, CardResponse } from '@/services/api';
import LearnAssistant from '../components/LearnAssistant';
import PathNavigation from './PathNavigation';
import CardDetailView from './CardDetailView';
import styles from '../styles';

interface LearningPathLayoutProps {
  isLoading: boolean;
  error: string | null;
  learningPathData: FullLearningPathResponse | null;
  expandedItems: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  selectedCard: CardResponse | null;
  currentSectionId: number | null;
  currentSectionCards: CardResponse[];
  currentCardIndex: number;
  toggleCourseExpand: (courseId: number) => void;
  toggleSectionExpand: (sectionId: number) => void;
  handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[]) => void;
  navigateToPreviousCard: () => void;
  navigateToNextCard: () => void;
  handleAddToMyPaths?: () => void;
  handleLoginRedirect?: () => void;
  onAddSuccess?: () => void;
  hasPreviousCard: boolean;
  hasNextCard: boolean;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  statusTag?: ReactNode;
  locale?: string;
  onBack?: () => void;
}

export default function LearningPathLayout({
  isLoading,
  error,
  learningPathData,
  expandedItems,
  expandedSections,
  selectedCard,
  currentSectionId,
  currentSectionCards,
  currentCardIndex,
  toggleCourseExpand,
  toggleSectionExpand,
  handleCardSelect,
  navigateToPreviousCard,
  navigateToNextCard,
  handleAddToMyPaths,
  handleLoginRedirect,
  onAddSuccess,
  hasPreviousCard,
  hasNextCard,
  showAddButton = true,
  showDeleteButton = true,
  statusTag,
  locale = 'en',
  onBack
}: LearningPathLayoutProps) {
  const [isPageEntering, setIsPageEntering] = useState(true);

  // Page entrance animation effect
  useEffect(() => {
    // Set a timeout to remove the entrance animation
    const timer = setTimeout(() => {
      setIsPageEntering(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <div className={styles.loadingText}>Loading learning path...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.detailPageContainer}>
        <div className={`${styles.alertContainer} ${styles.alertError}`}>
          <div className={styles.alertTitle}>Error Loading Learning Path</div>
          <div className={styles.alertDescription}>{error}</div>
          <button className={`${styles.button} ${styles.primaryButton}`} onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!learningPathData) {
    return (
      <div className={styles.detailPageContainer}>
        <div className={`${styles.alertContainer} ${styles.alertWarning}`}>
          <div className={styles.alertTitle}>Learning Path Not Found</div>
          <div className={styles.alertDescription}>The requested learning path could not be found.</div>
          <button className={`${styles.button} ${styles.primaryButton}`} onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.pageContainer} ${isPageEntering ? styles.fadeIn : ''}`}>
      {/* Left navigation pane */}
      <PathNavigation
        learningPathData={learningPathData}
        expandedItems={expandedItems}
        expandedSections={expandedSections}
        selectedCard={selectedCard}
        toggleCourseExpand={toggleCourseExpand}
        toggleSectionExpand={toggleSectionExpand}
        handleCardSelect={handleCardSelect}
        handleAddToMyPaths={handleAddToMyPaths}
        handleLoginRedirect={handleLoginRedirect}
        showAddButton={showAddButton}
        statusTag={statusTag}
        locale={locale}
        onAddSuccess={onAddSuccess}
      />

      {/* Main content area */}
      <CardDetailView
        selectedCard={selectedCard}
        currentSectionCards={currentSectionCards}
        currentCardIndex={currentCardIndex}
        navigateToPreviousCard={navigateToPreviousCard}
        navigateToNextCard={navigateToNextCard}
        hasPreviousCard={hasPreviousCard}
        hasNextCard={hasNextCard}
        showDeleteButton={showDeleteButton}
      />

      {/* Learning Assistant */}
      <div className={styles.assistantContainer}>
        <LearnAssistant 
          currentCardId={selectedCard?.id || null}
          currentSectionId={currentSectionId}
        />
      </div>
    </div>
  );
} 
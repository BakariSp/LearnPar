import { ReactNode, useState, useEffect } from 'react';
import { FullLearningPathResponse, CardResponse } from '@/services/api';
import LearnAssistant from '../components/LearnAssistant';
import PathNavigation from './PathNavigation';
import CardDetailView from './CardDetailView';
import styles from '../styles';
import { InternalViewMode } from '../hooks/useLearningPath';
import { useTranslation } from 'react-i18next';

// Interface for reminder data
interface ReminderData {
  title: string;
  description: string;
  url: string;
}

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
  toggleCardCompletion?: (cardId: string | number) => Promise<void>;
  calculateSectionProgress?: (sectionId: number) => number;
  calculateCourseProgress?: (courseId: number) => number;
  calculateLearningPathProgress?: () => number;
  internalViewMode: InternalViewMode;
  proceedToNextContent: () => void;
  resetToCardView: () => void;
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
  onBack,
  toggleCardCompletion,
  calculateSectionProgress,
  calculateCourseProgress,
  calculateLearningPathProgress,
  internalViewMode,
  proceedToNextContent,
  resetToCardView
}: LearningPathLayoutProps) {
  const { t } = useTranslation('common');
  const [isPageEntering, setIsPageEntering] = useState(true);
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [reminderData, setReminderData] = useState<ReminderData | null>(null);

  // Page entrance animation effect
  useEffect(() => {
    // Set a timeout to remove the entrance animation
    const timer = setTimeout(() => {
      setIsPageEntering(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle assistant collapse state changes
  const handleAssistantCollapseChange = (collapsed: boolean) => {
    setIsAssistantCollapsed(collapsed);
  };

  // Create reminder data from next section/course information
  const generateReminderData = (): ReminderData | null => {
    if (!learningPathData || currentSectionId === null) return null;

    // Find current course and section
    let currentCourseIdx = -1;
    let currentSectionIdxInCourse = -1;
    let nextItemTitle = t('learning_path.next_part_generic');
    let nextSectionUrl = '';

    // Find current position in learning path
    for (let i = 0; i < learningPathData.courses.length; i++) {
      const course = learningPathData.courses[i];
      const sectionIdx = course.sections.findIndex(s => s.id === currentSectionId);
      if (sectionIdx !== -1) {
        currentCourseIdx = i;
        currentSectionIdxInCourse = sectionIdx;

        // Determine next section/course
        if (currentSectionIdxInCourse < course.sections.length - 1) {
          // Next section in the same course
          const nextSection = course.sections[currentSectionIdxInCourse + 1];
          if (nextSection && nextSection.cards && nextSection.cards.length > 0) {
            const firstCardWrapper = nextSection.cards[0];
            nextItemTitle = firstCardWrapper.card?.question || 
                          (firstCardWrapper as CardResponse).question || 
                          nextSection.title;
            nextSectionUrl = `/${locale}/learning-paths/${learningPathData.id}?section=${nextSection.id}&card=${firstCardWrapper.id}`;
          } else if (nextSection) {
            nextItemTitle = nextSection.title;
            nextSectionUrl = `/${locale}/learning-paths/${learningPathData.id}?section=${nextSection.id}`;
          }
        } else if (currentCourseIdx < learningPathData.courses.length - 1) {
          // First section of the next course
          const nextCourse = learningPathData.courses[currentCourseIdx + 1];
          const firstSectionOfNextCourse = nextCourse.sections?.find(s => s.cards && s.cards.length > 0) || nextCourse.sections?.[0];
          if (firstSectionOfNextCourse) {
            if (firstSectionOfNextCourse.cards && firstSectionOfNextCourse.cards.length > 0) {
              const firstCardWrapper = firstSectionOfNextCourse.cards[0];
              nextItemTitle = firstCardWrapper.card?.question || 
                            (firstCardWrapper as CardResponse).question || 
                            firstSectionOfNextCourse.title;
              nextSectionUrl = `/${locale}/learning-paths/${learningPathData.id}?section=${firstSectionOfNextCourse.id}&card=${firstCardWrapper.id}`;
            } else {
              nextItemTitle = firstSectionOfNextCourse.title;
              nextSectionUrl = `/${locale}/learning-paths/${learningPathData.id}?section=${firstSectionOfNextCourse.id}`;
            }
          } else {
            nextItemTitle = nextCourse.title;
            nextSectionUrl = `/${locale}/learning-paths/${learningPathData.id}`;
          }
        }
        break;
      }
    }

    if (currentCourseIdx === -1) return null;

    // Generate the absolute URL using window.location if available
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${baseUrl}${nextSectionUrl}`;

    return {
      title: `Continue Learning: ${nextItemTitle}`,
      description: `Continue your learning path: "${learningPathData.title}" with section "${nextItemTitle}"`,
      url: fullUrl
    };
  };

  const handleSetReminder = () => {
    const data = generateReminderData();
    if (data) {
      setReminderData(data);
      setShowReminderOptions(true);
    }
  };

  const createGoogleCalendarEvent = () => {
    if (!reminderData) return;
    
    // Set the event for tomorrow at the same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startDate = tomorrow.toISOString().replace(/-|:|\.\d+/g, '');
    const endDate = new Date(tomorrow.getTime() + (60 * 60 * 1000)).toISOString().replace(/-|:|\.\d+/g, '');
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(reminderData.title)}&details=${encodeURIComponent(reminderData.description + '\n\n' + reminderData.url)}&dates=${startDate}/${endDate}`;
    
    window.open(url, '_blank');
    setShowReminderOptions(false);
  };

  const downloadICalEvent = () => {
    if (!reminderData) return;
    
    // Create event for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startDate = tomorrow.toISOString().replace(/-|:|\.|\d{3}/g, '');
    const endDate = new Date(tomorrow.getTime() + (60 * 60 * 1000)).toISOString().replace(/-|:|\.|\d{3}/g, '');
    
    // Create iCal content
    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LearnPar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${reminderData.title}`,
      `DESCRIPTION:${reminderData.description}\\n\\n${reminderData.url}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${reminderData.title}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create downloadable file
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'learning_reminder.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowReminderOptions(false);
  };

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

  const renderMainContent = () => {
    if (internalViewMode === 'sectionCompletion') {
      const currentSection = learningPathData?.courses
        .flatMap(course => course.sections)
        .find(section => section.id === currentSectionId);
      const sectionTitle = currentSection ? currentSection.title : t('learning_path.default_section_title');
      
      // Attempt to find the title of the next item
      let nextItemTitle = t('learning_path.next_part_generic');
      if (learningPathData && currentSectionId !== null) {
        let currentCourseIdx = -1;
        let currentSectionIdxInCourse = -1;
        for (let i = 0; i < learningPathData.courses.length; i++) {
          const course = learningPathData.courses[i];
          const sectionIdx = course.sections.findIndex(s => s.id === currentSectionId);
          if (sectionIdx !== -1) { currentCourseIdx = i; currentSectionIdxInCourse = sectionIdx; break; }
        }
        if (currentCourseIdx !== -1 && currentSectionIdxInCourse !== -1) {
          const course = learningPathData.courses[currentCourseIdx];
          if (currentSectionIdxInCourse < course.sections.length - 1) {
            const nextSection = course.sections[currentSectionIdxInCourse + 1];
            if (nextSection && nextSection.cards && nextSection.cards.length > 0) {
              const firstCardWrapper = nextSection.cards[0];
              nextItemTitle = firstCardWrapper.card?.question || (firstCardWrapper as CardResponse).question || nextSection.title;
            } else if (nextSection) {
              nextItemTitle = nextSection.title;
            }
          } else if (currentCourseIdx < learningPathData.courses.length - 1) {
            const nextCourse = learningPathData.courses[currentCourseIdx + 1];
            const firstSectionOfNextCourse = nextCourse.sections?.find(s => s.cards && s.cards.length > 0) || nextCourse.sections?.[0];
            if (firstSectionOfNextCourse) {
              if (firstSectionOfNextCourse.cards && firstSectionOfNextCourse.cards.length > 0) {
                const firstCardWrapper = firstSectionOfNextCourse.cards[0];
                nextItemTitle = firstCardWrapper.card?.question || (firstCardWrapper as CardResponse).question || firstSectionOfNextCourse.title;
              } else {
                nextItemTitle = firstSectionOfNextCourse.title;
              }
            } else {
              nextItemTitle = nextCourse.title;
            }
          }
        }
      }

      return (
        <div className={styles.detailPane}>
          <div className={styles.completionContainer}>
            <h2 className={styles.completionTitle}>{t('learning_path.section_completed_title')}</h2>
            <p className={styles.completionMessage}>
              {t('learning_path.section_completed_message_short', { sectionTitle })}
            </p>
            <p className={styles.completionMessage}>{t('learning_path.whats_next', { nextItemTitle })}</p>
            <button onClick={proceedToNextContent} className={styles.proceedButton}>
              {t('learning_path.proceed_to_next')}
            </button>
            <button onClick={resetToCardView} className={styles.backButton} style={{ marginTop: '0.5rem' }}>
              {t('learning_path.back_to_path_view')}
            </button>
            
            {/* Add reminder functionality */}
            {!showReminderOptions ? (
              <button onClick={handleSetReminder} className={styles.reminderButton}>
                Remind Me to Continue Later
              </button>
            ) : (
              <div className={styles.reminderOptions}>
                <p className={styles.reminderOptionsTitle}>How would you like to be reminded?</p>
                <div className={styles.reminderButtonsContainer}>
                  <button onClick={createGoogleCalendarEvent} className={styles.reminderOptionButton}>
                    Add to Google Calendar
                  </button>
                  <button onClick={downloadICalEvent} className={styles.reminderOptionButton}>
                    Download Calendar File (.ics)
                  </button>
                  <button onClick={() => setShowReminderOptions(false)} className={styles.reminderCancelButton}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (internalViewMode === 'learningPathCompletion') {
      return (
        <div className={styles.detailPane}>
          <div className={styles.completionContainer}>
            <h2 className={styles.completionTitle}>{t('learning_path.path_completed_title')}</h2>
            <p className={styles.completionMessage}>
              {t('learning_path.path_completed_message', { pathTitle: learningPathData?.title || '' })}
            </p>
            {onBack && (
              <button onClick={onBack} className={styles.proceedButton}>
                {t('learning_path.back_to_dashboard')}
              </button>
            )}
            <button onClick={resetToCardView} className={styles.backButton} style={{ marginTop: '0.5rem' }}>
              {t('learning_path.review_path')}
            </button>
          </div>
        </div>
      );
    } else {
      // Default: Card view (internalViewMode === 'card')
      return (
        <CardDetailView
          selectedCard={selectedCard}
          currentSectionCards={currentSectionCards}
          currentCardIndex={currentCardIndex}
          navigateToPreviousCard={navigateToPreviousCard}
          navigateToNextCard={navigateToNextCard}
          hasPreviousCard={hasPreviousCard}
          hasNextCard={hasNextCard}
          showDeleteButton={showDeleteButton}
          toggleCardCompletion={toggleCardCompletion}
          currentSectionId={currentSectionId}
        />
      );
    }
  };

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
        calculateSectionProgress={calculateSectionProgress}
        calculateCourseProgress={calculateCourseProgress}
        calculateLearningPathProgress={calculateLearningPathProgress}
      />

      {/* Main content area - now calls renderMainContent */}
      {renderMainContent()}

      {/* Learning Assistant */}
      <div className={`${styles.assistantContainer} ${isAssistantCollapsed ? styles.collapsed : ''}`}>
        <LearnAssistant 
          currentCardId={selectedCard?.id || null}
          currentSectionId={currentSectionId}
          onCollapseChange={handleAssistantCollapseChange}
        />
      </div>
    </div>
  );
} 
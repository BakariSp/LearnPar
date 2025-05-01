'use client';

import { useEffect, useState, useCallback } from 'react';
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
import LearnAssistant from '../components/LearnAssistant';
// Optional: Import an icon library if you want icons for status
// import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

// Declare the ViewMode type at the top of the file
type ViewMode = 'structure' | 'card' | 'completion';

export default function LearningPathDetailPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale; // ✅ locale
  const id = params.id as string;

  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null); // State for task status
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false); // Separate loading state for status
  const [currentSectionIdForFetch, setCurrentSectionIdForFetch] = useState<number | null>(null);
  const [isFetchingSection, setIsFetchingSection] = useState(false);
  const [currentSectionCards, setCurrentSectionCards] = useState<CardResponse[]>([]);
  const [sectionCardsCache, setSectionCardsCache] = useState<Record<number, CardResponse[]>>({});
  const [selectedCardSectionCards, setSelectedCardSectionCards] = useState<CardResponse[]>([]);
  const [selectedCardSectionId, setSelectedCardSectionId] = useState<number | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('structure');
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  const [autoSelectCardId, setAutoSelectCardId] = useState<number | null>(null);
  const [autoSelectFirstCardInSectionId, setAutoSelectFirstCardInSectionId] = useState<number | null>(null);
  const [isPreloadingCards, setIsPreloadingCards] = useState(true);

  // --- Wrap handleCardSelect in useCallback ---
  // (Place this definition before the useEffect hooks that depend on it)
  const handleCardSelect = useCallback((card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect: boolean = false) => {
    setCurrentViewMode('card');
    setSelectedCard(card);
    setSelectedCardSectionId(sectionId);
    setSelectedCardSectionCards(sectionCards);
    setCompletionInfo(null);
    // If auto-selecting, maybe scroll into view? (Optional)
    // if (autoSelect) { /* scroll logic */ }
  }, []); // Empty dependency array means this function is stable

  // Process the full learning path data to extract and cache all cards
  const processSectionCards = useCallback((pathData: FullLearningPathResponse) => {
    if (!pathData || !pathData.courses) return;
    
    // Create a new cache object to store all cards
    const newCache: Record<number, CardResponse[]> = {};
    
    // Extract cards from each section in the response
    pathData.courses.forEach(course => {
      course.sections.forEach(section => {
        // If section has cards property, store them in the cache
        if (section.cards && Array.isArray(section.cards)) {
          newCache[section.id] = section.cards;
        }
      });
    });
    
    // Update the cache state with all extracted cards
    setSectionCardsCache(newCache);
    setIsPreloadingCards(false);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setIsFetchingStatus(false);
      setError(null);
      setLearningPathData(null);
      setTaskStatus(null);
      setSelectedCard(null);
      setExpandedItems({});
      setCurrentSectionIdForFetch(null);
      setCurrentSectionCards([]);
      setSectionCardsCache({});
      setSelectedCardSectionCards([]);
      setSelectedCardSectionId(null);
      setCurrentViewMode('structure');
      setCompletionInfo(null);
      setAutoSelectCardId(null);
      setAutoSelectFirstCardInSectionId(null);
      setIsPreloadingCards(true); // Start loading indicator

      try {
        const pathId = parseInt(id, 10);
        if (isNaN(pathId)) {
          throw new Error("Invalid Learning Path ID.");
        }

        const pathData = await apiGetFullLearningPath(pathId);
        
        // Check if we have a user token for API operations
        if (pathData) {
          if (!pathData.user_token) {
            console.warn('No user token available in learning path data. Some operations might fail.');
            // If your app has authentication context/state, you could try to refresh it here
          } else {
            console.log(`User token available for path ${pathId}: ${pathData.user_token.substring(0, 10)}...`);
          }
          
          setLearningPathData(pathData);
          
          // Process and cache all cards from the response
          processSectionCards(pathData);
        }

        // --- Check for query parameters AFTER pathData is loaded ---
        const targetSectionIdStr = searchParams.get('section');
        const targetCardIdStr = searchParams.get('card');

        if (targetSectionIdStr && targetCardIdStr && pathData) {
          const targetSectionId = parseInt(targetSectionIdStr, 10);
          const targetCardId = parseInt(targetCardIdStr, 10);

          if (!isNaN(targetSectionId) && !isNaN(targetCardId)) {
            // Find the course containing the section to expand it
            const courseContainingSection = pathData.courses.find(course =>
              course.sections.some(section => section.id === targetSectionId)
            );

            if (courseContainingSection) {
              const courseItemId = `course-${courseContainingSection.id}`;
              const sectionItemId = `section-${targetSectionId}`;
              // Expand necessary items
              setExpandedItems(prev => ({
                ...prev,
                [courseItemId]: true,
                [sectionItemId]: true,
              }));
            }
            
            // Auto-select the target card
            const section = pathData.courses.flatMap(c => c.sections).find(s => s.id === targetSectionId);
            if (section && section.cards) {
              const targetCard = section.cards.find(c => c.id === targetCardId);
              if (targetCard) {
                handleCardSelect(targetCard, targetSectionId, section.cards, true);
              }
            }

            // Clean the URL - remove query params after processing
            router.replace(`/${locale}/learning-paths/${id}`, { scroll: false });
          }
        }

        // 2. If path data loaded successfully, fetch the latest task status
        if (pathData) {
          setIsFetchingStatus(true);
          try {
            const latestTask = await apiGetLatestTaskForLearningPath(pathId);
            setTaskStatus(latestTask); // Store the latest task status
          } catch (taskError: any) {
            console.error("Failed to fetch latest task status:", taskError);
          } finally {
            setIsFetchingStatus(false);
          }
        }

      } catch (err: any) {
        console.error("Failed to load learning path details:", err);
        setError(err.message || 'Failed to load learning path details. Please try again.');
        setIsPreloadingCards(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router, processSectionCards, handleCardSelect, locale, searchParams]);

  const findNextItem = (currentSectionId: number): NextItemInfo | null => {
    if (!learningPathData) return null;

    let currentCourseIndex = -1;
    let currentSectionIndex = -1;

    // Find current course and section indices
    for (let i = 0; i < learningPathData.courses.length; i++) {
      const sectionIndex = learningPathData.courses[i].sections.findIndex(s => s.id === currentSectionId);
      if (sectionIndex !== -1) {
        currentCourseIndex = i;
        currentSectionIndex = sectionIndex;
        break;
      }
    }

    if (currentCourseIndex === -1 || currentSectionIndex === -1) {
      console.error("Could not find current section in learning path data.");
      return null; // Should not happen ideally
    }

    const currentCourse = learningPathData.courses[currentCourseIndex];

    // Check for next section in the same course
    if (currentSectionIndex + 1 < currentCourse.sections.length) {
      const nextSection = currentCourse.sections[currentSectionIndex + 1];
      return {
        type: 'section',
        courseId: currentCourse.id,
        sectionId: nextSection.id,
        title: nextSection.title,
      };
    }

    // Check for the next course
    if (currentCourseIndex + 1 < learningPathData.courses.length) {
      const nextCourse = learningPathData.courses[currentCourseIndex + 1];
      // Find the first section of the next course
      if (nextCourse.sections && nextCourse.sections.length > 0) {
        const firstSectionOfNextCourse = nextCourse.sections[0];
        return {
          type: 'course',
          courseId: nextCourse.id,
          sectionId: firstSectionOfNextCourse.id,
          title: nextCourse.title, // Use course title for the button
        };
      } else {
         // Next course has no sections? Edge case, treat as end.
         console.warn(`Next course "${nextCourse.title}" has no sections.`);
         return { type: 'end' };
      }
    }

    // No more sections or courses
    return { type: 'end' };
  };

  const toggleExpand = (itemId: string, itemType: 'course' | 'section', sectionId?: number) => {
    setExpandedItems(prev => {
      const isCurrentlyExpanded = !!prev[itemId];
      return { ...prev, [itemId]: !isCurrentlyExpanded };
    });
  };

  const renderResources = (resources: Record<string, CardResource> | CardResource[] | {}) => {
    if (!resources || Object.keys(resources).length === 0) {
      return <p className={styles.noResources}>No additional resources provided.</p>;
    }

    if (typeof resources === 'object' && !Array.isArray(resources)) {
      return (
        <ul className={styles.resourceList}>
          {Object.entries(resources).map(([key, resource]) => (
            resource.url ? (
              <li key={key}>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {resource.title || key} <span className={styles.externalIcon}>↗</span>
                </a>
              </li>
            ) : null
          ))}
        </ul>
      );
    }

    if (Array.isArray(resources)) {
       return (
        <ul className={styles.resourceList}>
          {resources.map((resource, index) => (
             resource.url ? (
              <li key={index}>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {resource.title || `Resource ${index + 1}`} <span className={styles.externalIcon}>↗</span>
                </a>
              </li>
            ) : null
          ))}
        </ul>
      );
    }

    return <p className={styles.noResources}>Could not display resources (unknown format).</p>;
  };

  const renderStatusIndicator = () => {
    if (isFetchingStatus) {
      return <span className={`${styles.statusBadge} ${styles.statusLoading}`}>Checking status...</span>;
    }
    if (!taskStatus) {
      return <span className={`${styles.statusBadge} ${styles.statusUnknown}`}>Status: Unknown</span>;
    }

    let statusText = `${taskStatus.status}`;
    if (taskStatus.stage) {
      statusText += ` (${taskStatus.stage})`;
    }
    let statusStyle = styles.statusInfo;

    switch (taskStatus.status) {
      case 'completed':
        statusStyle = styles.statusCompleted;
        break;
      case 'running':
      case 'starting':
      case 'pending':
      case 'queued':
        statusStyle = styles.statusRunning;
        break;
      case 'failed':
      case 'timeout':
        statusStyle = styles.statusFailed;
        if (taskStatus.result_message) {
            statusText += ` - ${taskStatus.result_message}`;
        } else if (taskStatus.error_details) {
             statusText += ` - Error`;
        }
        break;
      default:
        statusStyle = styles.statusUnknown;
    }

    return <span className={`${styles.statusBadge} ${statusStyle}`}>{statusText}</span>;
  };

  const getCurrentCardIndex = () => {
    if (!selectedCard || !selectedCardSectionCards.length) return -1;
    return selectedCardSectionCards.findIndex(card => card.id === selectedCard.id);
  };

  const hasPreviousCard = () => {
    const currentIndex = getCurrentCardIndex();
    return currentIndex > 0;
  };

  const hasNextCard = () => {
    const currentIndex = getCurrentCardIndex();
    return currentIndex < selectedCardSectionCards.length - 1 && currentIndex !== -1;
  };

  const navigateToPreviousCard = () => {
    if (currentViewMode === 'completion') {
      setCurrentViewMode('card');
      setCompletionInfo(null);
      return;
    }

    const currentIndex = getCurrentCardIndex();
    if (currentIndex > 0) {
      setSelectedCard(selectedCardSectionCards[currentIndex - 1]);
    }
  };

  const navigateToNextCard = () => {
    const currentIndex = getCurrentCardIndex();
    const totalCards = selectedCardSectionCards.length;

    if (currentIndex < totalCards - 1) {
      setSelectedCard(selectedCardSectionCards[currentIndex + 1]);
    } else if (currentIndex === totalCards - 1 && selectedCard && selectedCardSectionId !== null) {
      const nextInfo = findNextItem(selectedCardSectionId);

      let completedTitle = "Section";
      learningPathData?.courses.forEach(course => {
          const section = course.sections.find(s => s.id === selectedCardSectionId);
          if (section) {
              completedTitle = section.title;
          }
      });

      setCompletionInfo({
        completedSectionTitle: completedTitle,
        nextItem: nextInfo,
      });
      setCurrentViewMode('completion');
    }
  };

  const handleNavigateNext = () => {
    if (!completionInfo || !completionInfo.nextItem) return;

    const nextItem = completionInfo.nextItem;

    if (nextItem.type === 'end') {
      console.log("Learning Path Completed!");
      setCurrentViewMode('structure');
      setSelectedCard(null);
      setCompletionInfo(null);
      setExpandedItems({});
      return;
    }

    setCurrentViewMode('structure');
    setCompletionInfo(null);
    setSelectedCard(null);

    if (nextItem.sectionId) {
       const courseContainingNextSection = learningPathData?.courses.find(c => c.sections.some(s => s.id === nextItem.sectionId));

       if (courseContainingNextSection) {
         const courseDomId = `course-${courseContainingNextSection.id}`;
         if (!expandedItems[courseDomId]) {
           setExpandedItems(prev => ({ ...prev, [courseDomId]: true }));
         }
       }

       const sectionDomId = `section-${nextItem.sectionId}`;
       if (!expandedItems[sectionDomId]) {
           toggleExpand(sectionDomId, 'section', nextItem.sectionId);
       }

       setAutoSelectFirstCardInSectionId(nextItem.sectionId);

    } else {
      console.error("Next item is not 'end' but has no sectionId", nextItem);
      setCurrentViewMode('structure');
      setSelectedCard(null);
      setSelectedCardSectionId(null);
      setSelectedCardSectionCards([]);
    }
  };

  // We can remove or simplify the fetchSectionCards useEffect since all cards are already loaded
  // But we'll keep a simplified version that only handles auto-selection from cached data
  useEffect(() => {
    // Only handle selection if we have a target section ID and it's in the cache
    if (!autoSelectCardId && !autoSelectFirstCardInSectionId) return;
    
    // Handle auto-select specific card
    if (autoSelectCardId && currentSectionIdForFetch) {
      const cachedCards = sectionCardsCache[currentSectionIdForFetch] || [];
      const cardToSelect = cachedCards.find(c => c.id === autoSelectCardId);
      
      if (cardToSelect) {
        handleCardSelect(cardToSelect, currentSectionIdForFetch, cachedCards, true);
      }
      setAutoSelectCardId(null);
    }
    
    // Handle auto-select first card in section
    if (autoSelectFirstCardInSectionId) {
      const cachedCards = sectionCardsCache[autoSelectFirstCardInSectionId] || [];
      
      if (cachedCards.length > 0) {
        handleCardSelect(cachedCards[0], autoSelectFirstCardInSectionId, cachedCards, true);
      } else {
        setCurrentViewMode('structure');
      }
      setAutoSelectFirstCardInSectionId(null);
    }
  }, [autoSelectCardId, autoSelectFirstCardInSectionId, currentSectionIdForFetch, sectionCardsCache, handleCardSelect]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error && !learningPathData) {
    return <div className={styles.errorPage}>{t('learning_path.error')}: {error}</div>; // ✅ 加t
  }

  if (!learningPathData) {
    return <div className={styles.notFound}>{t('learning_path.not_found')}</div>; // ✅ 加t
  }

  return (
    <div className={styles.pageContainer}>
      {/* Left Pane: Structure Navigation */}
      <aside className={styles.structureNavPane}>
        <div className={styles.navHeader}>
          <h1 className={styles.navPathTitle}>{learningPathData.title}</h1>
          {learningPathData.description && <p className={styles.navPathDescription}>{learningPathData.description}</p>}
          {/* Display meta like status, difficulty etc. */}
          <div className={styles.pathMetaHeader}>
            <span>{learningPathData.category}</span>
            <span>{learningPathData.difficulty_level}</span>
            <span>{learningPathData.estimated_days} {t('learning_path.days')}</span>
            {renderStatusIndicator()}
            {isPreloadingCards && 
              <span className={`${styles.statusBadge} ${styles.statusInfo}`}>Loading cards...</span>
            }
          </div>
          {error && <p className={styles.inlineError}>{t('learning_path.error_loading_details')}: {error}</p>}
        </div>

        {/* Course/Section/Card List */}
        <ul className={styles.navCourseList}>
          {learningPathData.courses.map((course, courseIndex) => {
            const courseItemId = `course-${course.id}`;
            const isExpanded = expandedItems[courseItemId] || false;
            
            return (
              <li key={courseItemId} className={styles.navCourseItem}>
                <button 
                  className={styles.navCourseHeaderButton}
                  onClick={() => toggleExpand(courseItemId, 'course')}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.navCourseHeader}>
                    <span className={styles.navCourseOrder}>
                      Course {courseIndex + 1}
                    </span>
                    <span className={styles.navCourseTitle}>
                      {course.title}
                    </span>
                  </div>
                </button>
                
                {isExpanded && (
                  <ul className={styles.navSectionList}>
                    {course.sections.map((section) => {
                      const sectionItemId = `section-${section.id}`;
                      const isSectionExpanded = expandedItems[sectionItemId] || false;
                      
                      return (
                        <li key={sectionItemId} className={styles.navSectionItem}>
                          <button 
                            className={styles.navSectionHeaderButton}
                            onClick={() => toggleExpand(sectionItemId, 'section', section.id)}
                            aria-expanded={isSectionExpanded}
                          >
                            <span className={`${styles.navToggleIcon} ${isSectionExpanded ? styles.expanded : ''}`}>
                              {isSectionExpanded ? '▼' : '►'}
                            </span>
                            <span className={styles.navSectionTitle}>
                              {section.title}
                            </span>
                          </button>
                          
                          {isSectionExpanded && (
                            <ul className={styles.navCardList}>
                              {(() => {
                                // If cards are being fetched for this section
                                if (currentSectionIdForFetch === section.id && isFetchingSection) {
                                  return (
                                    <li className={styles.navLoadingCards}>
                                      {t('learning_path.loading_cards')}
                                    </li>
                                  );
                                }
                                
                                // If cards are available in cache for this section
                                const cachedCards = sectionCardsCache[section.id] || [];
                                
                                if (cachedCards.length === 0) {
                                  return (
                                    <li className={styles.navNoCards}>
                                      {t('learning_path.no_cards')}
                                    </li>
                                  );
                                }
                                
                                // Render cards
                                return cachedCards.map((card) => {
                                  const isSelected = selectedCard && selectedCard.id === card.id;
                                  
                                  return (
                                    <li key={`card-${card.id}`} className={styles.navCardItem}>
                                      <button 
                                        className={`${styles.navCardLink} ${isSelected ? styles.selectedCard : ''}`}
                                        onClick={() => handleCardSelect(card, section.id, cachedCards)}
                                      >
                                        {card.keyword}
                                      </button>
                                    </li>
                                  );
                                });
                              })()}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Center Pane: Detail Content */}
      <div className={styles.detailPane}>
        {/* Render appropriate view based on currentViewMode */}
        {currentViewMode === 'structure' && (
          <div className={styles.detailPlaceholder}>
            <h2>{t('learning_path.select_card')}</h2>
            <p>{t('learning_path.select_card_instructions')}</p>
          </div>
        )}
        
        {currentViewMode === 'card' && (
          <div className={styles.cardDetailContainer}>
            {/* Card Progress Indicator at the top */}
            <div className={styles.cardProgressIndicator}>
              {selectedCardSectionCards.map((card, index) => {
                const isCurrent = selectedCard?.id === card.id;
                const isCompleted = index < getCurrentCardIndex();
                return (
                  <div 
                    key={`progress-${card.id}`} 
                    className={`${styles.progressTab} ${isCurrent ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                    title={card.keyword}
                  />
                );
              })}
            </div>
            
            {/* Card Main Content in the middle */}
            <div className={styles.cardMainContent}>
              {selectedCard && (
                <>
                  <div className={styles.cardHeader}>
                    <h1 className={styles.cardTitle}>{selectedCard.keyword}</h1>
                    {/* Add tertiary delete button */}
                    <button
                      className={styles.cardDeleteButton}
                      onClick={() => {
                        if (window.confirm(t('card.confirmDelete', 'Are you sure you want to delete this card?'))) {
                          // Check if we have the user token
                          if (!learningPathData?.user_token) {
                            console.error('No user token available for card deletion');
                            alert(t('card.deleteError', 'Authentication required to delete this card'));
                            return;
                          }
                          
                          console.log('Using token for delete:', (learningPathData.user_token || '').substring(0, 15) + '...');
                          
                          // Make API call to delete the card
                          const url = `/api/users/me/learning-paths/cards/${selectedCard.id}${selectedCardSectionId ? `?section_id=${selectedCardSectionId}` : ''}`;
                          console.log('Delete URL:', url);
                          
                          fetch(url, {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${learningPathData.user_token}`
                            }
                          })
                          .then(res => {
                            if (!res.ok) {
                              console.error(`Card delete failed with status: ${res.status}`);
                              return res.text().then(errorText => {
                                console.error('Error response:', errorText);
                                throw new Error(`Failed to delete card: ${res.status}`);
                              });
                            }
                            
                            // Check if there's a response body (some DELETE endpoints return no content)
                            const contentType = res.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                              return res.json();
                            } else {
                              return { success: true };
                            }
                          })
                          .then(data => {
                            // Remove the card from the UI state
                            setSectionCardsCache(prev => {
                              const newCache = { ...prev };
                              if (selectedCardSectionId && newCache[selectedCardSectionId]) {
                                newCache[selectedCardSectionId] = newCache[selectedCardSectionId]
                                  .filter(card => card.id !== selectedCard.id);
                              }
                              return newCache;
                            });
                            
                            // Update selected cards list
                            if (selectedCardSectionId) {
                              const updatedCards = selectedCardSectionCards.filter(card => card.id !== selectedCard.id);
                              setSelectedCardSectionCards(updatedCards);
                              
                              // Navigate to another card if possible
                              if (updatedCards.length > 0) {
                                if (hasNextCard()) {
                                  navigateToNextCard();
                                } else if (hasPreviousCard()) {
                                  navigateToPreviousCard();
                                } else {
                                  // If no cards left, go back to structure view
                                  setCurrentViewMode('structure');
                                  setSelectedCard(null);
                                }
                              } else {
                                // No cards left in section
                                setCurrentViewMode('structure');
                                setSelectedCard(null);
                              }

                              // Fetch fresh data for the learning path to ensure UI is up-to-date
                              const pathId = parseInt(id, 10);
                              if (!isNaN(pathId)) {
                                apiGetFullLearningPath(pathId)
                                  .then(freshData => {
                                    if (freshData) {
                                      setLearningPathData(freshData);
                                      if (processSectionCards) {
                                        processSectionCards(freshData);
                                      }
                                    }
                                  })
                                  .catch(err => {
                                    console.error("Failed to refresh learning path data:", err);
                                  });
                              }
                            }
                          })
                          .catch(error => {
                            console.error('Error deleting card:', error);
                            alert(t('card.deleteError', 'Failed to delete card. Please try again.'));
                          });
                        }
                      }}
                    >
                      {t('card.deleteButton', 'Delete')}
                    </button>
                  </div>
                  
                  {/* Question Section */}
                  <div className={styles.cardSection}>
                    <h3>{t('card.questionHeading', 'Question')}</h3>
                    <p>{selectedCard.question}</p>
                  </div>
                  
                  {/* Answer Section */}
                  <div className={styles.cardSection}>
                    <h3>{t('card.answerHeading', 'Answer')}</h3>
                    <p>{selectedCard.answer}</p>
                  </div>
                  
                  {/* Explanation Section (if present) */}
                  {selectedCard.explanation && (
                    <div className={styles.cardSection}>
                      <h3>{t('card.explanationHeading', 'Explanation')}</h3>
                      <p>{selectedCard.explanation}</p>
                    </div>
                  )}
                  
                  {/* Resources Section (if present) */}
                  {selectedCard.resources && Object.keys(selectedCard.resources).length > 0 && (
                    <div className={styles.cardSection}>
                      <h3>{t('card.resourcesHeading', 'Resources')}</h3>
                      {renderResources(selectedCard.resources)}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Card Navigation at the bottom */}
            <div className={styles.cardNavigation}>
              <button
                className={`${styles.navButton} ${styles.prevButton}`}
                onClick={navigateToPreviousCard}
                disabled={!hasPreviousCard()}
              >
                {t('card.previousButton', 'Previous')}
              </button>
              
              <span className={styles.cardCounter}>
                {getCurrentCardIndex() + 1} / {selectedCardSectionCards.length}
              </span>
              
              <button
                className={`${styles.navButton} ${styles.nextAction}`}
                onClick={navigateToNextCard}
                disabled={!hasNextCard() && !findNextItem(selectedCardSectionId || 0)}
              >
                {hasNextCard() 
                  ? t('card.nextButton', 'Next') 
                  : t('card.completeButton', 'Complete')}
              </button>
            </div>
          </div>
        )}
        
        {currentViewMode === 'completion' && completionInfo && (
          <div className={styles.completionContainer}>
            <div className={styles.completionView}>
              <h2>🎉 {t('learning_path.section_completed', 'Section Completed')} 🎉</h2>
              <p>
                ✅ {t('learning_path.completed_message', 'You have completed {{section}}', { section: completionInfo.completedSectionTitle })}
              </p>
              
              <div className={styles.completionActions}>
                {completionInfo.nextItem ? (
                  <>
                    <p>
                      <strong>🚀 {t('learning_path.continue_with', 'Continue with')}</strong>: {completionInfo.nextItem.title}
                    </p>
                    <button 
                      className={styles.navButton}
                      onClick={handleNavigateNext}
                    >
                      ➡️ {t('learning_path.continue_button', 'Continue')}
                    </button>
                    <button 
                      className={`${styles.navButton} ${styles.secondaryAction}`}
                      onClick={() => setCurrentViewMode('structure')}
                    >
                      🔍 {t('learning_path.back_to_overview', 'Back to Overview')}
                    </button>
                  </>
                ) : (
                  <button 
                    className={styles.navButton}
                    onClick={() => setCurrentViewMode('structure')}
                  >
                    🔍 {t('learning_path.back_to_overview', 'Back to Overview')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: Learning Assistant */}
      {selectedCard && selectedCardSectionId && (
        <div className={styles.assistantContainer}>
          {/* {!learningPathData?.user_token && (
            <div className={styles.errorMessage}>
              <p>{t('learning_path.token_missing', 'Authentication token is missing. Some features like saving or deleting cards may not work. Try refreshing the page or logging in again.')}</p>
            </div>
          )} */}
          <LearnAssistant 
            currentCardId={selectedCard.id}
            currentSectionId={selectedCardSectionId}
            sectionTitle={selectedCardSectionId ? 
              learningPathData?.courses.flatMap(c => c.sections).find(s => s.id === selectedCardSectionId)?.title : ''}
            courseTitle={selectedCardSectionId ? 
              learningPathData?.courses.find(c => 
                c.sections.some(s => s.id === selectedCardSectionId))?.title : ''}
            difficulty="intermediate"
            isAdmin={learningPathData?.is_admin ?? false}
            userToken={learningPathData?.user_token ?? ''}
            onAddCard={(card, sectionId) => {
              // Handle adding the card to the section
              // This might involve an API call and then updating the UI
              fetch('/api/learning-assistant/add-card', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  card_data: card,
                  section_id: sectionId
                }),
              })
              .then(res => res.json())
              .then(data => {
                if (data.status.success) {
                  // Add the new card to the current section cards
                  const newCard = data.card;
                  
                  // Update section cards in state and cache
                  setSectionCardsCache(prev => {
                    const updatedCards = [...(prev[sectionId] || []), newCard];
                    return {
                      ...prev,
                      [sectionId]: updatedCards
                    };
                  });
                  
                  // If this is the current section, update the current cards
                  if (sectionId === selectedCardSectionId) {
                    setSelectedCardSectionCards(prev => [...prev, newCard]);
                  }
                  
                  // Show a success notification (if you have a notification system)
                  // showNotification('Card added successfully!');
                }
              })
              .catch(error => {
                console.error('Error adding card:', error);
                // Show error notification if needed
              });
            }}
            onUnsaveCard={(cardId) => {
              // Handle unsaving the card
              console.log(`Unsaving card ${cardId}`);
              
              // Remove card from cache if it exists
              setSectionCardsCache((prev) => {
                // Create a shallow copy of the previous cache
                const newCache: Record<number, CardResponse[]> = {};
                
                // Filter out the card with the matching ID from each section
                Object.entries(prev).forEach(([sectionIdStr, cards]) => {
                  const sectionId = parseInt(sectionIdStr, 10);
                  newCache[sectionId] = cards.filter(card => card.id !== cardId);
                });
                
                return newCache;
              });
              
              // If this is the current section, remove from current cards
              if (selectedCardSectionId) {
                setSelectedCardSectionCards(prev => prev.filter(card => card.id !== cardId));
              }
            }}
            onRefreshCards={() => {
              // Fetch fresh data for the learning path
              const pathId = parseInt(id, 10);
              if (!isNaN(pathId)) {
                apiGetFullLearningPath(pathId)
                  .then(freshData => {
                    if (freshData) {
                      setLearningPathData(freshData);
                      if (processSectionCards) {
                        processSectionCards(freshData);
                      }
                    }
                  })
                  .catch(err => {
                    console.error("Failed to refresh learning path data:", err);
                  });
              }
            }}
          />
        </div>
      )}
    </div>
  );
} 
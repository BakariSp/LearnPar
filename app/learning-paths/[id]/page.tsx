'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for potential back button
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
// Optional: Import an icon library if you want icons for status
// import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

export default function LearningPathDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [currentViewMode, setCurrentViewMode] = useState<'structure' | 'card' | 'completion'>('structure');
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  const [autoSelectCardId, setAutoSelectCardId] = useState<number | null>(null);
  const [autoSelectFirstCardInSectionId, setAutoSelectFirstCardInSectionId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setIsFetchingStatus(false); // Reset status fetching state
      setError(null);
      setLearningPathData(null);
      setTaskStatus(null); // Reset task status
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

      try {
        const pathId = parseInt(id, 10);
        if (isNaN(pathId)) {
          throw new Error("Invalid Learning Path ID.");
        }

        const pathData = await apiGetFullLearningPath(pathId);
        setLearningPathData(pathData);

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
            // Set the target card and section ID to trigger fetch/selection
            setAutoSelectCardId(targetCardId);
            setCurrentSectionIdForFetch(targetSectionId); // Trigger section fetch effect

            // Clean the URL - remove query params after processing
            // Use replace to avoid adding to browser history
            router.replace(`/learning-paths/${id}`, { scroll: false });
          }
        }
        // --- End query parameter check ---

        // 2. If path data loaded successfully, fetch the latest task status
        if (pathData) {
          setIsFetchingStatus(true);
          try {
            const latestTask = await apiGetLatestTaskForLearningPath(pathId);
            setTaskStatus(latestTask); // Store the latest task status (can be null if none found)
          } catch (taskError: any) {
            // Log status fetch error but don't block the page view
            console.error("Failed to fetch latest task status:", taskError);
            // Optionally set an error message specific to status fetching
            // setError(prev => prev ? `${prev}\nCould not load generation status.` : 'Could not load generation status.');
          } finally {
            setIsFetchingStatus(false);
          }
        }

      } catch (err: any) {
        console.error("Failed to load learning path details:", err);
        setError(err.message || 'Failed to load learning path details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  useEffect(() => {
    // Don't fetch if no section is targeted or if we are already fetching it
    if (!currentSectionIdForFetch || isFetchingSection) return;

    const fetchSectionCards = async () => {
      // Check cache first
      if (sectionCardsCache[currentSectionIdForFetch]) {
        const cachedCards = sectionCardsCache[currentSectionIdForFetch];

        // --- Check for auto-select specific card intent (Cache Hit) ---
        if (autoSelectCardId && cachedCards.some(c => c.id === autoSelectCardId)) {
          const cardToSelect = cachedCards.find(c => c.id === autoSelectCardId);
          if (cardToSelect) {
            handleCardSelect(cardToSelect, currentSectionIdForFetch, cachedCards, true);
          }
          setAutoSelectCardId(null); // Clear the trigger
        }
        // --- Check for auto-select FIRST card intent (Cache Hit) ---
        else if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) {
          if (cachedCards.length > 0) {
            handleCardSelect(cachedCards[0], currentSectionIdForFetch, cachedCards, true);
          } else {
            // Section has no cards, stay in structure view or handle appropriately
            setCurrentViewMode('structure');
          }
          setAutoSelectFirstCardInSectionId(null); // Clear the trigger
        }
        // No need to fetch if cached
        return;
      }

      // --- Fetch if not cached ---
      setIsFetchingSection(true);
      try {
        const sectionData = await apiGetSectionWithCards(currentSectionIdForFetch);
        const cards = sectionData.cards || [];
        setSectionCardsCache(prevCache => ({ ...prevCache, [currentSectionIdForFetch]: cards }));

        // --- Check for auto-select specific card intent (After Fetch) ---
        if (autoSelectCardId && cards.some(c => c.id === autoSelectCardId)) {
           const cardToSelect = cards.find(c => c.id === autoSelectCardId);
           if (cardToSelect) {
             handleCardSelect(cardToSelect, currentSectionIdForFetch, cards, true);
           }
           setAutoSelectCardId(null); // Clear the trigger
        } else if (autoSelectCardId) {
            // Card ID was specified but not found in this section after fetch
            console.warn(`Card ID ${autoSelectCardId} not found in section ${currentSectionIdForFetch} after fetch.`);
            setAutoSelectCardId(null); // Clear the trigger
            // Optionally switch back to structure view or show a message
            // setCurrentViewMode('structure');
        }
        // --- Check for auto-select FIRST card intent (After Fetch) ---
        else if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) {
          if (cards.length > 0) {
            handleCardSelect(cards[0], currentSectionIdForFetch, cards, true);
          } else {
            // Section has no cards, stay in structure view or handle appropriately
            setCurrentViewMode('structure');
          }
          setAutoSelectFirstCardInSectionId(null); // Clear the trigger
        }
        // --- End auto-select check ---

      } catch (err: any) {
        console.error(`Error fetching cards for section ${currentSectionIdForFetch}:`, err);
        // Mark cache with empty array to prevent refetch loop on error
        setSectionCardsCache(prevCache => ({ ...prevCache, [currentSectionIdForFetch]: [] }));
        // Clear auto-select triggers if fetch failed
        if (autoSelectCardId) setAutoSelectCardId(null);
        if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) setAutoSelectFirstCardInSectionId(null);
      } finally {
        setIsFetchingSection(false);
      }
    };

    fetchSectionCards();
  // Add autoSelectFirstCardInSectionId to dependencies
  }, [currentSectionIdForFetch, sectionCardsCache, isFetchingSection, autoSelectCardId, autoSelectFirstCardInSectionId, handleCardSelect]);

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
      const newState = { ...prev, [itemId]: !isCurrentlyExpanded };

      if (itemType === 'section' && sectionId && !isCurrentlyExpanded) {
         if (!sectionCardsCache[sectionId]) {
            setCurrentSectionIdForFetch(sectionId);
         }
      }
      else if (itemType === 'section' && sectionId && isCurrentlyExpanded) {
          if (currentSectionIdForFetch === sectionId) {
              setCurrentSectionIdForFetch(null);
          }
      }

      return newState;
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


  if (isLoading) {
    return <div className={styles.loading}>Loading Learning Path...</div>;
  }

  if (error && !learningPathData) {
    return <div className={styles.errorPage}>Error: {error}</div>;
  }

  if (!learningPathData) {
    return <div className={styles.notFound}>Learning Path not found or failed to load.</div>;
  }

  return (
    <div className={styles.pageContainer}>

      {/* Left Pane: Structure Navigation */}
      <aside className={styles.structureNavPane}>
        <div className={styles.navHeader}>
           {/* Optional: Back button */}
           {/* <Link href="/my-paths" className={styles.backLink}>← My Paths</Link> */}
           <h1 className={styles.navPathTitle}>{learningPathData.title}</h1>
           {learningPathData.description && <p className={styles.navPathDescription}>{learningPathData.description}</p>}
           {/* Display meta like status, difficulty etc. */}
           <div className={styles.pathMetaHeader}>
                <span>{learningPathData.category}</span>
                <span>{learningPathData.difficulty_level}</span>
                <span>{learningPathData.estimated_days} days</span>
                {renderStatusIndicator()}
           </div>
           {error && <p className={styles.inlineError}>Error loading details: {error}</p>}
        </div>

        {/* Course/Section/Card List */}
        <ul className={styles.navCourseList}>
          {learningPathData.courses.map((course, courseIndex) => {
            const courseItemId = `course-${course.id}`;
            const isCourseExpanded = !!expandedItems[courseItemId];
            return (
              <li key={course.id} className={styles.navCourseItem}>
                <button
                  onClick={() => toggleExpand(courseItemId, 'course')}
                  className={styles.navCourseHeaderButton}
                  aria-expanded={isCourseExpanded}
                >
                  <span className={`${styles.navToggleIcon} ${isCourseExpanded ? styles.expanded : ''}`}>▼</span>
                  <span className={styles.navCourseTitle}>
                    {courseIndex + 1}. {course.title}
                  </span>
                </button>
                {isCourseExpanded && (
                  <ul className={styles.navSectionList}>
                    {course.sections.map((section) => {
                      const sectionItemId = `section-${section.id}`;
                      const isSectionExpanded = !!expandedItems[sectionItemId];
                      const cards = sectionCardsCache[section.id];
                      // Use currentSectionIdForFetch to check loading state
                      const isLoadingThisSection = currentSectionIdForFetch === section.id && isFetchingSection;
                      const cardCount = cards ? cards.length : (isLoadingThisSection ? '...' : '?');

                      return (
                        <li key={section.id} className={styles.navSectionItem}>
                          <button
                            onClick={() => toggleExpand(sectionItemId, 'section', section.id)}
                            className={styles.navSectionHeaderButton}
                            aria-expanded={isSectionExpanded}
                          >
                            <span className={`${styles.navToggleIcon} ${isSectionExpanded ? styles.expanded : ''}`}>▼</span>
                            <span className={styles.navSectionTitle}>{section.title}</span>
                            <span className={styles.navCardCountInfo}>
                                {isLoadingThisSection ? <span className={styles.loadingText}>Loading...</span> : `(${cardCount} cards)`}
                            </span>
                          </button>
                          {isSectionExpanded && ( // Only show card list if section is expanded
                            <ul className={styles.navCardList}>
                              {isLoadingThisSection ? (
                                <li className={styles.navLoadingCards}>Loading cards...</li>
                              ) : cards && cards.length > 0 ? (
                                cards.map((card) => (
                                  <li key={card.id} className={styles.navCardItem}>
                                    <button
                                      // Use handleCardSelect to update main view
                                      onClick={() => handleCardSelect(card, section.id, cards)}
                                      className={`${styles.navCardLink} ${selectedCard?.id === card.id ? styles.selectedCard : ''}`}
                                    >
                                      {card.keyword}
                                    </button>
                                  </li>
                                ))
                              ) : cards && cards.length === 0 ? (
                                <li className={styles.navNoCards}>No cards in this section.</li>
                              ) : (
                                // Should not happen if toggleExpand triggers fetch correctly
                                <li className={styles.navNoCards}>Expand section to load cards.</li>
                              )}
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

      {/* Right Pane: Detail Content */}
      <main className={styles.detailPane}>
        {currentViewMode === 'structure' && !selectedCard && (
          <div className={styles.detailPlaceholder}>
            <h2>Select a Card</h2>
            <p>Choose a card from the navigation on the left to view its details.</p>
            {/* You could also show path overview info here if desired */}
          </div>
        )}

        {currentViewMode === 'card' && selectedCard && selectedCardSectionId && (
          <div className={styles.cardDetailView}>
             {/* Card Title */}
             <h2 className={styles.cardTitle}>{selectedCard.keyword}</h2>

             {/* Card Content */}
             <div className={styles.cardContent}>
                 {selectedCard.card_type && <p><strong>Type:</strong> {selectedCard.card_type}</p>}
                 {selectedCard.tags && <p><strong>Tags:</strong> {selectedCard.tags.join(', ')}</p>}
                 {selectedCard.question && <div className={styles.cardSection}><h3>Question</h3><p>{selectedCard.question}</p></div>}
                 {selectedCard.answer && <div className={styles.cardSection}><h3>Answer</h3><p>{selectedCard.answer}</p></div>}
                 {selectedCard.explanation && <div className={styles.cardSection}><h3>Explanation</h3><p>{selectedCard.explanation}</p></div>}
                 <div className={styles.cardSection}><h3>Resources</h3>{renderResources(selectedCard.resources || {})}</div>
             </div>

             {/* Card Navigation */}
             <div className={styles.cardNavigation}>
                 <button
                     className={styles.navButton} // Standard nav button style
                     onClick={navigateToPreviousCard}
                     // Disable button if it's the very first card
                     disabled={getCurrentCardIndex() === 0}
                 >
                     ← Previous
                 </button>
                 <div className={styles.cardCounter}>
                     {`${getCurrentCardIndex() + 1} / ${selectedCardSectionCards.length}`}
                 </div>
                 <button
                     // Apply the primary action style to the Next/Finish button
                     className={`${styles.navButton} ${styles.nextAction}`}
                     onClick={navigateToNextCard}
                     // No need to disable the next button usually,
                     // as clicking it on the last card triggers completion.
                 >
                     {hasNextCard() ? 'Next →' : 'Finish Section →'}
                 </button>
             </div>
          </div>
        )}

        {currentViewMode === 'completion' && completionInfo && (
          <div className={styles.completionView}>
            <h2>🎉 Section Complete! 🎉</h2>
            <p>You've finished: <strong>{completionInfo.completedSectionTitle}</strong></p>
            {completionInfo.nextItem?.type === 'section' && <button onClick={handleNavigateNext} className={styles.navButton}>Go to Next Section: {completionInfo.nextItem.title} →</button>}
            {completionInfo.nextItem?.type === 'course' && <button onClick={handleNavigateNext} className={styles.navButton}>Start Next Course: {completionInfo.nextItem.title} →</button>}
            {completionInfo.nextItem?.type === 'end' && <div><p><strong>You've finished the entire learning path!</strong></p><button onClick={handleNavigateNext} className={styles.navButton}>Finish Path</button></div>}
            <button onClick={navigateToPreviousCard} className={`${styles.navButton} ${styles.secondaryAction}`}>← Back to Last Card</button>
          </div>
        )}
      </main>

    </div>
  );
} 
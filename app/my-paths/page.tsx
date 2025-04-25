'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Keep if needed elsewhere, remove if not
import Link from 'next/link';
import {
  apiGetUserLearningPaths,
  // LearningPath, // No longer directly used for state
  UserLearningPathResponseItem, // Import the new type
  // TaskStatusResponse, // No longer needed for polling here
  // apiGetTaskStatus, // No longer needed for polling here
  apiDeleteUserLearningPath, // Import the new delete function
  // --- Imports from learning-path-detail ---
  apiGetFullLearningPath,
  apiGetLatestTaskForLearningPath,
  apiGetSectionWithCards,
  FullLearningPathResponse,
  TaskStatusResponse,
  CourseResponse, // Keep if used directly, otherwise FullLearningPathResponse might suffice
  SectionResponse, // Keep if used directly
  CardResponse,
  CardResource,
  NextItemInfo, // Ensure this type is defined or imported
  CompletionInfo, // Ensure this type is defined or imported
} from '@/services/api'; // Adjust path if needed
import styles from './my-paths.module.css'; // Create this CSS module

// Import the new component
import { PathDetailView } from './PathDetailView';

// Polling constants and types are no longer needed here
// const POLLING_INTERVAL = 8000;
// type TaskStatuses = Record<string, TaskStatusResponse>;

export default function MyLearningPathsPage() {
  const router = useRouter(); // Initialize router
  // State now holds the new response item type
  const [userPaths, setUserPaths] = useState<UserLearningPathResponseItem[]>([]);
  // Remove polling-related state
  // const [taskStatuses, setTaskStatuses] = useState<TaskStatuses>({});
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  // const router = useRouter(); // Remove if not used
  // Add state to track which path is currently being deleted
  const [deletingPathId, setDeletingPathId] = useState<number | null>(null);

  // --- State for Selected Path Details (from learning-path-detail) ---
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [currentSectionIdForFetch, setCurrentSectionIdForFetch] = useState<number | null>(null); // Renamed to avoid conflict
  const [isFetchingSection, setIsFetchingSection] = useState(false);
  const [sectionCardsCache, setSectionCardsCache] = useState<Record<number, CardResponse[]>>({});
  const [selectedCardSectionCards, setSelectedCardSectionCards] = useState<CardResponse[]>([]);
  const [selectedCardSectionId, setSelectedCardSectionId] = useState<number | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<'structure' | 'card' | 'completion'>('structure');
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  const [autoSelectFirstCardInSectionId, setAutoSelectFirstCardInSectionId] = useState<number | null>(null);

  // Remove polling refs and functions
  // const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  // const stopPolling = useCallback(...)
  // const pollStatus = useCallback(...)
  // const startPolling = useCallback(...)

  // Fetch initial data using the updated API call
  const fetchUserPaths = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    setDeletingPathId(null);
    // Reset detail view when reloading list
    setSelectedPathId(null);
    setLearningPathData(null);
    setDetailError(null);
    // Reset all detail-related states
    setTaskStatus(null);
    setSelectedCard(null);
    setExpandedItems({});
    setIsLoadingDetails(false); // Ensure detail loading is false if list is reloaded
    setIsFetchingStatus(false);
    setCurrentSectionIdForFetch(null);
    setIsFetchingSection(false);
    setSectionCardsCache({});
    setSelectedCardSectionCards([]);
    setSelectedCardSectionId(null);
    setCurrentViewMode('structure');
    setCompletionInfo(null);
    setAutoSelectFirstCardInSectionId(null);

    try {
      // Call the updated API function
      const paths = await apiGetUserLearningPaths();
      setUserPaths(paths);

      // Remove polling initiation logic (lines 95-121 from original file)
      // The new endpoint doesn't provide task IDs/status to start polling

    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setListError(err.message || 'Failed to load your learning paths. Please try again.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Initial fetch on mount - remove polling cleanup
  useEffect(() => {
    fetchUserPaths();
    // Remove polling cleanup logic (lines 133-139 from original file)
    // return () => { ... };
  }, [fetchUserPaths]); // Only fetchUserPaths dependency

  // --- Fetch Details for Selected Path ---
  const fetchPathDetails = useCallback(async (pathId: number) => {
    if (!pathId) return;

    setIsLoadingDetails(true);
    setDetailError(null);
    setLearningPathData(null);
    setTaskStatus(null);
    setSelectedCard(null);
    setExpandedItems({});
    setCurrentSectionIdForFetch(null);
    setSectionCardsCache({}); // Clear cache for the new path
    setSelectedCardSectionCards([]);
    setSelectedCardSectionId(null);
    setCurrentViewMode('structure');
    setCompletionInfo(null);
    setAutoSelectFirstCardInSectionId(null);
    setIsFetchingStatus(false); // Reset status fetching state
    setIsFetchingSection(false); // Reset section fetching state

    try {
      // 1. Fetch the FULL learning path structure
      const pathData = await apiGetFullLearningPath(pathId);
      setLearningPathData(pathData);

      // 2. Fetch the latest task status (optional)
      if (pathData) {
        setIsFetchingStatus(true);
        try {
          const latestTask = await apiGetLatestTaskForLearningPath(pathId);
          setTaskStatus(latestTask);
        } catch (taskError: any) {
          console.error("Failed to fetch latest task status:", taskError);
          // Optionally set a non-blocking error message for status only
        } finally {
          setIsFetchingStatus(false);
        }
      }
    } catch (err: any) {
      console.error(`Failed to load details for path ${pathId}:`, err);
      setDetailError(err.message || `Failed to load details for path ${pathId}. Please try again.`);
      setLearningPathData(null); // Ensure data is null on error
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // --- Handler for Selecting a Path from the List ---
  const handlePathSelect = (pathId: number) => {
    if (pathId === selectedPathId && learningPathData) return; // Avoid refetching if already selected and loaded
    setSelectedPathId(pathId);
    fetchPathDetails(pathId); // Trigger detail fetch
  };

  // --- Handler for Deleting a Path ---
  const handleDeletePath = async (pathToDeleteId: number) => {
    if (!window.confirm('Are you sure you want to delete this learning path? This action cannot be undone.')) {
      return;
    }
    setDeletingPathId(pathToDeleteId);
    setListError(null);
    try {
      await apiDeleteUserLearningPath(pathToDeleteId);
      setUserPaths(currentPaths => currentPaths.filter(p => p.learning_path_id !== pathToDeleteId));
      // If the deleted path was the selected one, clear the detail view
      if (selectedPathId === pathToDeleteId) {
        setSelectedPathId(null);
        setLearningPathData(null);
        setDetailError(null);
        // Reset other detail states as well
        setTaskStatus(null);
        setSelectedCard(null);
        setExpandedItems({});
        setIsLoadingDetails(false);
        setIsFetchingStatus(false);
        setCurrentSectionIdForFetch(null);
        setIsFetchingSection(false);
        setSectionCardsCache({});
        setSelectedCardSectionCards([]);
        setSelectedCardSectionId(null);
        setCurrentViewMode('structure');
        setCompletionInfo(null);
        setAutoSelectFirstCardInSectionId(null);
      }
    } catch (err: any) {
      console.error(`Failed to delete path ${pathToDeleteId}:`, err);
      setListError(err.message || 'Failed to delete the learning path. Please try again.');
    } finally {
      setDeletingPathId(null);
    }
  };

  // --- Logic moved from learning-path-detail (Helper Functions) ---

  // Function to fetch cards for a section (triggered by toggleExpand)
  const fetchSectionCards = useCallback(async (sectionId: number) => {
    if (!sectionId || sectionCardsCache[sectionId]) {
      // If data is in cache and we need to auto-select, do it now
      if (sectionId && autoSelectFirstCardInSectionId === sectionId && sectionCardsCache[sectionId]) {
        const cachedCards = sectionCardsCache[sectionId];
        if (cachedCards.length > 0) {
          handleCardSelect(cachedCards[0], sectionId, cachedCards, true); // Pass autoSelect flag
        } else {
          setSelectedCard(null);
          setSelectedCardSectionId(null);
          setSelectedCardSectionCards([]);
          setCurrentViewMode('structure');
        }
        setAutoSelectFirstCardInSectionId(null); // Reset flag
      }
      return;
    }
  }, [sectionCardsCache, autoSelectFirstCardInSectionId]); // Add dependencies

  // Effect to trigger fetchSectionCards when currentSectionIdForFetch changes
  useEffect(() => {
    if (currentSectionIdForFetch) {
      fetchSectionCards(currentSectionIdForFetch);
    }
  }, [currentSectionIdForFetch, fetchSectionCards]);

  // Effect to fetch section cards when currentSectionIdForFetch changes or cache updates
  useEffect(() => {
    // Don't fetch if no section is targeted or if we are already fetching it
    if (!currentSectionIdForFetch || isFetchingSection) return;

    // --- Check cache first ---
    if (sectionCardsCache[currentSectionIdForFetch]) {
      const cachedCards = sectionCardsCache[currentSectionIdForFetch];
      // No need to setCurrentSectionCards here, cache is the source of truth for LearningPathCourseItem

      // --- Check for auto-select intent (Cache Hit) ---
      if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) {
        if (cachedCards.length > 0) {
          handleCardSelect(cachedCards[0], currentSectionIdForFetch, cachedCards, true);
        } else {
          // Section has no cards, clear selection if it was targeting this section
          setSelectedCard(null);
          setSelectedCardSectionId(null);
          setSelectedCardSectionCards([]);
          setCurrentViewMode('structure');
        }
        setAutoSelectFirstCardInSectionId(null); // Reset flag
      }
      // --- End auto-select check ---

      // Clear the fetch trigger since we found it in the cache
      setCurrentSectionIdForFetch(null);
      return; // Already have the data, no need to fetch
    }
    // --- End cache check ---

    // --- Fetch if not in cache ---
    const fetchCards = async () => {
      setIsFetchingSection(true);
      // No need to setCurrentSectionCards([]) here

      try {
        const sectionData = await apiGetSectionWithCards(currentSectionIdForFetch);
        const cards = sectionData.cards || [];
        setSectionCardsCache(prevCache => ({
          ...prevCache,
          [currentSectionIdForFetch]: cards,
        }));

        // --- Check for auto-select intent (Fetch Success) ---
        if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) {
          if (cards.length > 0) {
            handleCardSelect(cards[0], currentSectionIdForFetch, cards, true);
          } else {
             // Section has no cards, clear selection
            setSelectedCard(null);
            setSelectedCardSectionId(null);
            setSelectedCardSectionCards([]);
            setCurrentViewMode('structure');
          }
          setAutoSelectFirstCardInSectionId(null); // Reset flag
        }
        // --- End auto-select check ---

      } catch (err: any) {
        console.error(`Failed to fetch cards for section ${currentSectionIdForFetch}:`, err);
        // Cache empty array on error to prevent refetch loops
        setSectionCardsCache(prevCache => ({
          ...prevCache,
          [currentSectionIdForFetch]: [],
        }));
        // --- Also clear selection and flag on fetch error if auto-selecting ---
        if (autoSelectFirstCardInSectionId === currentSectionIdForFetch) {
          setSelectedCard(null);
          setSelectedCardSectionId(null);
          setSelectedCardSectionCards([]);
          setCurrentViewMode('structure');
          setAutoSelectFirstCardInSectionId(null);
        }
        // --- End error handling ---
      } finally {
        setIsFetchingSection(false);
        // Clear the trigger *after* the fetch attempt is complete
        // Check again in case it changed while fetching
        if (currentSectionIdForFetch === currentSectionIdForFetch) { // This check seems redundant, let's simplify
             setCurrentSectionIdForFetch(null);
        }
      }
    };

    fetchCards();
    // Dependencies: Trigger when the target section ID changes,
    // or when the cache changes (e.g., after a fetch completes),
    // or when an auto-select is requested.
  }, [currentSectionIdForFetch, sectionCardsCache, autoSelectFirstCardInSectionId, isFetchingSection]); // Add handleCardSelect if ESLint complains, but it should be stable if wrapped in useCallback elsewhere (which it is implicitly by being defined outside useEffect)

  // Toggle expand/collapse for courses/sections
  const toggleExpand = (itemId: string, itemType: 'course' | 'section', sectionId?: number) => {
    setExpandedItems(prev => {
      const isCurrentlyExpanded = !!prev[itemId];
      const newState = { ...prev, [itemId]: !isCurrentlyExpanded };

      // If expanding a section, set it to trigger card fetch (if needed)
      if (itemType === 'section' && sectionId && !isCurrentlyExpanded) {
        if (!sectionCardsCache[sectionId]) {
          setCurrentSectionIdForFetch(sectionId); // Use the renamed state setter
        }
      }
      // If collapsing a section that was actively loading, clear the fetch trigger
      else if (itemType === 'section' && sectionId && isCurrentlyExpanded) {
        if (currentSectionIdForFetch === sectionId) {
          setCurrentSectionIdForFetch(null); // Clear trigger if collapsing the loading one
        }
      }
      return newState;
    });
  };

  // --- Handle Card Selection (Navigate to Detail Page) ---
  const handleCardSelect = (card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect: boolean = false) => {
    // Instead of setting local state, navigate to the detail page
    // with query parameters indicating which card to show.
    if (selectedPathId) { // Ensure a path is selected
        router.push(`/learning-paths/${selectedPathId}?section=${sectionId}&card=${card.id}`);
    } else {
        console.warn("Cannot navigate to card, no path selected.");
    }

    // Remove the old state updates related to showing the card in this view:
    // setCurrentViewMode('card');
    // setSelectedCard(card);
    // setSelectedCardSectionId(sectionId);
    // setSelectedCardSectionCards(sectionCards);
  };

  // Render card resources (assuming this function exists or is defined)
  const renderResources = (resources: CardResource): JSX.Element => {
    // Implementation from learning-path-detail page
    const resourceEntries = Object.entries(resources).filter(([, value]) => value && value.length > 0);

    if (resourceEntries.length === 0) {
      return <p>No additional resources provided.</p>;
    }

    return (
      <ul className={styles.resourceList}>
        {resourceEntries.map(([key, value]) => (
          <li key={key}>
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
            {Array.isArray(value) ? (
              <ul>
                {value.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            ) : (
              <span> {value}</span> // Handle potential non-array values if needed
            )}
          </li>
        ))}
      </ul>
    );
  };


  // Render status badge (implementation from learning-path-detail)
  const renderStatusBadge = () => {
    if (isFetchingStatus) {
      return <span className={`${styles.statusBadge} ${styles.statusLoading}`}>Checking status...</span>;
    }
    if (!taskStatus) {
      // If no task found, assume generation is complete or wasn't tracked
      // We could show nothing or a default "Ready" status if path data exists
      return learningPathData ? <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>Ready</span> : null;
      // return null; // Or show nothing if no status is available
    }

    let statusText = taskStatus.status.replace('_', ' ').toUpperCase();
    let statusStyle = styles.statusUnknown;

    switch (taskStatus.status) {
      case 'completed':
        statusStyle = styles.statusCompleted;
        break;
      case 'pending':
      case 'received':
      case 'started':
      case 'running': // Combine running-like statuses
        statusStyle = styles.statusRunning;
        break;
      case 'failed':
      case 'timeout': // Treat timeout as failed
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


  // Card navigation logic (findNextItem, getCurrentCardIndex, hasPrevious/NextCard, navigateToPrevious/NextCard, handleNavigateNext)
  // --- findNextItem ---
  const findNextItem = (currentSectionId: number): NextItemInfo | null => {
    if (!learningPathData) return null;
    let currentCourseIndex = -1;
    let currentSectionIndex = -1;
    for (let i = 0; i < learningPathData.courses.length; i++) {
      const sectionIndex = learningPathData.courses[i].sections.findIndex(s => s.id === currentSectionId);
      if (sectionIndex !== -1) {
        currentCourseIndex = i;
        currentSectionIndex = sectionIndex;
        break;
      }
    }
    if (currentCourseIndex === -1) return null;
    const currentCourse = learningPathData.courses[currentCourseIndex];
    if (currentSectionIndex + 1 < currentCourse.sections.length) {
      const nextSection = currentCourse.sections[currentSectionIndex + 1];
      return { type: 'section', courseId: currentCourse.id, sectionId: nextSection.id, title: nextSection.title };
    }
    if (currentCourseIndex + 1 < learningPathData.courses.length) {
      const nextCourse = learningPathData.courses[currentCourseIndex + 1];
      if (nextCourse.sections && nextCourse.sections.length > 0) {
        const firstSectionOfNextCourse = nextCourse.sections[0];
        return { type: 'course', courseId: nextCourse.id, sectionId: firstSectionOfNextCourse.id, title: nextCourse.title };
      } else {
        return { type: 'end' };
      }
    }
    return { type: 'end' };
  };

  // --- getCurrentCardIndex ---
  const getCurrentCardIndex = () => {
    if (!selectedCard || !selectedCardSectionCards.length) return -1;
    return selectedCardSectionCards.findIndex(card => card.id === selectedCard.id);
  };

  // --- hasPreviousCard ---
  const hasPreviousCard = () => getCurrentCardIndex() > 0;

  // --- hasNextCardInSection --- (renamed for clarity)
  const hasNextCardInSection = () => {
    const currentIndex = getCurrentCardIndex();
    return currentIndex < selectedCardSectionCards.length - 1 && currentIndex !== -1;
  };


  // --- navigateToPreviousCard ---
  const navigateToPreviousCard = () => {
    if (currentViewMode === 'completion') {
      setCurrentViewMode('card');
      setCompletionInfo(null);
      return;
    }
    const currentIndex = getCurrentCardIndex();
    if (currentIndex > 0) {
      setSelectedCard(selectedCardSectionCards[currentIndex - 1]);
    } else if (currentIndex === 0) {
      // If on the first card, go back to structure view
      setCurrentViewMode('structure');
      setSelectedCard(null);
      // Optionally collapse the current section?
      // const sectionItemId = `section-${selectedCardSectionId}`;
      // setExpandedItems(prev => ({...prev, [sectionItemId]: false }));
    }
  };

  // --- navigateToNextCard ---
  const navigateToNextCard = () => {
    const currentIndex = getCurrentCardIndex();
    const totalCards = selectedCardSectionCards.length;

    if (currentIndex < totalCards - 1) {
      setSelectedCard(selectedCardSectionCards[currentIndex + 1]);
    } else if (currentIndex === totalCards - 1 && selectedCard && selectedCardSectionId !== null) {
      // Last card -> Completion View
      const nextInfo = findNextItem(selectedCardSectionId);
      let completedTitle = "Section";
      learningPathData?.courses.forEach(course => {
        const section = course.sections.find(s => s.id === selectedCardSectionId);
        if (section) completedTitle = section.title;
      });
      setCompletionInfo({ completedSectionTitle: completedTitle, nextItem: nextInfo });
      setCurrentViewMode('completion');
    }
  };

   // --- handleNavigateNext (from completion view) ---
   const handleNavigateNext = () => {
    if (!completionInfo || !completionInfo.nextItem || !learningPathData) return; // Add check for learningPathData
    const nextItem = completionInfo.nextItem;

    if (nextItem.type === 'end') {
      console.log("Learning Path Completed!");
      setCurrentViewMode('structure'); // Go back to structure
      setSelectedCard(null);
      setCompletionInfo(null);
      return;
    }

    setCurrentViewMode('structure'); // Go back to structure view first
    setCompletionInfo(null);
    setSelectedCard(null);

    if (nextItem.sectionId) {
      // Find the course containing the next section
      const courseContainingNextSection = learningPathData.courses.find(course =>
        course.sections.some(section => section.id === nextItem.sectionId)
      );

      if (courseContainingNextSection) {
        // Ensure the parent course and the target section are expanded
        const courseItemId = `course-${courseContainingNextSection.id}`;
        const sectionItemId = `section-${nextItem.sectionId}`;
        setExpandedItems(prev => ({
          ...prev,
          [courseItemId]: true,
          [sectionItemId]: true,
        }));

        // Set the flag to auto-select the first card of this section
        setAutoSelectFirstCardInSectionId(nextItem.sectionId);

        // Trigger fetch if not in cache, otherwise rely on useEffect/cache check
        if (!sectionCardsCache[nextItem.sectionId]) {
          setCurrentSectionIdForFetch(nextItem.sectionId);
        } else {
          // If already cached, trigger the auto-select check directly
          const cachedCards = sectionCardsCache[nextItem.sectionId];
          if (cachedCards.length > 0) {
            handleCardSelect(cachedCards[0], nextItem.sectionId, cachedCards, true);
          } else {
            setAutoSelectFirstCardInSectionId(null); // Reset flag if section has no cards
          }
        }
      } else {
        console.warn(`Could not find course containing section ID: ${nextItem.sectionId}`);
        // Handle case where course isn't found, maybe just go to structure view without expanding/selecting
      }
    }
  };



  // --- Helper for Path List Item Status (Simplified from original my-paths) ---
  const getPathDisplayStatus = (pathItem: UserLearningPathResponseItem): { text: string; className: string } => {
    if (pathItem.completed_at) {
      return { text: 'Completed', className: styles.statusCompleted };
    }
    if (pathItem.progress > 0) {
      return { text: `In Progress (${Math.round(pathItem.progress * 100)}%)`, className: styles.statusInProgress };
    }
    // Cannot determine 'Processing' from this endpoint alone. Default to Ready.
    return { text: 'Ready to Start', className: styles.statusReady };
  };


  // --- Main Render ---
  return (
    <div className={styles.pageContainer}> {/* Main container for two panes */}

      {/* Left Pane: Path List */}
      <aside className={styles.pathListPane}>
        <h1 className={styles.listTitle}>My Learning Paths</h1>

        {isLoadingList && (
          <div className={styles.listLoading}>Loading paths...</div>
        )}

        {listError && !isLoadingList && (
          <div className={styles.listErrorBox}>
            <p>Error: {listError}</p>
            <button onClick={fetchUserPaths} className={styles.retryButton}>Retry</button>
          </div>
        )}

        {!isLoadingList && !listError && userPaths.length === 0 && (
          <div className={styles.emptyState}>
            <p>You haven't started any learning paths yet.</p>
            {/* Add links to generate/browse */}
          </div>
        )}

{!isLoadingList && !listError && userPaths.length > 0 && (
          <ul className={styles.pathList}>
            {userPaths.map(pathItem => {
              const displayStatus = getPathDisplayStatus(pathItem);
              const pathDetailId = pathItem.learning_path_id;
              const listItemKey = pathItem.id; // Use UserLearningPath ID for key
              const isDeleting = deletingPathId === pathDetailId;
              const isSelected = selectedPathId === pathDetailId;

              return (
                <li
                  key={listItemKey}
                  className={`${styles.pathListItem} ${isDeleting ? styles.deleting : ''} ${isSelected ? styles.selected : ''}`}
                >
                  <button
                    className={styles.pathSelectButton}
                    onClick={() => handlePathSelect(pathDetailId)}
                    disabled={isDeleting || isLoadingList}
                    title={pathItem.learning_path.title || 'Untitled Path'}
                  >
                    <div className={styles.pathInfo}>
                      <h2 className={styles.pathTitleSmall}>{pathItem.learning_path.title || 'Untitled Path'}</h2>
                      <p className={styles.pathDescriptionSmall}>{pathItem.learning_path.description || 'No description.'}</p>
                      <span className={`${styles.statusBadgeSmall} ${displayStatus.className}`}>
                        {displayStatus.text}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right Pane: Path Details - Now uses the component */}
      <main className={styles.detailPane}>
        <PathDetailView
          selectedPathId={selectedPathId}
          learningPathData={learningPathData}
          isLoadingDetails={isLoadingDetails}
          detailError={detailError}
          taskStatus={taskStatus}
          isFetchingStatus={isFetchingStatus}
          currentViewMode={currentViewMode}
          selectedCard={selectedCard}
          selectedCardSectionId={selectedCardSectionId}
          selectedCardSectionCards={selectedCardSectionCards}
          completionInfo={completionInfo}
          expandedItems={expandedItems}
          sectionCardsCache={sectionCardsCache}
          isFetchingSection={isFetchingSection}
          currentSectionIdForFetch={currentSectionIdForFetch}
          toggleExpand={toggleExpand}
          handleCardSelect={handleCardSelect}
          navigateToPreviousCard={navigateToPreviousCard}
          navigateToNextCard={navigateToNextCard}
          handleNavigateNext={handleNavigateNext}
          getCurrentCardIndex={getCurrentCardIndex}
          hasPreviousCard={hasPreviousCard} // Pass if needed by component logic directly
          hasNextCardInSection={hasNextCardInSection}
          // styles={styles} // Pass styles object if PathDetailView doesn't import its own
        />
      </main>

    </div>
  );
} 
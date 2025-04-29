'use client';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';

import React, { useState, useEffect, useCallback, useRef, JSX } from 'react';
import { useRouter } from 'next/navigation'; // Keep if needed elsewhere, remove if not
import Link from 'next/link';
import {
  apiGetUserLearningPaths,
  UserLearningPathResponseItem, // Import the new type
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
import { useNotificationContext } from '@/context/NotificationContext'; // Import the context hook

// Import the new component
import { PathDetailView } from './PathDetailView';

// Polling constant
const POLLING_INTERVAL = 5000; // Check status every 5 seconds

export default function MyLearningPathsPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;

  const router = useRouter(); // Initialize router
  const [userPaths, setUserPaths] = useState<UserLearningPathResponseItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingPathId, setDeletingPathId] = useState<number | null>(null);

  // --- State for Selected Path Details ---
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null); // Overall task status
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [currentSectionIdForFetch, setCurrentSectionIdForFetch] = useState<number | null>(null); // Track which section fetch is in progress
  const [isFetchingSection, setIsFetchingSection] = useState(false);
  const [sectionCardsCache, setSectionCardsCache] = useState<Record<number, CardResponse[]>>({});
  const [selectedCardSectionCards, setSelectedCardSectionCards] = useState<CardResponse[]>([]);
  const [selectedCardSectionId, setSelectedCardSectionId] = useState<number | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<'structure' | 'card' | 'completion'>('structure');
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  const [autoSelectFirstCardInSectionId, setAutoSelectFirstCardInSectionId] = useState<number | null>(null);
  const [sectionReadyStatus, setSectionReadyStatus] = useState<Record<number, boolean>>({});

  const { setHasNewPaths } = useNotificationContext();

  // Ref for polling interval ID
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helper to check if overall task is active ---
  const isTaskActive = (status: TaskStatusResponse | null): boolean => {
    return !!status && ['pending', 'queued', 'starting', 'running'].includes(status.status);
  };

  // Fetch initial data using the updated API call
  const fetchUserPaths = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    setDeletingPathId(null);
    setSelectedPathId(null);
    setLearningPathData(null);
    setDetailError(null);
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
    setSectionReadyStatus({});
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    try {
      const paths = await apiGetUserLearningPaths();
      setUserPaths(paths);
    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setListError(err.message || 'Failed to load your learning paths. Please try again.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchUserPaths();
    setHasNewPaths(false);
  }, [fetchUserPaths, setHasNewPaths]);

  // --- Fetch Details for Selected Path ---
  const fetchPathDetails = useCallback(async (pathId: number) => {
    if (!pathId) return;

    setIsLoadingDetails(true);
    setDetailError(null);
    setLearningPathData(null);
    setTaskStatus(null);
    setSelectedCard(null);
    setExpandedItems({});
    setCurrentSectionIdForFetch(null); // Clear any ongoing section fetch
    setIsFetchingSection(false);
    setSectionCardsCache({}); // Clear cache for the new path
    setSelectedCardSectionCards([]);
    setSelectedCardSectionId(null);
    setCurrentViewMode('structure');
    setCompletionInfo(null);
    setAutoSelectFirstCardInSectionId(null);
    setIsFetchingStatus(false); // Reset status fetching state
    setSectionReadyStatus({}); // Reset section readiness for the new path
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    let initialTaskStatus: TaskStatusResponse | null = null;
    let fetchedPathData: FullLearningPathResponse | null = null;

    try {
      // 1. Fetch the FULL learning path structure
      fetchedPathData = await apiGetFullLearningPath(pathId);
      setLearningPathData(fetchedPathData);

      // 2. Fetch the latest task status
      if (fetchedPathData) {
        setIsFetchingStatus(true);
        try {
          initialTaskStatus = await apiGetLatestTaskForLearningPath(pathId);
          setTaskStatus(initialTaskStatus);
        } catch (taskError: any) {
          console.error("Failed to fetch latest task status:", taskError);
        } finally {
          setIsFetchingStatus(false);
        }
      }

      // 3. Initialize sectionReadyStatus based on initial task status
      if (fetchedPathData && initialTaskStatus && !isTaskActive(initialTaskStatus)) {
         // If task is already completed/failed, mark all sections as ready initially
         const initialReadyStatus: Record<number, boolean> = {};
         fetchedPathData.courses.forEach(course => {
             course.sections.forEach(section => {
                 initialReadyStatus[section.id] = true; // Mark as ready
             });
         });
         setSectionReadyStatus(initialReadyStatus);
         console.log("Initial task status is terminal, marking all sections as ready:", initialReadyStatus);
      } else {
          // Task is active or unknown, initialize as empty
          setSectionReadyStatus({});
          console.log("Initial task status is active or unknown, starting with empty section ready status.");
      }

    } catch (err: any) {
      console.error(`Failed to load details for path ${pathId}:`, err);
      setDetailError(err.message || `Failed to load details for path ${pathId}. Please try again.`);
      setLearningPathData(null); // Ensure data is null on error
      setSectionReadyStatus({}); // Clear readiness on error
      if (pollingIntervalRef.current) { // Stop polling on error
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // --- Handler for Selecting a Path from the List ---
  const handlePathSelect = (pathId: number) => {
    if (pathId === selectedPathId && learningPathData) return;
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
      if (selectedPathId === pathToDeleteId) {
        setSelectedPathId(null);
        setLearningPathData(null);
        setDetailError(null);
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
        setSectionReadyStatus({}); // Reset section readiness
        if (pollingIntervalRef.current) { // Stop polling
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err: any) {
      console.error(`Failed to delete path ${pathToDeleteId}:`, err);
      setListError(err.message || 'Failed to delete the learning path. Please try again.');
    } finally {
      setDeletingPathId(null);
    }
  };

  // --- Effect for Polling Overall Task Status ---
  useEffect(() => {
    const checkStatus = async () => {
      if (!selectedPathId) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        return;
      }

      console.log(`Polling overall task status for path ${selectedPathId}...`);
      let latestTask: TaskStatusResponse | null = null;
      try {
        latestTask = await apiGetLatestTaskForLearningPath(selectedPathId);
        setTaskStatus(latestTask); // Update status state

        if (!isTaskActive(latestTask)) {
          // Generation finished (completed, failed, timeout, unknown) or no task found
          console.log(`Polling stopped for path ${selectedPathId}. Final status: ${latestTask?.status}`);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;

          // Mark all sections as ready if task is complete/failed
          if (learningPathData && latestTask) { // Check latestTask exists
             const finalReadyStatus: Record<number, boolean> = {};
             learningPathData.courses.forEach(course => {
                 course.sections.forEach(section => {
                     finalReadyStatus[section.id] = true; // Mark all as ready/checked
                 });
             });
             setSectionReadyStatus(finalReadyStatus);
             console.log("Task finished polling, marking all sections as ready:", finalReadyStatus);
          }
          // Optional: Force re-fetch details if needed on completion?
          // await fetchPathDetails(selectedPathId); // Careful of loops
        } else {
           console.log(`Task for path ${selectedPathId} is still active: ${latestTask?.status}`);
           // Task still active, continue polling (interval handles this)
           // We don't update sectionReadyStatus here, toggleExpand handles individual checks
        }
      } catch (error) {
        console.error(`Error polling task status for path ${selectedPathId}:`, error);
        // Stop polling on error
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setTaskStatus(prev => ({ ...prev, status: 'unknown' } as TaskStatusResponse)); // Indicate error?
      }
    };

    // Start polling only if taskStatus is initially active and a path is selected
    if (isTaskActive(taskStatus) && selectedPathId) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(checkStatus, POLLING_INTERVAL);
      console.log(`Polling started for path ${selectedPathId} (initial status: ${taskStatus?.status})`);
    } else {
        // If task not active or no path selected, ensure polling is stopped
        if (pollingIntervalRef.current) {
            console.log(`Clearing polling interval (task active: ${isTaskActive(taskStatus)}, pathId: ${selectedPathId})`);
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        console.log(`Clearing polling interval on cleanup (pathId: ${selectedPathId})`);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // Run when taskStatus changes (to start/stop polling) or selectedPathId changes
  }, [taskStatus, selectedPathId, learningPathData]);

  // --- Define handleCardSelect *before* toggleExpand --- 
  const handleCardSelect = useCallback((card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect: boolean = false) => {
    if (selectedPathId) {
      router.push(`/${locale}/learning-paths/${selectedPathId}?section=${sectionId}&card=${card.id}`);
    } else {
        console.warn("Cannot navigate to card, no path selected.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPathId]); // router is stable

  // --- Toggle expand/collapse for courses/sections ---
  const toggleExpand = useCallback(async (itemId: string, itemType: 'course' | 'section', sectionId?: number) => {
    const isCurrentlyExpanded = !!expandedItems[itemId];
    setExpandedItems(prev => ({ ...prev, [itemId]: !isCurrentlyExpanded }));

    // Logic for fetching/checking section cards on EXPAND
    if (itemType === 'section' && sectionId && !isCurrentlyExpanded) {
        // Determine if we need to fetch: True if not in cache OR cache entry is empty array.
        const needsFetch = !sectionCardsCache.hasOwnProperty(sectionId) || sectionCardsCache[sectionId]?.length === 0;
        const isSectionMarkedReady = sectionReadyStatus[sectionId]; // Check current ready status

        console.log(`Expanding section ${sectionId}. Needs Fetch: ${needsFetch}, Already Marked Ready: ${isSectionMarkedReady}`);

        if (needsFetch) {
            setIsFetchingSection(true);
            setCurrentSectionIdForFetch(sectionId);
            try {
                console.log(`Fetching cards for section ${sectionId}...`);
                const sectionData = await apiGetSectionWithCards(sectionId);
                const cards = sectionData.cards || [];
                console.log(`Fetch successful for section ${sectionId}. Cards: ${cards.length}. Marking as ready.`);
                // Mark as ready on successful fetch
                setSectionReadyStatus(prev => ({ ...prev, [sectionId]: true }));
                // Cache the result (even if empty)
                setSectionCardsCache(prevCache => ({ ...prevCache, [sectionId]: cards }));

                // Handle auto-select after successful fetch
                if (autoSelectFirstCardInSectionId === sectionId) {
                    if (cards.length > 0) handleCardSelect(cards[0], sectionId, cards, true);
                    else setSelectedCard(null);
                    setAutoSelectFirstCardInSectionId(null);
                }
            } catch (err: any) {
                console.error(`Fetch/check failed for section ${sectionId}:`, err);
                // Fetch failed - DO NOT mark as ready. DO NOT cache.
                // UI will show generating state based on sectionReadyStatus[sectionId] being false/undefined.

                // Clear auto-select if the check failed
                if (autoSelectFirstCardInSectionId === sectionId) {
                    setSelectedCard(null);
                    setAutoSelectFirstCardInSectionId(null);
                }
            } finally {
                setIsFetchingSection(false);
                // Only clear currentSectionIdForFetch if it's the one we just finished
                setCurrentSectionIdForFetch(prev => (prev === sectionId ? null : prev));
            }
        } else {
            // Already have cards in cache, just handle auto-select if needed
             console.log(`Section ${sectionId} already has >0 cards in cache. Handling auto-select if necessary.`);
             if (autoSelectFirstCardInSectionId === sectionId) {
                 const cachedCards = sectionCardsCache[sectionId]; // We know this exists and is non-empty
                 if (cachedCards.length > 0) handleCardSelect(cachedCards[0], sectionId, cachedCards, true);
                 else setSelectedCard(null); // Should not happen based on needsFetch logic, but safe fallback
                 setAutoSelectFirstCardInSectionId(null);
             }
        }
    }
    // If collapsing a section that was actively loading, clear the fetch trigger
     else if (itemType === 'section' && sectionId && isCurrentlyExpanded) {
         if (currentSectionIdForFetch === sectionId) {
           setCurrentSectionIdForFetch(null);
           setIsFetchingSection(false);
         }
     }
  // Dependencies: Include everything read or called inside
  }, [expandedItems, sectionReadyStatus, sectionCardsCache, autoSelectFirstCardInSectionId, isFetchingSection, currentSectionIdForFetch, handleCardSelect, taskStatus]); // Added taskStatus back as it's read by isTaskActive indirectly via UI

  // --- Card Navigation Logic (wrapped in useCallback) ---
  // (Keep handleCardSelect defined above)

   const renderResources = useCallback((resources: CardResource): JSX.Element => {
     const resourceEntries = Object.entries(resources).filter(([, value]) => value && value.length > 0);
     if (resourceEntries.length === 0) return <p>No additional resources provided.</p>;
    return (
      <ul className={styles.resourceList}>
        {resourceEntries.map(([key, value]) => (
          <li key={key}>
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
            {Array.isArray(value) ? (
               <ul>{value.map((item, index) => <li key={index}>{item}</li>)}</ul>
             ) : ( <span> {value}</span> )}
          </li>
        ))}
      </ul>
    );
   }, []);

   const renderStatusBadge = useCallback(() => {
    if (isFetchingStatus) {
      return <span className={`${styles.statusBadge} ${styles.statusLoading}`}>Checking status...</span>;
    }
    if (!taskStatus) {
      return learningPathData ? <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>Ready</span> : null;
    }
    let statusText = taskStatus.status.replace('_', ' ').toUpperCase();
    let statusStyle = styles.statusUnknown;
    switch (taskStatus.status) {
       case 'completed': statusStyle = styles.statusCompleted; break;
       case 'pending': case 'queued': case 'starting': case 'running': statusStyle = styles.statusRunning; break;
       case 'failed': case 'timeout':
        statusStyle = styles.statusFailed;
         if (taskStatus.result_message) statusText += ` - ${taskStatus.result_message}`;
         else if (taskStatus.error_details) statusText += ` - Error`;
        break;
       default: statusStyle = styles.statusUnknown;
    }
    return <span className={`${styles.statusBadge} ${statusStyle}`}>{statusText}</span>;
   }, [isFetchingStatus, taskStatus, learningPathData]);

   const findNextItem = useCallback((currentSectionId: number): NextItemInfo | null => {
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
   }, [learningPathData]);

   const getCurrentCardIndex = useCallback(() => {
    if (!selectedCard || !selectedCardSectionCards.length) return -1;
    return selectedCardSectionCards.findIndex(card => card.id === selectedCard.id);
   }, [selectedCard, selectedCardSectionCards]);

   const hasPreviousCard = useCallback(() => getCurrentCardIndex() > 0, [getCurrentCardIndex]);

   const hasNextCardInSection = useCallback(() => {
    const currentIndex = getCurrentCardIndex();
     return currentIndex >= 0 && currentIndex < selectedCardSectionCards.length - 1;
   }, [getCurrentCardIndex, selectedCardSectionCards]);

   const navigateToPreviousCard = useCallback(() => {
    if (currentViewMode === 'completion') {
      setCurrentViewMode('card');
      setCompletionInfo(null);
      return;
    }
    const currentIndex = getCurrentCardIndex();
    if (currentIndex > 0) {
      setSelectedCard(selectedCardSectionCards[currentIndex - 1]);
    } else if (currentIndex === 0) {
      setCurrentViewMode('structure');
      setSelectedCard(null);
    }
   }, [currentViewMode, getCurrentCardIndex, selectedCardSectionCards]);

   const navigateToNextCard = useCallback(() => {
    const currentIndex = getCurrentCardIndex();
    const totalCards = selectedCardSectionCards.length;

    if (currentIndex < totalCards - 1) {
      setSelectedCard(selectedCardSectionCards[currentIndex + 1]);
    } else if (currentIndex === totalCards - 1 && selectedCard && selectedCardSectionId !== null) {
      const nextInfo = findNextItem(selectedCardSectionId);
      let completedTitle = "Section";
      learningPathData?.courses.forEach(course => {
        const section = course.sections.find(s => s.id === selectedCardSectionId);
        if (section) completedTitle = section.title;
      });
      setCompletionInfo({ completedSectionTitle: completedTitle, nextItem: nextInfo });
      setCurrentViewMode('completion');
    }
   }, [getCurrentCardIndex, selectedCardSectionCards, selectedCard, selectedCardSectionId, findNextItem, learningPathData]);

    const handleNavigateNext = useCallback(() => {
     if (!completionInfo || !completionInfo.nextItem || !learningPathData) return;
    const nextItem = completionInfo.nextItem;

    if (nextItem.type === 'end') {
      console.log("Learning Path Completed!");
       setCurrentViewMode('structure');
      setSelectedCard(null);
      setCompletionInfo(null);
      return;
    }

     setCurrentViewMode('structure');
    setCompletionInfo(null);
     setSelectedCard(null); // Deselect card when moving between sections/courses

    if (nextItem.sectionId) {
      const courseContainingNextSection = learningPathData.courses.find(course =>
        course.sections.some(section => section.id === nextItem.sectionId)
      );

      if (courseContainingNextSection) {
        const courseItemId = `course-${courseContainingNextSection.id}`;
        const sectionItemId = `section-${nextItem.sectionId}`;
         setExpandedItems(prev => ({ ...prev, [courseItemId]: true, [sectionItemId]: true }));
         setAutoSelectFirstCardInSectionId(nextItem.sectionId); // Set flag to auto-select

         // Trigger the check/fetch logic within toggleExpand manually if needed,
         // but since we set expandedItems, the next render might handle it.
         // However, toggleExpand handles the readiness check, so let's call it indirectly?
         // OR rely on the fact that the section *should* be ready if we finished the previous one?
         // Let's assume the polling marked it ready, or the upcoming toggleExpand call will handle it.
         // If section is not in cache yet, call toggleExpand to trigger the fetch/check
        if (!sectionCardsCache[nextItem.sectionId]) {
             console.log(`Navigating next to section ${nextItem.sectionId}, not in cache. Triggering expand.`);
             // We need to ensure toggleExpand runs *after* state updates for expansion/auto-select
             // Using a small timeout might work, or relying on useEffect dependencies.
             // Let's call toggleExpand directly here, assuming state updates synchronously enough for its logic
             // Note: This might double-call if expansion itself triggers toggleExpand via UI event simulation, but needed here
              toggleExpand(sectionItemId, 'section', nextItem.sectionId);
        } else {
             // Already cached, proceed with auto-select logic (now inside toggleExpand)
             console.log(`Navigating next to section ${nextItem.sectionId}, already in cache. Relying on auto-select.`);
             // handleCardSelect might be called inside toggleExpand if autoSelectFirstCardInSectionId is set
         }

      } else {
        console.warn(`Could not find course containing section ID: ${nextItem.sectionId}`);
      }
    }
   }, [completionInfo, learningPathData, sectionCardsCache, toggleExpand]); // Added toggleExpand dependency

  // --- Helper for Path List Item Status (Simplified from original my-paths) ---
  const getPathDisplayStatus = useCallback((pathItem: UserLearningPathResponseItem): { text: string; className: string } => {
    if (pathItem.completed_at) {
      return { text: t('my_paths.completed'), className: styles.statusCompleted }
    }
    if (pathItem.progress > 0) {
      return { text: t('my_paths.in_progress', { percent: Math.round(pathItem.progress * 100) }), className: styles.statusInProgress }
    }
    return { text: t('my_paths.ready_to_start'), className: styles.statusReady }
  }, []);

  // --- Main Render ---
  return (
    <div className={styles.pageContainer}>
      {/* Left Pane: Path List */}
      <aside className={styles.pathListPane}>
      <h1 className={styles.listTitle}>
        {t('my_paths.title')} {userPaths.length > 0 && `(${userPaths.length})`}
      </h1>
        {isLoadingList && <div className={styles.listLoading}>{t('my_paths.loading')}</div>}
        {listError && !isLoadingList && (
          <div className={styles.listErrorBox}>
            <p>{t('my_paths.error')}: {listError}</p>
            <button onClick={fetchUserPaths} className={styles.retryButton}>{t('common.retry')}</button>
          </div>
        )}
        {!isLoadingList && !listError && userPaths.length === 0 && (
          <div className={styles.emptyState}>
            <p>{t('my_paths.no_paths')}</p>
          </div>
        )}
{!isLoadingList && !listError && userPaths.length > 0 && (
          <ul className={styles.pathList}>
            {userPaths.map(pathItem => {
              const displayStatus = getPathDisplayStatus(pathItem);
              const pathDetailId = pathItem.learning_path_id;
              const listItemKey = pathItem.id;
              const isDeleting = deletingPathId === pathDetailId;
              const isSelected = selectedPathId === pathDetailId;
              return (
                <li key={listItemKey} className={`${styles.pathListItem} ${isDeleting ? styles.deleting : ''} ${isSelected ? styles.selected : ''}`}>
                  <button
                    className={styles.pathSelectButton}
                    onClick={() => handlePathSelect(pathDetailId)}
                    disabled={isDeleting || isLoadingList}
                    title={pathItem.learning_path.title || t('my_paths.untitled_path')}
                  >
                    <div className={styles.pathInfo}>
                      <h2 className={styles.pathTitleSmall}>
                        {pathItem.learning_path.title || t('my_paths.untitled_path')}
                      </h2>
                      <p className={styles.pathDescriptionSmall}>
                        {pathItem.learning_path.description || t('my_paths.no_description')}
                      </p>
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
          taskStatus={taskStatus} // Pass overall task status
          isFetchingStatus={isFetchingStatus}
          currentViewMode={currentViewMode}
          selectedCard={selectedCard}
          selectedCardSectionId={selectedCardSectionId} // Keep passing these for card view logic
          selectedCardSectionCards={selectedCardSectionCards} // Keep passing these for card view logic
          completionInfo={completionInfo}
          expandedItems={expandedItems}
          sectionCardsCache={sectionCardsCache}
          isFetchingSection={isFetchingSection}
          currentSectionIdForFetch={currentSectionIdForFetch} // Pass for loading indicator
          toggleExpand={toggleExpand}
          handleCardSelect={handleCardSelect}
          navigateToPreviousCard={navigateToPreviousCard}
          navigateToNextCard={navigateToNextCard}
          handleNavigateNext={handleNavigateNext}
          getCurrentCardIndex={getCurrentCardIndex}
          hasPreviousCard={hasPreviousCard()}
          hasNextCardInSection={hasNextCardInSection()}
          handleDeletePath={handleDeletePath}
          deletingPathId={deletingPathId}
          sectionReadyStatus={sectionReadyStatus} // NEW: Pass section readiness map
        />
      </main>
    </div>
  );
} 
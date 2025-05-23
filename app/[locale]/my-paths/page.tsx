'use client';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import React, { useState, useEffect, useCallback, useRef, JSX } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  apiGetUserLearningPaths,
  UserLearningPathResponseItem, // Import the new type
  apiDeleteUserLearningPath, // Import the new delete function
  // --- Imports from learning-path-detail ---
  apiGetLatestTaskForLearningPath,
  apiGetSectionWithCards,
  FullLearningPathResponse,
  UserLearningPathResponse, // <<< ADDED IMPORT
  TaskStatusResponse,
  CourseResponse, // Keep if used directly, otherwise FullLearningPathResponse might suffice
  SectionResponse, // Keep if used directly
  CardResponse,
  CardResource,
  NextItemInfo, // Ensure this type is defined or imported
  CompletionInfo, // Ensure this type is defined or imported
  apiGetUserLearningPathsBasic, // Import the basic fetch function
  LearningPathBasicInfo,        // Import the basic info type
  apiGetUserLearningPath,
  apiGetFullLearningPath,
} from '@/services/api'; // Adjust path if needed
import styles from './my-paths.module.css'; // Create this CSS module
import { useNotificationContext } from '@/context/NotificationContext'; // Import the context hook

// Import the new component
import { PathDetailView } from './PathDetailView';

// Polling constant
const POLLING_INTERVAL = 5000; // Check status every 5 seconds

export default function MyLearningPathsPage() {
  const isClient = useIsClient();
  const { t } = useTranslation('common');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';

  const router = useRouter(); // Initialize router
  const [userPaths, setUserPaths] = useState<LearningPathBasicInfo[]>([]);
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
      const paths = await apiGetUserLearningPathsBasic();
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
      // 1. Fetch the FULL learning path structure.
      // Note: apiGetFullLearningPath currently returns a UserLearningPathResponse structure.
      const rawPathDataFromApi = await apiGetFullLearningPath(pathId) as unknown as UserLearningPathResponse | null;

      if (rawPathDataFromApi && rawPathDataFromApi.learning_path) {
        const lp = rawPathDataFromApi.learning_path; // Alias for cleaner access
        fetchedPathData = {
          id: lp.id,
          title: lp.title,
          description: lp.description,
          category: lp.category,
          difficulty_level: lp.difficulty_level,
          estimated_days: lp.estimated_days,
          courses: Array.isArray(lp.courses) ? 
            lp.courses.map(course => {
              // Map course from UserLearningPathResponse.learning_path.courses to CourseResponse
              return {
                id: course.id,
                title: course.title,
                description: course.description,
                progress: course.progress || 0,
                estimated_days: 0, // Default, as not in UserLearningPathResponse.course
                created_at: new Date().toISOString(), // Default
                updated_at: new Date().toISOString(), // Default
                sections: Array.isArray(course.sections) ? course.sections.map(section => {
                  // Map section from UserLearningPathResponse.learning_path.courses.sections to SectionResponse
                  return {
                    id: section.id,
                    title: section.title,
                    description: section.description,
                    order_index: 0, // Default, as not in UserLearningPathResponse.section
                    estimated_days: 0, // Default
                    progress: section.progress || 0,
                    created_at: new Date().toISOString(), // Default
                    updated_at: new Date().toISOString(), // Default
                    cards: Array.isArray(section.cards) ? section.cards.map(card => {
                      // Map card from UserLearningPathResponse.learning_path.courses.sections.cards to CardResponse
                      return {
                        id: card.id,
                        keyword: card.title, // card.title from UserLearningPathResponse is used as keyword
                        question: '', // Default, to be filled by merge or specific fetch later
                        answer: '',     // Default
                        explanation: '', // Default
                        resources: {}, // Default
                        level: 'beginner', // Default
                        tags: [], // Default
                        created_at: new Date().toISOString(), // Default
                        updated_at: new Date().toISOString(), // Default
                        is_completed: card.is_completed || false,
                      };
                    }) : [],
                  };
                }) : [],
              };
            }) : [],
          sections: Array.isArray(lp.sections) ? lp.sections.map(section => {
            // This maps the top-level sections if any, similar to course sections
            return {
              id: section.id,
              title: section.title,
              description: section.description,
              order_index: 0, // Default
              estimated_days: 0, // Default
              progress: section.progress || 0,
              created_at: new Date().toISOString(), // Default
              updated_at: new Date().toISOString(), // Default
              cards: Array.isArray(section.cards) ? section.cards.map((card: { id: number; title: string; is_completed: boolean; question?: string; answer?: string; explanation?: string; resources?: any; level?: string; tags?: string[], created_at?: string; updated_at?: string }) => ({
                id: card.id,
                keyword: card.title, 
                question: card.question || '', 
                answer: card.answer || '', 
                explanation: card.explanation || '', 
                resources: card.resources || {}, 
                level: card.level || 'beginner', 
                tags: card.tags || [], 
                created_at: card.created_at || new Date().toISOString(), 
                updated_at: card.updated_at || new Date().toISOString(),
                is_completed: card.is_completed || false,
              })) : [],
            };
          }) : [],
          created_at: lp.created_at,
          updated_at: lp.updated_at,
        };
        console.log("Transformed data for fetchedPathData from apiGetFullLearningPath:", 
          JSON.stringify({
            id: fetchedPathData?.id,
            title: fetchedPathData?.title,
            coursesLength: fetchedPathData?.courses?.length,
            firstCourse: fetchedPathData?.courses?.[0] ? {
              id: fetchedPathData.courses[0].id,
              title: fetchedPathData.courses[0].title,
              sectionsLength: fetchedPathData.courses[0].sections?.length,
            } : null
          }, null, 2)
        );
      } else {
        console.error(`Failed to get valid learning_path object from apiGetFullLearningPath for pathId: ${pathId}. Response:`, rawPathDataFromApi);
        setDetailError(`Failed to load initial path structure for path ${pathId}. The response might be malformed.`);
        setIsLoadingDetails(false);
        return; // Exit if primary data fetch failed or was malformed
      }
      
      // Enhance the fetchedPathData by adding sections directly from user-specific data
      // At this point, fetchedPathData should have a valid .courses array.
      try {
        const userPathData = await apiGetUserLearningPath(pathId); // This is UserLearningPathResponse
        console.log("Raw user learning path data from apiGetUserLearningPath:", 
          JSON.stringify({
            id: userPathData?.learning_path?.id,
            title: userPathData?.learning_path?.title,
            coursesLength: userPathData?.learning_path?.courses?.length,
            firstCourse: userPathData?.learning_path?.courses?.[0] ? {
              id: userPathData.learning_path.courses[0].id,
              title: userPathData.learning_path.courses[0].title,
              sectionsLength: userPathData.learning_path.courses[0].sections?.length,
            } : null
          }, null, 2)
        );
        
        // Check if fetchedPathData and its courses are valid before proceeding with merge
        if (fetchedPathData && Array.isArray(fetchedPathData.courses) &&
            userPathData && userPathData.learning_path && Array.isArray(userPathData.learning_path.courses)) {
          
          fetchedPathData.courses = fetchedPathData.courses.map(course => { 
            const userCourse = userPathData.learning_path.courses.find(c => c.id === course.id);
            
            const originalSectionsOfThisCourse = Array.isArray(course.sections) ? course.sections : [];

            if (userCourse && Array.isArray(userCourse.sections)) {
              console.log(`Found matching userCourse ${userCourse.id} with ${userCourse.sections.length} sections for course ${course.id}`);
              
              course.sections = userCourse.sections.map(userSection => { 
                const originalSection = originalSectionsOfThisCourse.find(s => s.id === userSection.id);
                const cardsFromUserSection = Array.isArray(userSection.cards) ? userSection.cards : [];
                
                const mappedCards = cardsFromUserSection.map(userCard => { 
                  const cardsFromOriginalSection = (originalSection && Array.isArray(originalSection.cards)) ? originalSection.cards : [];
                  const originalCard = cardsFromOriginalSection.find(c => c.id === userCard.id);
                  return {
                    id: userCard.id,
                    keyword: userCard.title, // Assuming userCard.title is the keyword
                    question: originalCard?.question ?? '',
                    answer: originalCard?.answer ?? '',
                    explanation: originalCard?.explanation ?? '',
                    resources: originalCard?.resources ?? {},
                    level: originalCard?.level ?? 'beginner',
                    tags: originalCard?.tags ?? [],
                    created_at: originalCard?.created_at ?? '', 
                    updated_at: originalCard?.updated_at ?? '', 
                    is_completed: userCard.is_completed || false, 
                  };
                });
                
                return {
                  id: userSection.id,
                  title: userSection.title,
                  description: userSection.description || (originalSection?.description || ''),
                  order_index: originalSection?.order_index ?? 0, 
                  estimated_days: originalSection?.estimated_days ?? 1, 
                  cards: mappedCards,
                  created_at: originalSection?.created_at ?? '', 
                  updated_at: originalSection?.updated_at ?? '', 
                  progress: userSection.progress || 0 
                };
              });
              
              userCourse.sections.forEach(userSection => { 
                const cardsToConsiderForCache = Array.isArray(userSection.cards) ? userSection.cards : [];
                if (cardsToConsiderForCache.length > 0) {
                  const populatedSection = course.sections.find(s => s.id === userSection.id);
                  if (populatedSection && Array.isArray(populatedSection.cards) && populatedSection.cards.length > 0) { 
                    setSectionCardsCache(prev => ({ ...prev, [userSection.id]: populatedSection.cards }));
                    setSectionReadyStatus(prev => ({ ...prev, [userSection.id]: true }));
                  }
                }
              });
            } else if (userCourse) {
              console.warn(`User course ${userCourse.id} (for course ${course.id}) has 'sections' data that is not an array or is missing. Using sections from fetched path data.`);
              course.sections = originalSectionsOfThisCourse;
            } else {
              console.warn(`No matching user course data found for course ${course.id}, or user course sections problematic. Using sections from fetched path data.`);
              course.sections = originalSectionsOfThisCourse;
            }
            return course;
          });
        } else {
          console.warn("Course data merging was skipped. Conditions not met. Details:", {
            fetchedPathDataExists: !!fetchedPathData,
            fetchedPathDataCoursesIsArray: fetchedPathData ? Array.isArray(fetchedPathData.courses) : 'N/A',
            userPathDataExists: !!userPathData,
            userPathLearningPathExists: userPathData ? !!userPathData.learning_path : 'N/A',
            userPathLearningPathCoursesIsArray: userPathData && userPathData.learning_path ? Array.isArray(userPathData.learning_path.courses) : 'N/A',
          });
          // If fetchedPathData.courses is still not an array here, it means the initial transformation failed or was incomplete.
          // The earlier check `if (rawPathDataFromApi && rawPathDataFromApi.learning_path)` and the assignment to `fetchedPathData.courses`
          // should ensure `fetchedPathData.courses` is an array.
          if (fetchedPathData && !Array.isArray(fetchedPathData.courses)) {
             console.log(`Corrective action: fetchedPathData.courses was not an array (type: ${typeof fetchedPathData.courses}). Initializing to [].`);
             fetchedPathData.courses = [];
          }
        }
      } catch (err) {
        console.error("Could not fetch or merge user-specific learning path data:", err);
        // Potentially set an error state here or allow to proceed with partially fetched data if desired.
      }
      
      setLearningPathData(fetchedPathData); // This should now have the correct title and courses structure
      
      console.log("DEBUG: Enhanced learning path data (after potential merge):", {
        id: fetchedPathData?.id,
        title: fetchedPathData?.title, // Should be defined now
        hasCoursesArray: Array.isArray(fetchedPathData?.courses),
        coursesLength: fetchedPathData?.courses?.length, // Should reflect actual courses
        courses: fetchedPathData?.courses?.map(course => ({
          id: course.id,
          title: course.title,
          hasSectionsArray: Array.isArray(course.sections),
          sectionsLength: course.sections?.length,
          sectionTitles: course.sections?.map(s => s.title)
        }))
      });

      // 2. Fetch the latest task status
      if (fetchedPathData) { // Check if fetchedPathData is not null
        setIsFetchingStatus(true);
        try {
          initialTaskStatus = await apiGetLatestTaskForLearningPath(pathId);
          setTaskStatus(initialTaskStatus);
        } catch (taskError: any) {
          console.error("Failed to fetch latest task status:", taskError);
          // Optionally set an error state for task status
        } finally {
          setIsFetchingStatus(false);
        }
      }

      // 3. Initialize sectionReadyStatus based on initial task status and existing cards
      if (fetchedPathData && Array.isArray(fetchedPathData.courses)) { // Ensure courses array exists
        const initialReadyStatus: Record<number, boolean> = {};
        const taskComplete = initialTaskStatus && !isTaskActive(initialTaskStatus);
        
        fetchedPathData.courses.forEach(course => {
          if (course.sections && Array.isArray(course.sections)) {
            course.sections.forEach(section => {
              const hasCards = section.cards && Array.isArray(section.cards) && section.cards.length > 0;
              if (taskComplete || hasCards) {
                initialReadyStatus[section.id] = true;
                if (hasCards) {
                  setSectionCardsCache(prev => ({ ...prev, [section.id]: section.cards }));
                }
              }
            });
          }
        });
        setSectionReadyStatus(initialReadyStatus);
        console.log("Initialized section ready status based on task status and existing cards:", initialReadyStatus);
      } else {
        setSectionReadyStatus({});
        console.log("No path data or courses array for initializing section ready status.");
      }

    } catch (err: any) {
      console.error(`Failed to load details for path ${pathId}:`, err);
      setDetailError(err.message || `Failed to load details for path ${pathId}. Please try again.`);
      setLearningPathData(null); 
      setSectionReadyStatus({}); 
      if (pollingIntervalRef.current) { 
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
      setUserPaths(currentPaths => currentPaths.filter(p => p.id !== pathToDeleteId));
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
          console.log(`Polling stopped for path ${selectedPathId}. Final status: ${latestTask?.status}`);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;

          if (learningPathData && latestTask && Array.isArray(learningPathData.courses)) {
             const finalReadyStatus: Record<number, boolean> = {};
             learningPathData.courses.forEach(course => {
                 if (course.sections && Array.isArray(course.sections)) {
                     course.sections.forEach(section => {
                         finalReadyStatus[section.id] = true; 
                     });
                 }
             });
             setSectionReadyStatus(finalReadyStatus);
             console.log("Task finished polling, marking all sections as ready:", finalReadyStatus);
          }
        } else {
           console.log(`Task for path ${selectedPathId} is still active: ${latestTask?.status}`);
        }
      } catch (error) {
        console.error(`Error polling task status for path ${selectedPathId}:`, error);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setTaskStatus(prev => ({ ...prev, status: 'unknown' } as TaskStatusResponse)); 
      }
    };

    if (isTaskActive(taskStatus) && selectedPathId) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(checkStatus, POLLING_INTERVAL);
      console.log(`Polling started for path ${selectedPathId} (initial status: ${taskStatus?.status})`);
    } else {
        if (pollingIntervalRef.current) {
            console.log(`Clearing polling interval (task active: ${isTaskActive(taskStatus)}, pathId: ${selectedPathId})`);
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }

    return () => {
      if (pollingIntervalRef.current) {
        console.log(`Clearing polling interval on cleanup (pathId: ${selectedPathId})`);
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [taskStatus, selectedPathId, learningPathData]);

  // --- Toggle expand/collapse for courses/sections ---
  const toggleExpand = useCallback(async (itemId: string, itemType: 'course' | 'section', sectionId?: number) => {
    const isCurrentlyExpanded = !!expandedItems[itemId];
    setExpandedItems(prev => ({ ...prev, [itemId]: !isCurrentlyExpanded }));

    if (itemType === 'section' && sectionId && !isCurrentlyExpanded) {
        const needsFetch = !sectionCardsCache.hasOwnProperty(sectionId) || sectionCardsCache[sectionId]?.length === 0;
        const isSectionMarkedReady = sectionReadyStatus[sectionId]; 

        console.log(`Expanding section ${sectionId}. Needs Fetch: ${needsFetch}, Already Marked Ready: ${isSectionMarkedReady}`);

        if (needsFetch) {
            setIsFetchingSection(true);
            setCurrentSectionIdForFetch(sectionId);
            try {
                console.log(`Fetching cards for section ${sectionId}...`);
                const sectionData = await apiGetSectionWithCards(sectionId);
                const cards = sectionData.cards || [];
                console.log(`Fetch successful for section ${sectionId}. Cards: ${cards.length}. Marking as ready.`);
                setSectionReadyStatus(prev => ({ ...prev, [sectionId]: true }));
                setSectionCardsCache(prevCache => ({ ...prevCache, [sectionId]: cards }));

                if (autoSelectFirstCardInSectionId === sectionId) {
                    if (cards.length > 0 && selectedPathId && locale) {
                        router.push(`/${locale}/learning-paths/${selectedPathId}?section=${sectionId}&card=${cards[0].id}`);
                    }
                    else setSelectedCard(null);
                    setAutoSelectFirstCardInSectionId(null);
                }
            } catch (err: any) {
                console.error(`Fetch/check failed for section ${sectionId}:`, err);
                if (autoSelectFirstCardInSectionId === sectionId) {
                    setSelectedCard(null);
                    setAutoSelectFirstCardInSectionId(null);
                }
            } finally {
                setIsFetchingSection(false);
                setCurrentSectionIdForFetch(prev => (prev === sectionId ? null : prev));
            }
        } else {
             console.log(`Section ${sectionId} already has >0 cards in cache. Handling auto-select if necessary.`);
             if (autoSelectFirstCardInSectionId === sectionId) {
                 const cachedCards = sectionCardsCache[sectionId]; 
                 if (cachedCards.length > 0 && selectedPathId && locale) {
                    router.push(`/${locale}/learning-paths/${selectedPathId}?section=${sectionId}&card=${cachedCards[0].id}`);
                 }
                 else setSelectedCard(null); 
                 setAutoSelectFirstCardInSectionId(null);
             }
        }
    }
     else if (itemType === 'section' && sectionId && isCurrentlyExpanded) {
         if (currentSectionIdForFetch === sectionId) {
           setCurrentSectionIdForFetch(null);
           setIsFetchingSection(false);
         }
     }
  }, [expandedItems, sectionReadyStatus, sectionCardsCache, autoSelectFirstCardInSectionId, currentSectionIdForFetch, router, locale, selectedPathId]);

  const handleCardSelect = useCallback((card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect: boolean = false) => {
    if (selectedPathId && locale) {
      const targetUrl = `/${locale}/learning-paths/${selectedPathId}?section=${sectionId}&card=${card.id}`;
      console.log('[PathDetailView] Navigating to:', targetUrl);
      router.push(targetUrl);
    } else {
      console.warn("Cannot navigate to card view: selectedPathId or locale missing.", { selectedPathId, locale });
    }
  }, [selectedPathId, locale, router]);

   const renderResources = useCallback((resources: CardResource): JSX.Element => {
     if (!resources) {
       return <p>No additional resources provided.</p>;
     }
     
     const resourceEntries = Object.entries(resources).filter(([, value]) => value && (Array.isArray(value) ? value.length > 0 : !!value));
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
    if (!learningPathData || !Array.isArray(learningPathData.courses)) return null;
    let currentCourseIndex = -1;
    let currentSectionIndex = -1;
    for (let i = 0; i < learningPathData.courses.length; i++) {
      if (!learningPathData.courses[i] || !Array.isArray(learningPathData.courses[i].sections)) continue;
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
        if (!course || !Array.isArray(course.sections)) return;
        const section = course.sections.find(s => s.id === selectedCardSectionId);
        if (section) completedTitle = section.title;
      });
      setCompletionInfo({ completedSectionTitle: completedTitle, nextItem: nextInfo });
      setCurrentViewMode('completion');
    }
   }, [getCurrentCardIndex, selectedCardSectionCards, selectedCard, selectedCardSectionId, findNextItem, learningPathData]);

    const handleNavigateNext = useCallback(() => {
     if (!completionInfo || !completionInfo.nextItem || !learningPathData || !Array.isArray(learningPathData.courses)) return;
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
     setSelectedCard(null); 

    if (nextItem.sectionId) {
      const courseContainingNextSection = learningPathData.courses.find(course =>
        course && Array.isArray(course.sections) && course.sections.some(section => section.id === nextItem.sectionId)
      );

      if (courseContainingNextSection) {
        const courseItemId = `course-${courseContainingNextSection.id}`;
        const sectionItemId = `section-${nextItem.sectionId}`;
         setExpandedItems(prev => ({ ...prev, [courseItemId]: true, [sectionItemId]: true }));
         setAutoSelectFirstCardInSectionId(nextItem.sectionId); 

        if (!sectionCardsCache[nextItem.sectionId]) {
             console.log(`Navigating next to section ${nextItem.sectionId}, not in cache. Triggering expand.`);
             toggleExpand(sectionItemId, 'section', nextItem.sectionId);
        } else {
             console.log(`Navigating next to section ${nextItem.sectionId}, already in cache. Relying on auto-select.`);
         }
      } else {
        console.warn(`Could not find course containing section ID: ${nextItem.sectionId}`);
      }
    }
   }, [completionInfo, learningPathData, sectionCardsCache, toggleExpand]);

  // --- Main Render ---
  return (
    <div className={styles.pageContainer}>
      {/* Left Pane: Path List */}
      <aside className={`${styles.pathListPane} ${styles.fadeIn}`}>
        <h1 className={styles.listTitle}>
          {isClient && t('my_paths.title')} {userPaths.length > 0 && `(${userPaths.length})`}
        </h1>
        {isLoadingList && (
          <div className={styles.listLoading}>
            <div className={styles.spinner}></div>
            <p>{isClient && t('Common.loading')}</p>
            <div className={`${styles.progressBar} ${styles.active}`}></div>
          </div>
        )}
        {listError && !isLoadingList && (
          <div className={styles.listErrorBox}>
            <p>{isClient && t('my_paths.error')}: {listError}</p>
            <button onClick={fetchUserPaths} className={styles.retryButton}>{isClient && t('common.retry')}</button>
          </div>
        )}
        {!isLoadingList && !listError && userPaths.length === 0 && (
          <div className={styles.emptyState}>
            <p>{isClient && t('my_paths.no_paths_message')}</p>
          </div>
        )}
        {!isLoadingList && !listError && userPaths.length > 0 && (
          <ul className={`${styles.pathList} ${styles.fadeIn}`}>
            {userPaths.map(pathItem => {
              const pathDetailId = pathItem.id;
              const listItemKey = pathItem.id;
              const isDeleting = deletingPathId === pathDetailId;
              const isSelected = selectedPathId === pathDetailId;
              const displayTitle = pathItem.title || 'Untitled Path';
              return (
                <li key={listItemKey} className={`${styles.pathListItem} ${isDeleting ? styles.deleting : ''} ${isSelected ? styles.selected : ''}`}>
                  <button 
                    className={styles.pathSelectButton} 
                    onClick={() => handlePathSelect(pathDetailId)} 
                    disabled={isDeleting || isLoadingList} 
                    title={displayTitle}
                  >
                    <div className={styles.pathInfo}>
                      <h2 className={styles.pathTitleSmall}>{displayTitle}</h2>
                      <p className={styles.pathDescriptionSmall}>{pathItem.description || 'No description.'}</p>
                      {isDeleting && (
                        <div className={styles.deletingIndicator}>
                          <span className={styles.smallSpinner}></span> Deleting...
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right Pane: Path Details - Now uses the component */}
      <main className={`${styles.detailPane} ${styles.fadeIn}`}>
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
          navigateToPreviousCard={navigateToPreviousCard}
          navigateToNextCard={navigateToNextCard}
          handleNavigateNext={handleNavigateNext}
          getCurrentCardIndex={getCurrentCardIndex}
          hasPreviousCard={hasPreviousCard()}
          hasNextCardInSection={hasNextCardInSection()}
          handleDeletePath={handleDeletePath}
          deletingPathId={deletingPathId}
          sectionReadyStatus={sectionReadyStatus} 
        />
      </main>
    </div>
  );
}

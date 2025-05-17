import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  apiGetFullLearningPath, 
  apiGetUserLearningPath,
  apiGetFullUserLearningPath,
  FullLearningPathResponse, 
  UserLearningPathResponse,
  CardResponse,
  CourseResponse,
  SectionResponse,
  apiUpdateCardCompletion,
  apiUpdateCardCompletionInSection,
  apiUpdateSectionProgress,
  apiUpdateCourseProgress,
  apiUpdateLearningPathProgress,
  apiCheckAchievements,
  apiGetSectionWithCards
} from '@/services/api';

// Added ViewMode type
export type InternalViewMode = 'card' | 'sectionCompletion' | 'learningPathCompletion';

export interface UseLearningPathProps {
  id: string | number;
}

export interface UseLearningPathResult {
  learningPathData: FullLearningPathResponse | null;
  isLoading: boolean;
  error: string | null;
  learningPathId: number | null;
  taskId: string | null;
  courseCards: Record<number, CardResponse[]>;
  sectionCards: Record<number, CardResponse[]>;
  allCardsById: Record<number, CardResponse>;
  selectedCard: CardResponse | null;
  currentCardIndex: number;
  expandedItems: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  setSelectedCard: (card: CardResponse | null) => void;
  setCurrentCardIndex: (index: number) => void;
  setExpandedItems: (items: Record<string, boolean>) => void;
  setExpandedSections: (sections: Record<string, boolean>) => void;
  toggleCardCompletion: (cardId: string | number) => Promise<void>;
  calculateSectionProgress: (sectionId: number) => number;
  calculateCourseProgress: (courseId: number) => number;
  calculateLearningPathProgress: () => number;
  updateProgressData: () => void;
  toggleCourseExpanded: (courseId: number) => void;
  toggleSectionExpanded: (sectionId: number) => void;
  nextCard: () => void;
  prevCard: () => void;
  currentSectionId: number | null;
  currentSectionCards: CardResponse[];
  toggleCourseExpand: (courseId: number) => void;
  toggleSectionExpand: (sectionId: number) => void;
  handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[]) => void;
  navigateToPreviousCard: () => void;
  navigateToNextCard: () => void;
  hasPreviousCard: boolean;
  hasNextCard: boolean;
  fetchLearningPathData?: () => Promise<void>;
  achievements: any[];
  showAchievementNotification: boolean;
  dismissAchievementNotification: () => void;
  internalViewMode: InternalViewMode;
  proceedToNextContent: () => void;
  resetToCardView: () => void;
  pendingCardToggles: Set<number>;
}

/**
 * Custom hook for managing learning path functionality.
 * 
 * ## Overall Page Strategy:
 * 
 * 1. Initial Load:
 *    - Fetch complete learning path data using apiGetFullUserLearningPath (includes all courses, sections, cards)
 *    - Display full structure in navigation pane and selected card details
 * 
 * 2. Card Interactions:
 *    - When user selects a card, update UI to show that card's details
 *    - When user marks a card as complete, optimistically update UI first, then sync with server
 * 
 * 3. Progress Updates:
 *    - Server calculates progress percentages for sections/courses/learning path
 *    - After card completion toggle, fetch updated progress data from server
 * 
 * 4. API Structure Handling:
 *    - API returns cards either directly or nested inside wrapper objects with additional metadata
 *    - The hook handles both formats transparently for the UI components
 */
export function useLearningPath({ id }: UseLearningPathProps): UseLearningPathResult {
  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<number | null>(null);
  const [currentSectionCards, setCurrentSectionCards] = useState<CardResponse[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<CardResponse[]>([]);
  const hasCalculatedProgress = useRef(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<InternalViewMode>('card');
  const [pendingCardToggles, setPendingCardToggles] = useState<Set<number>>(new Set()); // Track cards being toggled
  const [cardCompletionErrors, setCardCompletionErrors] = useState<Record<number, Error | null>>({}); // Track errors per card
  const progressRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle the expanded state of a course
  const toggleCourseExpand = (courseId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Toggle the expanded state of a section
  const toggleSectionExpand = (sectionId: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Update progress data from the backend
  const updateProgressData = useCallback(async (): Promise<void> => {
    if (!learningPathData) return;
    
    try {
      const pathId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(pathId)) {
        throw new Error("Invalid Learning Path ID.");
      }

      console.log(`Fetching updated progress data for path ${pathId}...`);
      
      let userData;
      try {
        userData = await apiGetUserLearningPath(pathId);
      } catch (apiError) {
        console.error(`API error while fetching progress data:`, apiError);
        return;
      }
      
      if (!userData) {
        console.error("Failed to get updated progress data: No data returned");
        return;
      }
      
      console.log(`Successfully fetched progress data for path ${pathId}`);
      
      if (learningPathData) {
        try {
          setLearningPathData(prevLpData => {
            if (!prevLpData) return null;
            // Create a deep copy to modify, ensuring we don't mutate the previous state directly.
            const updatedData = JSON.parse(JSON.stringify(prevLpData));

            // Only update learning path progress if it's not optimistically updated
            // If there are any pending card toggles, keep the optimistic progress
            if (pendingCardToggles.size === 0) {
              updatedData.progress = userData.progress;
              console.log(`Updated learning path progress: ${userData.progress}%`);
            } else {
              console.log(`Keeping optimistic learning path progress: ${updatedData.progress}% (server: ${userData.progress}%)`);
            }
            
            for (const course of updatedData.courses) {
              const updatedCourseFromServer = userData.learning_path.courses.find(c => c.id === course.id);
              if (updatedCourseFromServer) {
                // Only update course progress if no pending card toggles in this course
                const hasPendingCardsInCourse = course.sections.some((section: SectionResponse) => 
                  section.cards.some((cardItem: CardResponse) => {
                    const cardId = cardItem.card?.id || cardItem.id;
                    return pendingCardToggles.has(cardId);
                  })
                );

                if (!hasPendingCardsInCourse) {
                  course.progress = updatedCourseFromServer.progress;
                }
                
                for (const section of course.sections) {
                  const updatedSectionFromServer = updatedCourseFromServer.sections.find(s => s.id === section.id);
                  if (updatedSectionFromServer) {
                    // Only update section progress if no pending card toggles in this section
                    const hasPendingCardsInSection = section.cards.some((cardItem: CardResponse) => {
                      const cardId = cardItem.card?.id || cardItem.id;
                      return pendingCardToggles.has(cardId);
                    });

                    if (!hasPendingCardsInSection) {
                      section.progress = updatedSectionFromServer.progress;
                    }
                    
                    if (updatedSectionFromServer.cards && updatedSectionFromServer.cards.length > 0) {
                      const serverCardCompletionMap = new Map(
                        updatedSectionFromServer.cards.map(cardFromServer => [cardFromServer.id, cardFromServer.is_completed])
                      );
                      
                      for (const cardItemWrapper of section.cards) {
                        const innerCardId = cardItemWrapper.card ? cardItemWrapper.card.id : cardItemWrapper.id;
                        
                        // **** CRITICAL CHANGE HERE ****
                        // Only update from server if card is NOT in pendingCardToggles
                        if (!pendingCardToggles.has(innerCardId) && serverCardCompletionMap.has(innerCardId)) {
                          const freshIsCompleted = serverCardCompletionMap.get(innerCardId);
                          cardItemWrapper.is_completed = freshIsCompleted;
                          if (cardItemWrapper.card) {
                            cardItemWrapper.card.is_completed = freshIsCompleted;
                          }
                        } else if (pendingCardToggles.has(innerCardId)) {
                          console.log(`DEBUG - updateProgressData: Skipping update for pending card ${innerCardId}. Will retain optimistic state.`);
                        }
                      }
                    }
                  }
                }
              }
            }
            return updatedData;
          });
        } catch (structureError) {
          console.error("Error processing progress data structure:", structureError);
        }
      }
    } catch (error) {
      console.error("Error updating progress data:", error);
    }
  }, [id, learningPathData, pendingCardToggles]);

  // Now define handleCardSelect after updateProgressData is defined
  // Select a card to display
  const handleCardSelect = useCallback((card: CardResponse, sectionId: number, sectionWrapperCardsFromProp: CardResponse[]) => {
    // card can be an inner card (if clicked from main view) or a wrapper (if from nav)
    // actualCard is the inner card.
    const actualCard = card.card ? card.card : card;
    
    // Ensure sectionWrapperCards is an array, default to empty if undefined/null
    const sectionWrapperCards = Array.isArray(sectionWrapperCardsFromProp) ? sectionWrapperCardsFromProp : [];

    // Sort the wrapper cards from the section by order_index
    const sortedSectionWrapperCards = [...sectionWrapperCards].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    // Make a copy of the cards to avoid mutating the source data
    const preservedSectionWrapperCards = JSON.parse(JSON.stringify(sortedSectionWrapperCards));

    // First, check if there are any pending card toggles in this section
    // If so, we need to preserve their optimistic state
    const cardsWithPendingToggles = new Set<number>();
    preservedSectionWrapperCards.forEach((wrapper: CardResponse) => {
      const cardId = wrapper.card?.id || wrapper.id;
      if (pendingCardToggles.has(cardId)) {
        cardsWithPendingToggles.add(cardId);
        console.log(`Preserving optimistic state for card ${cardId} during navigation`);
      }
    });

    // Process into inner cards, ensuring is_completed is from the wrapper
    // and preserving optimistic updates for pending toggles
    const processedInnerSectionCards = preservedSectionWrapperCards.map((wrapper: CardResponse) => {
      const innerC = wrapper.card ? wrapper.card : wrapper;
      const cardId = innerC.id;
      
      // For cards with pending toggles, preserve the optimistic state
      if (cardsWithPendingToggles.has(cardId)) {
        // Find the card state in the current learningPathData
        let optimisticValue: boolean | undefined;
        
        if (learningPathData) {
          // Search for the card in the full learning path data to get its current optimistic state
          for (const course of learningPathData.courses) {
            for (const section of course.sections) {
              for (const existingWrapper of section.cards) {
                const existingCardId = existingWrapper.card?.id || existingWrapper.id;
                if (existingCardId === cardId) {
                  optimisticValue = existingWrapper.is_completed;
                  if (existingWrapper.card) {
                    // If the value in the card differs from the wrapper, prefer the card
                    // (it might have been updated more recently)
                    optimisticValue = existingWrapper.card.is_completed ?? optimisticValue;
                  }
                  break;
                }
              }
              if (optimisticValue !== undefined) break;
            }
            if (optimisticValue !== undefined) break;
          }
        }
        
        // If we found an optimistic value, use it
        if (optimisticValue !== undefined) {
          console.log(`Using optimistic value ${optimisticValue} for card ${cardId}`);
          return { ...innerC, is_completed: optimisticValue };
        }
      }

      // If nested and wrapper has is_completed, apply it to the inner card
      if (wrapper.card && wrapper.is_completed !== undefined) {
        return { ...innerC, is_completed: wrapper.is_completed };
      }
      // For direct cards or nested where wrapper.is_completed is undefined,
      // use inner card's own is_completed (which might have been optimistically set or from initial load)
      return innerC;
    });
    
    // Update state
    // Ensure the actualCard passed to setSelectedCard also has its is_completed status aligned if it came from a wrapper
    let finalSelectedCard = actualCard;
    if (card.card && card.is_completed !== undefined) { // If original 'card' was a wrapper
      finalSelectedCard = { ...actualCard, is_completed: card.is_completed };
    } else if (!card.card && card.is_completed !== undefined) { // If original 'card' was an inner card but used as a wrapper in some contexts
      finalSelectedCard = { ...actualCard, is_completed: card.is_completed};
    }

    // Check if the selected card has a pending toggle
    if (pendingCardToggles.has(finalSelectedCard.id)) {
      // Find the optimistic state in the learning path data
      let optimisticValue: boolean | undefined;
      
      if (learningPathData) {
        for (const course of learningPathData.courses) {
          for (const section of course.sections) {
            for (const existingWrapper of section.cards) {
              const existingCardId = existingWrapper.card?.id || existingWrapper.id;
              if (existingCardId === finalSelectedCard.id) {
                optimisticValue = existingWrapper.is_completed;
                if (existingWrapper.card) {
                  optimisticValue = existingWrapper.card.is_completed ?? optimisticValue;
                }
                break;
              }
            }
            if (optimisticValue !== undefined) break;
          }
          if (optimisticValue !== undefined) break;
        }
      }
      
      // If we found an optimistic value, use it
      if (optimisticValue !== undefined) {
        console.log(`Using optimistic value ${optimisticValue} for selected card ${finalSelectedCard.id}`);
        finalSelectedCard = { ...finalSelectedCard, is_completed: optimisticValue };
      }
    }

    setSelectedCard(finalSelectedCard);
    setCurrentSectionId(sectionId);
    setCurrentSectionCards(processedInnerSectionCards);
    
    // Find index of the selected card in the processed section cards
    const cardIndex = processedInnerSectionCards.findIndex((c: CardResponse) => c.id === finalSelectedCard.id);
    if (cardIndex !== -1) {
      setCurrentCardIndex(cardIndex);
    } else {
      console.warn(`Selected card (id: ${finalSelectedCard.id}) not found in processed section cards. Resetting index.`);
      setCurrentCardIndex(0); // Or select first card if list not empty
    }
    setInternalViewMode('card'); // Ensure card view on selection
    
    // Only refresh progress data if there are no pending card toggles
    // This prevents overwriting optimistic updates during navigation
    if (pendingCardToggles.size === 0) {
      updateProgressData();
    } else {
      console.log(`Skipping updateProgressData during navigation because there are ${pendingCardToggles.size} pending card toggles`);
    }
  }, [pendingCardToggles, learningPathData, updateProgressData]);

  // Toggle card completion status
  const toggleCardCompletion = useCallback(async (cardId: string | number): Promise<void> => {
    const numericCardId = typeof cardId === 'string' ? parseInt(cardId, 10) : cardId;
    const capturedCurrentSectionId = currentSectionId; // Capture currentSectionId at the moment of call
    const capturedLearningPathData = learningPathData; // Capture learningPathData
    const capturedCurrentSectionCards = currentSectionCards; // Capture current section cards
    const capturedSelectedCard = selectedCard; // Capture selected card

    if (capturedCurrentSectionId === null || isNaN(numericCardId) || !capturedLearningPathData) {
      console.error("toggleCardCompletion: Missing critical data (sectionId, cardId, or learningPathData).");
      return;
    }
    
    if (pendingCardToggles.has(numericCardId)) {
        console.warn(`toggleCardCompletion: Card ${numericCardId} is already being processed.`);
        return;
    }

    // Clear any existing progress refresh timer
    if (progressRefreshTimerRef.current) {
      clearTimeout(progressRefreshTimerRef.current);
      progressRefreshTimerRef.current = null;
    }

    setPendingCardToggles(prev => new Set(prev).add(numericCardId));
    // Clear any previous error for this card
    setCardCompletionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[numericCardId];
        return newErrors;
    });

    let originalCompletionStatus: boolean | undefined;
    let targetCardIdentifier = `card ${numericCardId} in section ${capturedCurrentSectionId}`;

    // Find from captured states
    const cardInCurrentSecList = capturedCurrentSectionCards.find(c => (c.card?.id || c.id) === numericCardId);
    const cardInSelected = capturedSelectedCard?.id === numericCardId ? capturedSelectedCard : null;

    if (cardInCurrentSecList) {
        originalCompletionStatus = cardInCurrentSecList.is_completed ?? cardInCurrentSecList.card?.is_completed;
        targetCardIdentifier = `wrapper/card ${numericCardId} in capturedCurrentSectionCards`;
    } else if (cardInSelected) {
        originalCompletionStatus = cardInSelected.is_completed;
        targetCardIdentifier = `selectedCard ${numericCardId}`;
    } else {
        for (const course of capturedLearningPathData.courses) {
            for (const section of course.sections) {
                if (section.id === capturedCurrentSectionId) {
                    const wrapper = section.cards.find(w => (w.card?.id || w.id) === numericCardId);
                    if (wrapper) {
                        originalCompletionStatus = wrapper.is_completed ?? wrapper.card?.is_completed;
                        targetCardIdentifier = `wrapper/card ${numericCardId} found deep in capturedLearningPathData section ${capturedCurrentSectionId}`;
                        break;
                    }
                }
            }
            if (originalCompletionStatus !== undefined) break;
        }
    }

    if (typeof originalCompletionStatus === 'undefined') {
      console.error(`toggleCardCompletion: Could not find ${targetCardIdentifier} to determine original status. Aborting.`);
      setPendingCardToggles(prev => { 
        const newSet = new Set(prev);
        newSet.delete(numericCardId);
        return newSet;
      });
      return;
    }

    const newCompletionStatus = !originalCompletionStatus;
    console.log(`DEBUG - Optimistic Update START for ${targetCardIdentifier} from ${originalCompletionStatus} to ${newCompletionStatus}`);

    // OPTIMISTIC UI UPDATES (sync, happens before API call returns)
    const applyOptimisticUpdate = (status: boolean) => {
        const updateCardState = (card: CardResponse | null, newStatus: boolean): CardResponse | null => {
            if (!card) return null;
            const updatedCard = { ...card, is_completed: newStatus, isToggling: status === newCompletionStatus }; // isToggling true only during actual pending toggle
            if (updatedCard.card) {
                updatedCard.card = { ...updatedCard.card, is_completed: newStatus, isToggling: status === newCompletionStatus };
            }
            return updatedCard;
        };

        if (selectedCard?.id === numericCardId) {
            setSelectedCard(prev => updateCardState(prev, status));
        }
        setCurrentSectionCards(prevCards =>
            prevCards.map(c => {
                const cardToCheckId = c.card?.id || c.id;
                return cardToCheckId === numericCardId ? updateCardState(c, status)! : c;
            })
        );
        setLearningPathData(prevLpData => {
            if (!prevLpData) return null;
            const newLpData = JSON.parse(JSON.stringify(prevLpData));
            let cardUpdatedInLp = false;
            let updatedSectionId: number | null = null;
            let updatedCourseId: number | null = null;

            // Update card completion status in all courses and sections
            for (const course of newLpData.courses) {
                for (const section of course.sections) {
                    // Iterate through all sections for global update, not just capturedCurrentSectionId
                    for (const cardWrapper of section.cards) {
                        const innerCard = cardWrapper.card || cardWrapper;
                        if (innerCard.id === numericCardId) {
                            cardWrapper.is_completed = status;
                            cardWrapper.isToggling = status === newCompletionStatus; // isToggling if current op makes it pending
                            if (cardWrapper.card) { 
                                cardWrapper.card.is_completed = status;
                                cardWrapper.card.isToggling = status === newCompletionStatus;
                            }
                            cardUpdatedInLp = true;
                            updatedSectionId = section.id;
                            updatedCourseId = course.id;
                            break; 
                        }
                    }
                    // If card was updated in this section, we can break from iterating further sections of this course
                    if (cardUpdatedInLp && section.cards.some((cw: CardResponse) => (cw.card?.id || cw.id) === numericCardId)) break; 
                }
                // If card was updated in any section of this course, we can break from iterating further courses
                if (cardUpdatedInLp && course.sections.some((s: SectionResponse) => s.cards.some((cw: CardResponse) => (cw.card?.id || cw.id) === numericCardId))) break; 
            }

            // Only continue if we found and updated a card
            if (!cardUpdatedInLp) return prevLpData;

            // Recalculate section progress for the updated section
            if (updatedSectionId !== null) {
                // Find the section again to ensure we have the latest data
                let updatedSection: SectionResponse | null = null;
                let updatedCourse: CourseResponse | null = null;

                for (const course of newLpData.courses) {
                    if (updatedCourseId && course.id === updatedCourseId) {
                        updatedCourse = course;
                    }
                    for (const section of course.sections) {
                        if (section.id === updatedSectionId) {
                            updatedSection = section;
                            if (!updatedCourse) {
                                updatedCourse = course;
                            }
                            break;
                        }
                    }
                    if (updatedSection) break;
                }

                // Calculate new section progress
                if (updatedSection) {
                    const totalCards = updatedSection.cards.length;
                    const completedCards = updatedSection.cards.filter(cardItem => {
                        // Handle both nested and direct structure
                        if (cardItem.card) {
                            return cardItem.is_completed || cardItem.card.is_completed;
                        }
                        return cardItem.is_completed;
                    }).length;
                    
                    // Update the section progress optimistically
                    updatedSection.progress = Math.round((completedCards / totalCards) * 100);
                    
                    // Also update course progress if section was updated
                    if (updatedCourse) {
                        const sectionProgressValues = updatedCourse.sections.map((section: SectionResponse) => 
                            section.progress !== undefined ? section.progress : 0
                        );
                        
                        if (sectionProgressValues.length > 0) {
                            const totalProgress = sectionProgressValues.reduce((sum, progress) => sum + progress, 0);
                            updatedCourse.progress = Math.round(totalProgress / sectionProgressValues.length);
                        }
                    }
                    
                    // Update learning path progress
                    const courseProgressValues = newLpData.courses.map((course: CourseResponse) => 
                        course.progress !== undefined ? course.progress : 0
                    );
                    
                    if (courseProgressValues.length > 0) {
                        const totalProgress = courseProgressValues.reduce((sum: number, progress: number) => sum + progress, 0);
                        newLpData.progress = Math.round(totalProgress / courseProgressValues.length);
                    }
                }
            }

            return newLpData;
        });
    };

    applyOptimisticUpdate(newCompletionStatus); // Apply optimistic "completed" or "incomplete"

    // API Call (Fire and forget style for parallel execution)
    // Find the template_section_id from the original data capture, not live state
    const originalSectionForApi = capturedLearningPathData.courses
        .flatMap((c: CourseResponse) => c.sections)
        .find((s: SectionResponse) => s.id === capturedCurrentSectionId);

    let templateSectionIdToUseForApi = capturedCurrentSectionId; // Fallback
    if (originalSectionForApi && typeof originalSectionForApi.section_template_id === 'number') {
        templateSectionIdToUseForApi = originalSectionForApi.section_template_id;
    } else {
        console.warn("ToggleCardCompletion API: Failed to find template_section_id from captured data. Using capturedCurrentSectionId as fallback.");
    }

    apiUpdateCardCompletionInSection(
        capturedLearningPathData.id,       
        templateSectionIdToUseForApi,    
        numericCardId,             
        newCompletionStatus
    ).then(response => {
        if (!response || !response.ok) {
            let errorDetail = 'Unknown server error during toggle';
            if (response) {
                 return response.json().then(errData => {
                    errorDetail = errData.detail || JSON.stringify(errData);
                    throw new Error(`Server error: ${response.status} - ${errorDetail}`);
                 }).catch(() => {
                    throw new Error(`Server error: ${response.status} - ${response.statusText || 'Failed to parse error response'}`);
                 });
            } else {
                throw new Error(errorDetail + ' (no response)');
            }
        }
        // SUCCESS
        console.log(`DEBUG - API Success for card ${numericCardId}.`);
        
        // Remove from pending card toggles with a delay to preserve optimistic updates during navigation
        setTimeout(() => {
            console.log(`Removing card ${numericCardId} from pendingCardToggles after delay`);
            setPendingCardToggles(prev => {
                const newSet = new Set(prev);
                newSet.delete(numericCardId);
                return newSet;
            });
        }, 6000); // 6-second delay - longer than the ~5 seconds backend processing time
        
        // Clear isToggling on success in selectedCard if it's the same card
        if (selectedCard?.id === numericCardId) {
            setSelectedCard(prev => {
                if (!prev) return null;
                const updatedCard = { ...prev, isToggling: false };
                if (updatedCard.card) {
                    updatedCard.card = { ...updatedCard.card, isToggling: false };
                }
                return updatedCard;
            });
        }
        
        // Clear isToggling in currentSectionCards
        setCurrentSectionCards(prevCards =>
            prevCards.map(c => {
                const cardToCheckId = c.card?.id || c.id;
                if (cardToCheckId === numericCardId) {
                    const updatedCard = { ...c, isToggling: false };
                    if (updatedCard.card) {
                        updatedCard.card = { ...updatedCard.card, isToggling: false };
                    }
                    return updatedCard;
                }
                return c;
            })
        );
        
        // Clear isToggling on success explicitly in learningPathData
        setLearningPathData(prevLpData => {
            if (!prevLpData) return null;
            const newLpData = JSON.parse(JSON.stringify(prevLpData));
            let modified = false;
            for (const course of newLpData.courses) {
                for (const section of course.sections) {
                    for (const cardWrapper of section.cards) {
                        const innerCard = cardWrapper.card || cardWrapper;
                        if (innerCard.id === numericCardId) {
                            if (cardWrapper.isToggling || (innerCard.card && innerCard.card.isToggling)) {
                                cardWrapper.isToggling = false;
                                if (cardWrapper.card) cardWrapper.card.isToggling = false;
                                modified = true;
                            }
                            break;
                        }
                    }
                }
            }
            return modified ? newLpData : prevLpData;
        });
    }).catch(error => {
        // FAILURE
        console.error(`DEBUG - API Failure for card ${numericCardId}. Reverting. Error:`, error);
        setCardCompletionErrors(prev => ({ ...prev, [numericCardId]: error as Error }));
        
        // Rollback this specific card to originalCompletionStatus
        applyOptimisticUpdate(originalCompletionStatus!);
        
        setPendingCardToggles(prev => {
            const newSet = new Set(prev);
            newSet.delete(numericCardId);
            return newSet;
        });
        // Ensure isToggling is also cleared on rollback from learningPathData
         setLearningPathData(prevLpData => {
            if (!prevLpData) return null;
            const newLpData = JSON.parse(JSON.stringify(prevLpData));
            let modified = false;
            for (const course of newLpData.courses) {
                for (const section of course.sections) {
                    for (const cardWrapper of section.cards) {
                        const innerCard = cardWrapper.card || cardWrapper;
                        if (innerCard.id === numericCardId) {
                            if (cardWrapper.isToggling || (innerCard.card && innerCard.card.isToggling)) {
                                cardWrapper.isToggling = false;
                                if (cardWrapper.card) cardWrapper.card.isToggling = false;
                                modified = true;
                            }
                            break;
                        }
                    }
                }
            }
            return modified ? newLpData : prevLpData;
        });
        // Optionally call updateProgressData on failure too if rollback affects percentages
        // updateProgressData(); 

        // Clear any progress refresh timer on error
        if (progressRefreshTimerRef.current) {
          clearTimeout(progressRefreshTimerRef.current);
          progressRefreshTimerRef.current = null;
        }
    });

  }, [currentSectionId, selectedCard, currentSectionCards, learningPathData, pendingCardToggles]);

  // Navigate to the previous card
  const navigateToPreviousCard = () => {
    if (!currentSectionCards || currentCardIndex <= 0) return;
    
    const previousCard = currentSectionCards[currentCardIndex - 1];
    setSelectedCard(previousCard);
    setCurrentCardIndex(currentCardIndex - 1);
    setInternalViewMode('card'); // Ensure view mode is card
    
    // Don't fetch new progress data if there are pending card toggles
    if (pendingCardToggles.size === 0) {
      updateProgressData();
    }
  };

  // Navigate to the next card
  const navigateToNextCard = () => {
    if (!learningPathData || !currentSectionCards || currentSectionId === null) {
      // console.warn("navigateToNextCard: Prerequisites not met", {learningPathData, currentSectionCards, currentSectionId});
      return;
    }

    const isLastCardInSection = currentCardIndex >= currentSectionCards.length - 1;

    if (isLastCardInSection) {
      // Find current course and section indices
      let currentCourseIndex = -1;
      let currentSectionInCourseIndex = -1;
      let currentCourseRef = null;

      for (let i = 0; i < learningPathData.courses.length; i++) {
        const course = learningPathData.courses[i];
        const sectionIdx = course.sections.findIndex(s => s.id === currentSectionId);
        if (sectionIdx !== -1) {
          currentCourseIndex = i;
          currentSectionInCourseIndex = sectionIdx;
          currentCourseRef = course;
          break;
        }
      }

      if (currentCourseRef && currentSectionInCourseIndex !== -1) {
        const isLastSectionInCourse = currentSectionInCourseIndex === currentCourseRef.sections.length - 1;
        if (isLastSectionInCourse) {
          const isLastCourseInPath = currentCourseIndex === learningPathData.courses.length - 1;
          if (isLastCourseInPath) {
            setInternalViewMode('learningPathCompletion');
          } else {
            // Last card of a section that is the last in its course, but not the last course in the path
            setInternalViewMode('sectionCompletion'); 
          }
        } else {
          // Last card of a section, but not the last section in the course
          setInternalViewMode('sectionCompletion');
        }
      } else {
        // Should not happen if currentSectionId is valid
        console.error("Could not determine current course/section position for navigation.");
        // Fallback to learning path completion as a safe state if structure is unclear
        setInternalViewMode('learningPathCompletion');
      }
    } else {
      // Navigate to the next card in the current section
      const nextCard = currentSectionCards[currentCardIndex + 1];
      setSelectedCard(nextCard);
      setCurrentCardIndex(currentCardIndex + 1);
      setInternalViewMode('card'); // Ensure view mode is card
      
      // Don't fetch new progress data if there are pending card toggles
      if (pendingCardToggles.size === 0) {
        updateProgressData();
      }
    }
  };

  // Calculate section progress based on completed cards
  const calculateSectionProgress = useCallback((sectionId: number): number => {
    if (!learningPathData) return 0;

    // Find the section in the learning path data
    let foundSection = null;
    
    // Search through courses and sections to find the section
    for (const course of learningPathData.courses) {
      foundSection = course.sections.find(s => s.id === sectionId);
      if (foundSection) break;
    }

    if (!foundSection || !foundSection.cards || foundSection.cards.length === 0) return 0;

    // If the section already has a progress value, use it
    if (typeof foundSection.progress === 'number' && !isNaN(foundSection.progress)) {
      return foundSection.progress;
    }

    // Otherwise calculate the percentage of completed cards
    const totalCards = foundSection.cards.length;
    const completedCards = foundSection.cards.filter(cardItem => {
      // Handle both nested and direct structure
      if (cardItem.card) {
        return cardItem.is_completed || cardItem.card.is_completed;
      }
      return cardItem.is_completed;
    }).length;
    
    return Math.round((completedCards / totalCards) * 100);
  }, [learningPathData]);

  // Calculate course progress based on section progress
  const calculateCourseProgress = useCallback((courseId: number): number => {
    if (!learningPathData) return 0;

    // Find the course in the learning path data
    const course = learningPathData.courses.find(c => c.id === courseId);
    if (!course || !course.sections || course.sections.length === 0) return 0;

    // If the course already has a progress value, use it
    if (typeof course.progress === 'number' && !isNaN(course.progress)) {
      return course.progress;
    }

    // Calculate the average progress of all sections
    const sectionProgressValues = course.sections.map(section => 
      section.progress !== undefined ? section.progress : calculateSectionProgress(section.id)
    );
    
    if (sectionProgressValues.length === 0) return 0;
    
    const totalProgress = sectionProgressValues.reduce((sum, progress) => sum + progress, 0);
    return Math.round(totalProgress / sectionProgressValues.length);
  }, [learningPathData, calculateSectionProgress]);

  // Calculate learning path progress based on course progress
  const calculateLearningPathProgress = useCallback((): number => {
    if (!learningPathData || !learningPathData.courses || learningPathData.courses.length === 0) return 0;

    // If the learning path already has a progress value, use it
    if (typeof learningPathData.progress === 'number' && !isNaN(learningPathData.progress)) {
      return learningPathData.progress;
    }

    // Calculate the average progress of all courses
    const courseProgressValues = learningPathData.courses.map(course => 
      course.progress !== undefined ? course.progress : calculateCourseProgress(course.id)
    );
    
    if (courseProgressValues.length === 0) return 0;
    
    const totalProgress = courseProgressValues.reduce((sum: number, progress: number) => sum + progress, 0);
    return Math.round(totalProgress / courseProgressValues.length);
  }, [learningPathData, calculateCourseProgress]);

  // Proceed to next content after section completion
  const proceedToNextContent = useCallback(() => {
    if (!learningPathData || currentSectionId === null) {
      console.warn("proceedToNextContent: Prerequisites not met");
      return;
    }

    let currentCourseIdx = -1;
    let currentSectionIdxInCourse = -1;

    // Find current course and section indices
    for (let i = 0; i < learningPathData.courses.length; i++) {
      const course = learningPathData.courses[i];
      const sectionIdx = course.sections.findIndex(s => s.id === currentSectionId);
      if (sectionIdx !== -1) {
        currentCourseIdx = i;
        currentSectionIdxInCourse = sectionIdx;
        break;
      }
    }

    if (currentCourseIdx === -1 || currentSectionIdxInCourse === -1) {
      console.error("proceedToNextContent: Could not find current course or section for proceeding.");
      setInternalViewMode('learningPathCompletion'); // Fallback
      return;
    }

    const currentCourse = learningPathData.courses[currentCourseIdx];

    // Try to find the next section in the current course
    if (currentSectionIdxInCourse < currentCourse.sections.length - 1) {
      const nextSection = currentCourse.sections[currentSectionIdxInCourse + 1];
      if (nextSection && nextSection.cards && nextSection.cards.length > 0) {
        // section.cards are already sorted wrappers from fetchLearningPathData
        const firstCardOfNextSection = nextSection.cards[0]; // This is a wrapper
        handleCardSelect(firstCardOfNextSection, nextSection.id, nextSection.cards);
        setInternalViewMode('card');
        setExpandedItems(prev => ({ ...prev, [currentCourse.id]: true }));
        setExpandedSections(prev => ({ ...prev, [nextSection.id]: true }));
        return;
      }
    }

    // If no next section in current course, or next section is empty, try next course
    for (let i = currentCourseIdx + 1; i < learningPathData.courses.length; i++) {
      const nextCourse = learningPathData.courses[i];
      if (nextCourse.sections && nextCourse.sections.length > 0) {
        for (const section of nextCourse.sections) { // Iterate to find first non-empty section
          if (section.cards && section.cards.length > 0) {
            // section.cards are already sorted wrappers
            const firstCardOfNextCourseSection = section.cards[0]; // Wrapper
            handleCardSelect(firstCardOfNextCourseSection, section.id, section.cards);
            setInternalViewMode('card');
            setExpandedItems(prev => ({ ...prev, [nextCourse.id]: true }));
            setExpandedSections(prev => ({ ...prev, [section.id]: true }));
            return;
          }
        }
      }
    }
    
    // If no next section or course with cards is found, it's the end of the learning path
    setInternalViewMode('learningPathCompletion');
  }, [currentSectionId, learningPathData, handleCardSelect, setExpandedItems, setExpandedSections]);

  // Check for achievements after card completion
  const checkForAchievements = async () => {
    try {
      const newAchievements = await apiCheckAchievements();
      if (newAchievements && newAchievements.length > 0) {
        setAchievements(newAchievements);
        setShowAchievementNotification(true);
      }
    } catch (error) {
      console.error("Error checking for achievements:", error);
    }
  };

  // Fetch the learning path data from the API
  const fetchLearningPathData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const pathId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(pathId)) {
        throw new Error("Invalid Learning Path ID.");
      }
      
      console.log(`Fetching learning path data for path ${pathId}...`);
      
      // Attempt to get user learning path first (with progress data)
      let data = null;
      
      try {
        data = await apiGetFullUserLearningPath(pathId);
        console.log(`Successfully fetched user learning path data: ${data ? 'Data received' : 'No data'}`);
      } catch (userPathError) {
        console.error(`Error fetching user learning path:`, userPathError);
        // Continue to try the regular endpoint
      }
      
      // If that fails, try the regular learning path endpoint (no progress data)
      if (!data) {
        try {
          console.log(`Attempting to fetch regular learning path data...`);
          data = await apiGetFullLearningPath(pathId);
          console.log(`Successfully fetched regular learning path data: ${data ? 'Data received' : 'No data'}`);
        } catch (error) {
          console.error(`Error fetching regular learning path:`, error);
          throw new Error(`Failed to load learning path data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      if (data) {
        // Log high-level structure for debugging
        console.log(`Learning path structure:`, {
          id: data.id,
          title: data.title,
          courseCount: data.courses?.length || 0,
          progress: data.progress
        });
        
        // Process courses and sections to ensure cards are sorted and completion status is correct from wrappers
        const processedCourses = (data.courses || []).map(course => ({
          ...course,
          sections: (course.sections || []).map(section => {
            // Sort wrapper cards by order_index
            const sortedWrapperCards = [...(section.cards || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            
            // Ensure inner cards reflect wrapper's completion status
            const cardsWithCorrectedCompletion = sortedWrapperCards.map(wrapper => {
              if (wrapper.card && wrapper.is_completed !== undefined) {
                // If there's an inner card and the wrapper has an 'is_completed' status,
                // update the inner card's 'is_completed' status.
                return {
                  ...wrapper,
                  card: { ...wrapper.card, is_completed: wrapper.is_completed }
                };
              }
              // If there's no inner card, or wrapper.is_completed is undefined,
              // return the wrapper as is. The UI might then use wrapper.is_completed directly.
              return wrapper;
            });

            return {
              ...section,
              // Store sorted WRAPPER cards, where inner cards now have corrected completion status
              cards: cardsWithCorrectedCompletion 
            };
          })
        }));

        const processedData = { ...data, courses: processedCourses };
        setLearningPathData(processedData);
        
        // Extract all cards for easier access (mainly for allCards state, not direct UI rendering)
        // This can still be flat, but individual sections in learningPathData now have sorted wrapper cards
        const extractedCards = processedData.courses.flatMap(course => 
          course.sections.flatMap(section => section.cards) // these are sorted wrapper cards
        );
        setAllCards(extractedCards);
        
        // Set initial selection: first card of first section of first course
        if (processedData.courses.length > 0 && 
            processedData.courses[0].sections.length > 0 && 
            processedData.courses[0].sections[0].cards.length > 0) {
          
          const firstCourse = processedData.courses[0];
          const firstSection = firstCourse.sections[0]; // This is the section object, contains section.id (user_section_id)
          // firstSection.cards are sorted WRAPPER cards
          const firstSectionWrapperCards = firstSection.cards;

          // The card to select is the first WRAPPER card from the sorted list
          const firstWrapperCardToSelect = firstSectionWrapperCards[0];
          
          // Call handleCardSelect with the wrapper card, the user_section_id (firstSection.id), 
          // and the full list of sorted wrapper cards for that section
          handleCardSelect(firstWrapperCardToSelect, firstSection.id, firstSectionWrapperCards);

          // Expand the first course and first section by default
          setExpandedItems(prev => ({ ...prev, [firstCourse.id]: true }));
          setExpandedSections(prev => ({ ...prev, [firstSection.id]: true }));
        } else {
          // No cards to select initially
          setSelectedCard(null);
          setCurrentSectionId(null);
          setCurrentSectionCards([]);
          setCurrentCardIndex(0);
        }

      } else {
        setError("Failed to load learning path data: No data returned from API.");
      }
    } catch (error: any) {
      console.error("Error fetching learning path:", error);
      setError(error.message || "An error occurred while loading the learning path.");
    } finally {
      setIsLoading(false);
    }
  }, [id, handleCardSelect, setExpandedItems, setExpandedSections]);

  // Dismiss achievement notification
  const dismissAchievementNotification = useCallback(() => {
    setShowAchievementNotification(false);
  }, []);

  // Use effect to fetch updated progress data when learning path is loaded
  // useEffect(() => {
  //   if (learningPathData && !hasCalculatedProgress.current && allCards.length > 0) {
  //     hasCalculatedProgress.current = true;
  //     // No need to calculate progress locally, just fetch the latest from backend
  //     setTimeout(() => {
  //       updateProgressData();
  //     }, 1000);
  //   }
  // }, [learningPathData, allCards, updateProgressData]);

  // Fetch the learning path data
  useEffect(() => {
    // Create a flag to track if the component is mounted
    let isMounted = true;
    
    // Define an async function to fetch data
    const fetchData = async () => {
      try {
        // Only fetch data if the component is still mounted
        if (isMounted) {
          await fetchLearningPathData();
        }
      } catch (error) {
        console.error("Error in fetchData effect:", error);
      }
    };
    
    // Call the fetch data function
    fetchData();
    
    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted = false;
    };
  }, [id]); // Only depend on id, NOT fetchLearningPathData

  // Determine if there are previous/next cards
  const hasPreviousCard = currentCardIndex > 0;
  // const hasNextCard = currentSectionCards && currentCardIndex < currentSectionCards.length - 1; // Old logic
  // New logic: The "Next" button in LearningPathLayout should be enabled if navigateToNextCard can perform an action.
  // This is true if we have learning path data, cards for the current section, and a current section ID.
  const hasNextCard = !!(learningPathData && currentSectionCards && currentSectionCards.length > 0 && currentSectionId !== null);

  // New function to reset view to card (e.g., from a completion message)
  const resetToCardView = useCallback(() => {
    // Ensure there's a selected card to return to, or select the first card if none.
    // This logic might need refinement based on desired behavior if selectedCard is null.
    if (!selectedCard && learningPathData && learningPathData.courses.length > 0 && learningPathData.courses[0].sections.length > 0 && learningPathData.courses[0].sections[0].cards.length > 0) {
      // If no card is selected, try to select the first card of the first section
      const firstCourse = learningPathData.courses[0];
      const firstSection = firstCourse.sections[0];
      const firstWrapperCard = firstSection.cards[0];
      if (firstWrapperCard) {
         // section.cards are already sorted wrappers from fetchLearningPathData
        handleCardSelect(firstWrapperCard, firstSection.id, firstSection.cards);
      }
    } // else if selectedCard is already set, we just switch the view.
    setInternalViewMode('card');
  }, [selectedCard, learningPathData, handleCardSelect]);

  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      if (progressRefreshTimerRef.current) {
        clearTimeout(progressRefreshTimerRef.current);
      }
    };
  }, []);

  // Return all the data and functions needed by components
  return {
    learningPathData,
    isLoading,
    error,
    learningPathId: learningPathData?.id || null,
    taskId: null, // Learning paths don't have task IDs in this context
    courseCards: {}, // Placeholder for now
    sectionCards: {}, // Placeholder for now
    allCardsById: {}, // Placeholder for now
    selectedCard,
    currentCardIndex,
    expandedItems,
    expandedSections,
    setSelectedCard,
    setCurrentCardIndex,
    setExpandedItems,
    setExpandedSections,
    toggleCardCompletion,
    calculateSectionProgress,
    calculateCourseProgress,
    calculateLearningPathProgress,
    updateProgressData,
    toggleCourseExpanded: toggleCourseExpand,
    toggleSectionExpanded: toggleSectionExpand,
    nextCard: navigateToNextCard,
    prevCard: navigateToPreviousCard,
    currentSectionId,
    currentSectionCards,
    toggleCourseExpand,
    toggleSectionExpand,
    handleCardSelect,
    navigateToPreviousCard,
    navigateToNextCard,
    hasPreviousCard,
    hasNextCard,
    fetchLearningPathData,
    achievements,
    showAchievementNotification,
    dismissAchievementNotification,
    internalViewMode,
    proceedToNextContent,
    resetToCardView,
    pendingCardToggles,
  };
}
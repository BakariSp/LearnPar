import { useState, useEffect } from 'react';
import { apiGetFullLearningPath, FullLearningPathResponse, CardResponse } from '@/services/api';

export interface UseLearningPathProps {
  id: string | number;
}

export interface UseLearningPathResult {
  learningPathData: FullLearningPathResponse | null;
  expandedItems: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  selectedCard: CardResponse | null;
  currentSectionId: number | null;
  currentSectionCards: CardResponse[];
  currentCardIndex: number;
  isLoading: boolean;
  error: string | null;
  toggleCourseExpand: (courseId: number) => void;
  toggleSectionExpand: (sectionId: number) => void;
  handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[]) => void;
  navigateToPreviousCard: () => void;
  navigateToNextCard: () => void;
  hasPreviousCard: boolean;
  hasNextCard: boolean;
  setExpandedItems: (items: Record<string, boolean>) => void;
  setExpandedSections: (sections: Record<string, boolean>) => void;
}

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

  // Select a card to display
  const handleCardSelect = (card: CardResponse, sectionId: number, sectionCards: CardResponse[]) => {
    setSelectedCard(card);
    setCurrentSectionId(sectionId);
    setCurrentSectionCards(sectionCards);
    
    // Find the index of the selected card in the section cards
    const cardIndex = sectionCards.findIndex(c => c.id === card.id);
    if (cardIndex !== -1) {
      setCurrentCardIndex(cardIndex);
    }
  };

  // Navigate to the previous card
  const navigateToPreviousCard = () => {
    if (!currentSectionCards || currentCardIndex <= 0) return;
    
    const previousCard = currentSectionCards[currentCardIndex - 1];
    setSelectedCard(previousCard);
    setCurrentCardIndex(currentCardIndex - 1);
  };

  // Navigate to the next card
  const navigateToNextCard = () => {
    if (!currentSectionCards || currentCardIndex >= currentSectionCards.length - 1) return;
    
    const nextCard = currentSectionCards[currentCardIndex + 1];
    setSelectedCard(nextCard);
    setCurrentCardIndex(currentCardIndex + 1);
  };

  // Fetch the learning path data
  useEffect(() => {
    const fetchLearningPath = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const pathId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(pathId)) {
          throw new Error("Invalid Learning Path ID.");
        }

        const pathData = await apiGetFullLearningPath(pathId);
        
        if (pathData) {
          setLearningPathData(pathData);
          setError(null);

          // Expand first course and section by default
          const initialCourseState: Record<string, boolean> = {};
          const initialSectionState: Record<string, boolean> = {};
          
          if (pathData.courses && pathData.courses.length > 0) {
            const firstCourse = pathData.courses[0];
            initialCourseState[firstCourse.id] = true;
            
            if (firstCourse.sections && firstCourse.sections.length > 0) {
              const firstSection = firstCourse.sections[0];
              initialSectionState[firstSection.id] = true;
              
              // Select the first card of the first section
              if (firstSection.cards && firstSection.cards.length > 0) {
                setSelectedCard(firstSection.cards[0]);
                setCurrentSectionId(firstSection.id);
                setCurrentSectionCards(firstSection.cards);
                setCurrentCardIndex(0);
              }
            }
          }
          
          setExpandedItems(initialCourseState);
          setExpandedSections(initialSectionState);
        } else {
          setError('Failed to load learning path. Please try again later.');
        }
      } catch (err: any) {
        console.error('Error fetching learning path:', err);
        setError(err.message || 'Error loading learning path');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLearningPath();
  }, [id]);

  // Determine if there are previous/next cards
  const hasPreviousCard = currentCardIndex > 0;
  const hasNextCard = currentSectionCards && currentCardIndex < currentSectionCards.length - 1;

  return {
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
  };
} 
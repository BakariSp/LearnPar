import React, { useState, useEffect } from 'react';
import { CardResponse, CardResource } from '@/services/api';
import styles from '../styles';

interface CardDetailViewProps {
  selectedCard: CardResponse | null;
  currentSectionCards: CardResponse[];
  currentCardIndex: number;
  navigateToPreviousCard: () => void;
  navigateToNextCard: () => void;
  hasPreviousCard: boolean;
  hasNextCard: boolean;
  showDeleteButton?: boolean;
  toggleCardCompletion?: (cardId: string | number) => Promise<void>;
  currentSectionId?: number | null;
}

const CardDetailView: React.FC<CardDetailViewProps> = ({
  selectedCard,
  currentSectionCards,
  currentCardIndex,
  navigateToPreviousCard,
  navigateToNextCard,
  hasPreviousCard,
  hasNextCard,
  showDeleteButton = true,
  toggleCardCompletion,
  currentSectionId
}) => {
  const [isCardChanging, setIsCardChanging] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('next');
  const [isTogglingCompletion, setIsTogglingCompletion] = useState(false);

  // Reset animation state when a new card is selected
  useEffect(() => {
    setIsCardChanging(false);
  }, [selectedCard?.id]);

  // Handle navigation with animation
  const handleAnimatedNavigate = (direction: 'prev' | 'next') => {
    setAnimationDirection(direction);
    setIsCardChanging(true);
    
    // Delay actual navigation to allow animation to play
    setTimeout(() => {
      if (direction === 'prev') {
        navigateToPreviousCard();
      } else {
        navigateToNextCard();
      }
    }, 200);
  };

  // Handle card completion toggle with added debugging
  const handleToggleCompletion = async () => {
    if (!selectedCard || !toggleCardCompletion || selectedCard.isToggling) return;
    
    // Add debug logging before toggling completion
    console.log('DEBUG - Card Completion Toggle:', {
      cardId: selectedCard.id,
      cardKeyword: selectedCard.keyword,
      currentCompletionStatus: selectedCard.is_completed,
      currentSectionId,
      currentCardIndex,
      totalCardsInSection: currentSectionCards.length
    });
    
    setIsTogglingCompletion(true);
    try {
      await toggleCardCompletion(selectedCard.id);
    } catch (error) {
      console.error("Error toggling card completion:", error);
    } finally {
      setIsTogglingCompletion(false);
    }
  };

  if (!selectedCard) {
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailPlaceholder}>
          <h2>Select a card to view its details</h2>
          <p>Choose a card from the navigation menu to see its content here.</p>
        </div>
      </div>
    );
  }

  // Check if the card can be deleted (based on its creation timestamp)
  // In a real app, you might want to check if the current user created the card
  const canDeleteCard = showDeleteButton && !!selectedCard.created_at;

  // Handle resources of different formats
  const renderResources = () => {
    if (!selectedCard.resources) return null;
    
    let resourcesArray: CardResource[] = [];
    
    // Convert resources to array format based on the type
    if (Array.isArray(selectedCard.resources)) {
      resourcesArray = selectedCard.resources as CardResource[];
    } else if (typeof selectedCard.resources === 'object' && Object.keys(selectedCard.resources).length > 0) {
      resourcesArray = Object.values(selectedCard.resources as Record<string, CardResource>);
    }
    
    if (resourcesArray.length === 0) {
      return <p className={styles.noResources}>No resources available for this card.</p>;
    }
    
    return (
      <ul className={styles.resourceList}>
        {resourcesArray.map((resource, index) => (
          <li key={`resource-${index}-${resource.url || ''}`}>
            <a
              href={resource.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resource.title || resource.url || 'Untitled resource'}
              <span className={styles.externalIcon}>↗</span>
            </a>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.detailPane}>
      <div className={styles.cardDetailContainer}>
        {/* Card Progress Indicator */}
        <div className={styles.cardProgressIndicator}>
          {currentSectionCards.map((cardItem, index) => {
            // Handle both nested and direct card structure
            const card = cardItem.card ? cardItem.card : cardItem;
            return (
              <div
                key={card.id ? `progress-tab-${card.id}-${index}` : `progress-tab-index-${index}`}
                className={`${styles.progressTab} ${
                  index === currentCardIndex
                    ? styles.active
                    : index < currentCardIndex
                    ? styles.completed
                    : ''
                }`}
              ></div>
            );
          })}
        </div>

        {/* Card Main Content */}
        <div 
          className={`${styles.cardMainContent} ${
            isCardChanging 
              ? animationDirection === 'next' 
                ? styles.fadeOut 
                : styles.fadeOutReverse
              : styles.fadeIn
          }`}
        >
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{selectedCard.keyword}</h2>
            
            <div className={styles.cardActions}>
              {/* Display completion status */}
              {selectedCard.is_completed ? (
                <div className={`${styles.cardCompletionStatus} ${styles.completed}`}>
                  Completed
                </div>
              ) : (
                toggleCardCompletion && (
                  <button
                    onClick={handleToggleCompletion}
                    disabled={isTogglingCompletion || selectedCard.isToggling}
                    className={`${styles.navButton} ${styles.nextAction}`}
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}
                  >
                    {isTogglingCompletion || selectedCard.isToggling ? 
                      "Processing..." : "Mark as completed"}
                  </button>
                )
              )}
              
              {canDeleteCard && (
                <button
                  className={styles.cardDeleteButton}
                  aria-label="Delete card"
                  title="Delete this card"
                  onClick={() => {/* Delete logic would go here */}}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Question section */}
          {selectedCard.question && (
            <div className={styles.cardSection}>
              <h3>Question</h3>
              <p>{selectedCard.question}</p>
            </div>
          )}

          {/* Answer section */}
          {selectedCard.answer && (
            <div className={styles.cardSection}>
              <h3>Answer</h3>
              <p>{selectedCard.answer}</p>
            </div>
          )}

          {/* Explanation section */}
          <div className={styles.cardSection}>
            <h3>Explanation</h3>
            <p>{selectedCard.explanation}</p>
          </div>

          <div className={styles.cardSection}>
            <h3>Resources</h3>
            {renderResources()}
          </div>
        </div>

        {/* Card Navigation */}
        <div className={styles.cardNavigation}>
          <button
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={() => handleAnimatedNavigate('prev')}
            disabled={!hasPreviousCard || isCardChanging}
          >
            Previous
          </button>
          <span className={styles.cardCounter}>
            {currentCardIndex + 1} of {currentSectionCards.length}
          </span>
          <button
            className={`${styles.navButton} ${styles.nextAction}`}
            onClick={() => handleAnimatedNavigate('next')}
            disabled={!hasNextCard || isCardChanging}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetailView; 
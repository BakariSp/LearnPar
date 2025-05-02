import { CardResponse } from '@/services/api';
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
}

export default function CardDetailView({
  selectedCard,
  currentSectionCards,
  currentCardIndex,
  navigateToPreviousCard,
  navigateToNextCard,
  hasPreviousCard,
  hasNextCard,
  showDeleteButton = true
}: CardDetailViewProps) {
  if (!selectedCard) {
    return (
      <div className={styles.detailPane}>
        <div className={styles.detailPlaceholder}>
          <h2>Select a card to view</h2>
          <p>Choose a learning card from the navigation menu to start learning.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailPane}>
      <div className={styles.cardDetailContainer}>
        {/* Card progress indicator */}
        <div className={styles.cardProgressIndicator}>
          {currentSectionCards.map((_, index) => (
            <div 
              key={index} 
              className={`${styles.progressTab} ${index === currentCardIndex ? styles.active : ''} ${index < currentCardIndex ? styles.completed : ''}`}
            />
          ))}
        </div>

        {/* Card content */}
        <div className={styles.cardMainContent}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{selectedCard.keyword}</h2>
            {showDeleteButton && (
              <button className={styles.cardDeleteButton} aria-label="Delete Card">
                ✕
              </button>
            )}
          </div>

          <div className={styles.cardSection}>
            <h3>Question</h3>
            <p>{selectedCard.question || 'Why is ' + selectedCard.keyword + ' important in finding inspiration?'}</p>
          </div>

          <div className={styles.cardSection}>
            <h3>Answer</h3>
            <p>{selectedCard.explanation}</p>
          </div>

          {/* Additional explanation section */}
          <div className={styles.cardSection}>
            <h3>Explanation</h3>
            <p>Being mindful allows you to clear mental distractions and focus on the moment, which can open your mind to creative possibilities.</p>
          </div>

          {selectedCard.resources && Object.keys(selectedCard.resources).length > 0 && (
            <div className={styles.cardSection}>
              <h3>Resources</h3>
              <ul className={styles.resourceList}>
                {Object.entries(selectedCard.resources).map(([key, resource]) => (
                  <li key={key}>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      {resource.title || resource.url}
                      <span className={styles.externalIcon}>↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Card navigation */}
        <div className={styles.cardNavigation}>
          <button 
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={navigateToPreviousCard}
            disabled={!hasPreviousCard}
          >
            Previous
          </button>

          <span className={styles.cardCounter}>
            {currentCardIndex + 1} / {currentSectionCards.length}
          </span>

          <button 
            className={`${styles.navButton} ${styles.nextAction}`}
            onClick={navigateToNextCard}
            disabled={!hasNextCard}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 
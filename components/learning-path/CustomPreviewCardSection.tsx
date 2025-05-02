'use client';

import { CardResponse } from '@/services/api';
import styles from './CustomPreviewCardSection.module.css';

interface CustomPreviewCardSectionProps {
  cards: CardResponse[];
  maxPreviewCards?: number;
}

/**
 * Component that displays a preview of cards with a limit on how many are fully shown
 * without using Ant Design components
 */
const CustomPreviewCardSection = ({ cards, maxPreviewCards = 2 }: CustomPreviewCardSectionProps) => {
  if (!cards || cards.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <span className={styles.secondaryText}>No learning cards available</span>
      </div>
    );
  }
  
  return (
    <div className={styles.cardGrid}>
      {cards.slice(0, maxPreviewCards).map((card) => (
        <div key={card.id} className={styles.previewCard}>
          <h5 className={styles.cardKeyword}>{card.keyword}</h5>
          <p className={styles.cardExplanation}>
            {card.explanation.length > 150 
              ? card.explanation.substring(0, 150) + '...' 
              : card.explanation}
          </p>
        </div>
      ))}
      {cards.length > maxPreviewCards && (
        <div className={styles.moreCards}>
          <span className={styles.secondaryText}>+ {cards.length - maxPreviewCards} more cards</span>
        </div>
      )}
    </div>
  );
};

export default CustomPreviewCardSection; 
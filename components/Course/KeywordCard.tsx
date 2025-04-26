import styles from './KeywordCard.module.css';

interface KeywordCardProps {
  card: {
    id: number;
    title: string;
    description: string;
    keywords: string[];
    icon: string;
  };
}

export function KeywordCard({ card }: KeywordCardProps) {
  return (
    <div className={styles.keywordCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{card.icon}</span>
        <h3 className={styles.cardTitle}>{card.title}</h3>
      </div>
      
      <p className={styles.cardDescription}>{card.description}</p>
      
      {card.keywords && card.keywords.length > 0 && (
        <div className={styles.keywordTags}>
          {card.keywords.map((keyword, index) => (
            <span key={index} className={styles.keywordTag}>
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 
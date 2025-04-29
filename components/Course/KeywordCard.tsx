import styles from './KeywordCard.module.css';
import { useRouter } from 'next/navigation';

interface CardData {
  id: number;
  title: string;
  description: string;
  keywords: string[];
  icon: string;
}

interface KeywordCardProps {
  card: CardData;
  locale: string;
}

export function KeywordCard({ card, locale }: KeywordCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/${locale}/cards/${card.id}`);
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }} className={styles.keywordCard}>
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
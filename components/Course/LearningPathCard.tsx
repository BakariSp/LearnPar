import Link from 'next/link';
import styles from './LearningPathCard.module.css';
import { useRouter } from 'next/navigation';

interface RecommendationMetadata {
  interest_id: string;
  score: number;
  priority: number;
  tags: string[];
}

interface PathData {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  days: number;
  metadata?: RecommendationMetadata; // Optional metadata from recommendations API
}

interface LearningPathCardProps {
  path: PathData;
  locale: string;
}

export function LearningPathCard({ path, locale }: LearningPathCardProps) {
  const router = useRouter();
  const difficultyLevel = path.difficulty.toLowerCase();
  const hasMetadata = path.metadata !== undefined;

  const handleClick = () => {
    // Navigate to the recommendation page instead of directly to the learning path
    router.push(`/${locale}/learning-paths/recommendation/${path.id}`);
  };

  // Format the score percentage if available
  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <div onClick={handleClick} className={styles.learningPathCard}>
      {/* Add relevance indicator if metadata is available */}
      {/* {hasMetadata && (
        <div className={styles.relevanceIndicator}>
          <span className={styles.matchScore}>
            {formatScore(path.metadata!.score)} match
          </span>
        </div>
      )} */}

      <h3 className={styles.pathTitle}>
        {path.title}
      </h3>
      <p className={styles.pathDescription}>{path.description}</p>
      
      <div className={styles.pathMeta}>
        <div className={styles.metaItem}>
          <span className={styles.difficultyBadge} data-difficulty={difficultyLevel}>
            {difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)}
          </span>
          <span className={styles.daysCounter}>{path.days}/30 Days</span>
        </div>
      </div>

      {/* Display tags if available in metadata */}
      {hasMetadata && path.metadata!.tags && path.metadata!.tags.length > 0 && (
        <div className={styles.tagContainer}>
          {path.metadata!.tags.map((tag, index) => (
            <span key={index} className={styles.tagBadge}>
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <button className={styles.startButton}>Start learning</button>
    </div>
  );
} 
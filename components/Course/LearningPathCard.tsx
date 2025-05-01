import Link from 'next/link';
import styles from './LearningPathCard.module.css';
import { useRouter } from 'next/navigation';

interface PathData {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  days: number;
}

interface LearningPathCardProps {
  path: PathData;
  locale: string;
}

export function LearningPathCard({ path, locale }: LearningPathCardProps) {
  const router = useRouter();
  const difficultyLevel = path.difficulty.toLowerCase();

  const handleClick = () => {
    router.push(`/${locale}/learning-paths/${path.id}`);
  };

  return (
    <div onClick={handleClick} className={styles.learningPathCard}>
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
      
      <button className={styles.startButton}>Continue learning</button>
    </div>
  );
} 
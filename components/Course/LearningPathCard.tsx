import styles from './LearningPathCard.module.css';

interface LearningPathCardProps {
  path: {
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    days: number;
  };
}

export function LearningPathCard({ path }: LearningPathCardProps) {
  return (
    <div className={styles.learningPathCard}>
      <h3 className={styles.pathTitle}>{path.title}</h3>
      <p className={styles.pathDescription}>{path.description}</p>
      
      <div className={styles.pathMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Category:</span>
          <span className={styles.metaValue}>{path.category}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Difficulty:</span>
          <span className={`${styles.metaValue} ${styles[path.difficulty]}`}>
            {path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1)}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Duration:</span>
          <span className={styles.metaValue}>{path.days} days</span>
        </div>
      </div>
      
      <button className={styles.startButton}>Start Learning</button>
    </div>
  );
} 
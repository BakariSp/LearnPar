import styles from './CourseCard.module.css';

interface CourseCardProps {
  course: {
    id: number;
    title: string;
    subtitle: string;
    progress: number;
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className={styles.courseCard}>
      <h3 className={styles.courseTitle}>{course.title}</h3>
      <p className={styles.courseSubtitle}>{course.subtitle}</p>
      
      <div className={styles.progressContainer}>
        <div className={styles.progressText}>{course.progress}%</div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${course.progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
} 
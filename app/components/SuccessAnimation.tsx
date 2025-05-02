import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SuccessAnimation.module.css';

interface SuccessAnimationProps {
  message: string;
  redirectPath: string;
  delay?: number;
  onAnimationComplete?: () => void;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ 
  message, 
  redirectPath, 
  delay = 2000,
  onAnimationComplete 
}) => {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Set a timeout to handle redirection
    const timer = setTimeout(() => {
      setIsAnimating(false);
      
      // Call the optional callback if provided
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      
      // Navigate to the specified path
      router.push(redirectPath);
    }, delay);

    // Cleanup the timer
    return () => clearTimeout(timer);
  }, [redirectPath, delay, router, onAnimationComplete]);

  return (
    <div className={styles.successAnimationOverlay}>
      <div className={`${styles.successAnimationContainer} ${isAnimating ? styles.animateIn : styles.animateOut}`}>
        <div className={styles.checkmarkContainer}>
          <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none" />
            <path 
              className={styles.checkmarkCheck} 
              fill="none" 
              d="M14.1 27.2l7.1 7.2 16.7-16.8" 
            />
          </svg>
        </div>
        <p className={styles.successMessage}>{message}</p>
      </div>
    </div>
  );
};

export default SuccessAnimation; 
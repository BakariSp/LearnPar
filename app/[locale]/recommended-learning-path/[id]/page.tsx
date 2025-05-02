'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetFullLearningPath, apiAddToMyLearningPaths, FullLearningPathResponse } from '@/services/api';
import { isAuthenticated } from '@/services/auth';
import CustomPreviewCardSection from '@/components/learning-path/CustomPreviewCardSection';
import styles from './page.module.css';
import detailStyles from '../../learning-paths/[id]/learning-path-detail.module.css';

interface RecommendedLearningPathPageProps {
  params?: Promise<{
    id: string;
    locale?: string;
  }>;
}

export default function RecommendedLearningPathPage({ params }: RecommendedLearningPathPageProps) {
  const router = useRouter();
  const [pathId, setPathId] = useState<string | undefined>();
  const [locale, setLocale] = useState<string>('en');
  const [learningPath, setLearningPath] = useState<FullLearningPathResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = isAuthenticated();
  const [isAddingPath, setIsAddingPath] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info' | null, message: string | null }>({
    type: null,
    message: null
  });

  useEffect(() => {
    const resolveParams = async () => {
      if (params) {
        const resolvedParams = await params;
        setPathId(resolvedParams.id);
        if (resolvedParams.locale) {
          setLocale(resolvedParams.locale);
        }
      }
    };
    
    resolveParams();
  }, [params]);

  useEffect(() => {
    const fetchLearningPath = async () => {
      if (!pathId) return;

      try {
        setLoading(true);
        // API call - don't need to check for task status for recommendation viewing
        const data = await apiGetFullLearningPath(Number(pathId));
        
        if (data) {
          setLearningPath(data);
          setError(null);
        } else {
          setError('Failed to load learning path. Please try again later.');
        }
      } catch (err: any) {
        console.error('Error fetching learning path:', err);
        setError(err.message || 'Error loading learning path');
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPath();
  }, [pathId]);

  // Clear notification after a delay
  useEffect(() => {
    if (notification.type && notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: null, message: null });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLoginRedirect = () => {
    // Store the current path to redirect back after login
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    router.push(`/${locale}/login`);
  };

  const handleAddToMyPaths = async () => {
    if (!learningPath) return;
    
    setIsAddingPath(true);
    try {
      const success = await apiAddToMyLearningPaths(learningPath.id);
      
      if (success) {
        setNotification({
          type: 'success',
          message: `"${learningPath.title}" added to your learning paths!`
        });
        
        // Redirect to my paths page after a short delay
        setTimeout(() => {
          router.push(`/${locale}/my-paths`);
        }, 1500);
      } else {
        throw new Error('Failed to add learning path');
      }
    } catch (error: any) {
      // Check if the error is because the path is already in the user's collection
      if (error.message && error.message.includes('already in your account')) {
        setNotification({
          type: 'info',
          message: `"${learningPath.title}" is already in your learning paths.`
        });
        
        // Redirect to the user's learning paths page after a short delay
        setTimeout(() => {
          router.push(`/${locale}/my-paths`);
        }, 1500);
      } else {
        setNotification({
          type: 'error',
          message: error.message || 'Failed to add to your learning paths'
        });
      }
    } finally {
      setIsAddingPath(false);
    }
  };

  if (loading) {
    return (
      <div className={detailStyles.loading}>
        <div className={styles.spinner}></div>
        <div className={styles.loadingText}>Loading learning path...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={detailStyles.detailPageContainer}>
        <div className={`${detailStyles.alertContainer} ${detailStyles.alertError}`}>
          <div className={detailStyles.alertTitle}>Error Loading Learning Path</div>
          <div className={detailStyles.alertDescription}>{error}</div>
          <button 
            className={`${detailStyles.navButton}`} 
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className={detailStyles.detailPageContainer}>
        <div className={`${detailStyles.alertContainer} ${detailStyles.alertWarning}`}>
          <div className={detailStyles.alertTitle}>Learning Path Not Found</div>
          <div className={detailStyles.alertDescription}>The requested learning path could not be found.</div>
          <button 
            className={`${detailStyles.navButton}`} 
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={detailStyles.detailPageContainer}>
      {notification.type && notification.message && (
        <div className={`${styles.notification} ${styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
          {notification.message}
        </div>
      )}
      
      <div className={detailStyles.detailHeader}>
        <div className={detailStyles.headerTitleSection}>
          <h2 className={detailStyles.pathTitleHeader}>{learningPath.title}</h2>
          <p className={detailStyles.pathDescriptionHeader}>{learningPath.description}</p>
          <div className={detailStyles.pathMetaHeader}>
            <span>{learningPath.category}</span>
            <span>{learningPath.difficulty_level}</span>
            <span>{learningPath.estimated_days} days</span>
          </div>
        </div>
        <div className={detailStyles.headerControls}>
          {isLoggedIn ? (
            <button 
              className={`${detailStyles.navButton} ${detailStyles.nextAction}`} 
              onClick={handleAddToMyPaths} 
              disabled={isAddingPath}
            >
              {isAddingPath ? 'Adding...' : 'Add to My Learning Paths'}
            </button>
          ) : (
            <div>
              <button 
                className={`${detailStyles.navButton} ${detailStyles.nextAction}`} 
                onClick={handleLoginRedirect}
              >
                Login to Add to My Paths
              </button>
              <div className={styles.secondaryText}>
                Login required to save this path
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={detailStyles.detailContent}>
        <h3 className={styles.subtitle}>Courses</h3>
        <div className={detailStyles.structureView}>
          {learningPath.courses.map((course, courseIndex) => (
            <div key={course.id} className={detailStyles.courseWrapper}>
              <div className={detailStyles.timeIndicator}>
                Course {courseIndex + 1}
              </div>
              <div className={detailStyles.courseItem}>
                <h4 className={detailStyles.courseTitle}>{course.title}</h4>
                <p className={styles.description}>{course.description}</p>
                
                <div className={styles.divider}></div>
                
                {course.sections.map((section, sectionIndex) => (
                  <div key={section.id} className={styles.sectionCard}>
                    <h5 className={styles.sectionTitle}>{courseIndex + 1}.{sectionIndex + 1} {section.title}</h5>
                    <p className={styles.description}>{section.description}</p>
                    
                    <h5 className={styles.sectionTitle}>Learning Cards ({section.cards.length})</h5>
                    <CustomPreviewCardSection cards={section.cards} maxPreviewCards={2} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
import { useState, useEffect } from 'react';
import { FullLearningPathResponse, CourseResponse, SectionResponse, CardResponse } from '@/services/api';
import { getCurrentUser } from '@/services/supabase';
import styles from '../styles';
import localStyles from './PathNavigation.module.css';

interface PathNavigationProps {
  learningPathData: FullLearningPathResponse;
  expandedItems: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  selectedCard: CardResponse | null;
  toggleCourseExpand: (courseId: number) => void;
  toggleSectionExpand: (sectionId: number) => void;
  handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[]) => void;
  handleAddToMyPaths?: () => void;
  handleLoginRedirect?: () => void;
  showAddButton?: boolean;
  statusTag?: React.ReactNode;
  locale?: string;
  onAddSuccess?: () => void;
  calculateSectionProgress?: (sectionId: number) => number;
  calculateCourseProgress?: (courseId: number) => number;
  calculateLearningPathProgress?: () => number;
}

export default function PathNavigation({
  learningPathData,
  expandedItems,
  expandedSections,
  selectedCard,
  toggleCourseExpand,
  toggleSectionExpand,
  handleCardSelect,
  handleAddToMyPaths,
  handleLoginRedirect,
  showAddButton = true,
  statusTag,
  locale = 'en',
  onAddSuccess,
  calculateSectionProgress,
  calculateCourseProgress,
  calculateLearningPathProgress
}: PathNavigationProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsLoggedIn(!!user);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  // Calculate the overall learning path progress
  const pathProgress = learningPathData.progress !== undefined 
    ? learningPathData.progress 
    : calculateLearningPathProgress 
      ? calculateLearningPathProgress() 
      : 0;

  return (
    <div className={styles.structureNavPane}>
      {/* Path Title and Meta */}
      <div className={styles.navHeader}>
        <h2 className={styles.navPathTitle}>{learningPathData.title}</h2>
        <p className={styles.navPathDescription}>
          Custom learning path based on user structure: {learningPathData.title}
        </p>
        
        {/* Progress Bar for Learning Path */}
        <div className={localStyles.progressContainer}>
          <div className={localStyles.progressLabel}>
            Overall Progress
            <span className={localStyles.progressPercentage}>{pathProgress}%</span>
          </div>
          <div className={localStyles.progressBar}>
            <div 
              className={localStyles.progressFill} 
              style={{ width: `${pathProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className={localStyles.tagContainer}>
          <span className={localStyles.tag}>{learningPathData.category}</span>
          <span className={localStyles.tag}>{learningPathData.difficulty_level}</span>
          <span className={localStyles.tag}>{learningPathData.estimated_days} days</span>
        </div>

        {/* Status badges/tags displayed only if needed */}
        {pathProgress === 100 && (
          <div className={localStyles.tagContainer}>
            <span className={`${localStyles.tag} ${localStyles.successTag}`}>completed (finished)</span>
          </div>
        )}
        
        {/* Horizontal divider */}
        {showAddButton && <div className={localStyles.divider} />}
        
        {/* Add to My Learning Path button in its own row below status */}
        {showAddButton && (
          <div className={localStyles.buttonContainer}>
            {isLoggedIn ? (
              <button
                className={`${localStyles.button} ${localStyles.primaryButton}`}
                onClick={handleAddToMyPaths || onAddSuccess}
              >
                <span className={localStyles.icon}>+</span>
                Add to My Learning Paths
              </button>
            ) : (
              <button
                className={`${localStyles.button} ${localStyles.primaryButton}`}
                onClick={handleLoginRedirect}
              >
                <span className={localStyles.icon}>+</span>
                Login to Add to My Paths
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable container for course list */}
      <div className={styles.navCourseListContainer}>
        <ul className={styles.navCourseList}>
          {learningPathData.courses.map((course, courseIndex) => {
            // Calculate course progress
            const courseProgress = course.progress !== undefined 
              ? course.progress 
              : calculateCourseProgress 
                ? calculateCourseProgress(course.id) 
                : 0;
                
            const isCourseCompleted = courseProgress === 100;
                
            return (
              <li className={styles.navCourseItem} key={course.id}>
                <button
                  className={styles.navCourseHeaderButton}
                  onClick={() => toggleCourseExpand(course.id)}
                >
                  <span className={`${styles.navToggleIcon} ${expandedItems[course.id] ? styles.expanded : ''}`}></span>
                  <div className={styles.navCourseHeader}>
                    <span className={styles.navCourseOrder}>Course {courseIndex + 1}</span>
                    <span className={styles.navCourseTitle}>
                      {course.title}
                      {isCourseCompleted && <span className={styles.completedTag}>Completed</span>}
                    </span>
                  </div>
                </button>

                {/* Add course progress bar */}
                {expandedItems[course.id] && (
                  <div className={localStyles.courseProgressContainer}>
                    <div className={localStyles.progressLabel}>
                      Course Progress
                      <span className={localStyles.progressPercentage}>{courseProgress}%</span>
                    </div>
                    <div className={localStyles.progressBar}>
                      <div 
                        className={localStyles.progressFill} 
                        style={{ width: `${courseProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {expandedItems[course.id] && (
                  <ul className={styles.navSectionList}>
                    {course.sections.map((section, sectionIndex) => {
                      // Calculate section progress
                      const sectionProgress = section.progress !== undefined 
                        ? section.progress 
                        : calculateSectionProgress 
                          ? calculateSectionProgress(section.id) 
                          : 0;
                          
                      const isSectionCompleted = sectionProgress === 100;
                          
                      return (
                        <li className={styles.navSectionItem} key={section.id}>
                          <button
                            className={styles.navSectionHeaderButton}
                            onClick={() => toggleSectionExpand(section.id)}
                          >
                            <span className={styles.navSectionTitle}>
                              {courseIndex + 1}.{sectionIndex + 1} {section.title}
                              {isSectionCompleted && <span className={styles.completedTag}>Completed</span>}
                            </span>
                            <span className={`${styles.sectionToggleIcon} ${expandedSections[section.id] ? styles.expanded : ''}`}></span>
                          </button>

                          {expandedSections[section.id] && section.cards && (
                            <ul className={styles.navCardList}>
                              {section.cards.map((cardItem, cardIndex) => {
                                // Handle both nested and direct card structure
                                const card = cardItem.card ? cardItem.card : cardItem;
                                const isCompleted = cardItem.is_completed !== undefined ? cardItem.is_completed : card.is_completed;
                                
                                return (
                                  <li 
                                    className={styles.navCardItem} 
                                    key={card.id ? `card-${card.id}` : `card-section-${section.id}-index-${cardIndex}`}
                                  >
                                    <button
                                      className={`${styles.navCardLink} ${selectedCard?.id === card.id ? styles.selectedCard : ''} ${isCompleted ? styles.completed : ''}`}
                                      onClick={() => handleCardSelect(card, section.id, section.cards)}
                                    >
                                      {card.keyword}
                                    </button>
                                  </li>
                                );
                              })}
                              {(!section.cards || section.cards.length === 0) && (
                                <li className={styles.navCardItem} key={`empty-section-${section.id}-no-cards`}>No learning cards available</li>
                              )}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
} 
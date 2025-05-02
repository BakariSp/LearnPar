import { useState } from 'react';
import { FullLearningPathResponse, CourseResponse, SectionResponse, CardResponse } from '@/services/api';
import { isAuthenticated } from '@/services/auth';
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
  onAddSuccess
}: PathNavigationProps) {
  const isLoggedIn = isAuthenticated();

  return (
    <div className={styles.structureNavPane}>
      {/* Path Title and Meta */}
      <div className={styles.navHeader}>
        <h2 className={styles.navPathTitle}>{learningPathData.title}</h2>
        <p className={styles.navPathDescription}>
          Custom learning path based on user structure: {learningPathData.title}
        </p>
        
        <div className={localStyles.tagContainer}>
          <span className={localStyles.tag}>{learningPathData.category}</span>
          <span className={localStyles.tag}>{learningPathData.difficulty_level}</span>
          <span className={localStyles.tag}>{learningPathData.estimated_days} days</span>
        </div>

        {/* Status badges/tags displayed on their own row */}
        <div className={localStyles.tagContainer}>
          {statusTag || <span className={`${localStyles.tag} ${localStyles.successTag}`}>completed (finished)</span>}
        </div>
        
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

      {/* Course list */}
      <ul className={styles.navCourseList}>
        {learningPathData.courses.map((course, courseIndex) => (
          <li className={styles.navCourseItem} key={course.id}>
            <button
              className={styles.navCourseHeaderButton}
              onClick={() => toggleCourseExpand(course.id)}
            >
              <div className={styles.navCourseHeader}>
                <span className={styles.navCourseOrder}>Course {courseIndex + 1}</span>
                <span className={styles.navCourseTitle}>{course.title}</span>
              </div>
              <span>{expandedItems[course.id] ? '▼' : '▶'}</span>
            </button>

            {expandedItems[course.id] && (
              <ul className={localStyles.navSectionList}>
                {course.sections.map((section, sectionIndex) => (
                  <li className={localStyles.navSectionItem} key={section.id}>
                    <button
                      className={localStyles.navSectionHeaderButton}
                      onClick={() => toggleSectionExpand(section.id)}
                    >
                      <span className={localStyles.navSectionTitle}>
                        {courseIndex + 1}.{sectionIndex + 1} {section.title}
                      </span>
                      <span>{expandedSections[section.id] ? '▼' : '▶'}</span>
                    </button>

                    <div className={localStyles.navCardCountInfo}>
                      <span>{section.cards ? section.cards.length : 0} cards</span>
                    </div>

                    {expandedSections[section.id] && section.cards && (
                      <ul className={localStyles.navCardList}>
                        {section.cards.map((card) => (
                          <li className={localStyles.navCardItem} key={card.id}>
                            <button
                              className={`${localStyles.navCardLink} ${selectedCard?.id === card.id ? localStyles.selectedCard : ''}`}
                              onClick={() => handleCardSelect(card, section.id, section.cards)}
                            >
                              {card.keyword}
                            </button>
                          </li>
                        ))}
                        {(!section.cards || section.cards.length === 0) && (
                          <li className={localStyles.navNoCards}>No learning cards available</li>
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 
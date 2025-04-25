import React from 'react';
// Import necessary types - adjust paths as needed
import { CourseResponse, SectionResponse, CardResponse } from '@/services/api'; // Assuming types are here
import styles from './LearningPathCourseItem.module.css'; // Import the new CSS module

interface LearningPathCourseItemProps {
    course: CourseResponse;
    courseIndex: number;
    isCourseExpanded: boolean;
    expandedItems: Record<string, boolean>;
    sectionCardsCache: Record<number, CardResponse[]>;
    isFetchingSection: boolean;
    currentSectionIdForFetch: number | null;
    selectedCard: CardResponse | null;
    toggleExpand: (itemId: string, itemType: 'course' | 'section', sectionId?: number) => void;
    handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect?: boolean) => void;
}

export const LearningPathCourseItem: React.FC<LearningPathCourseItemProps> = ({
    course,
    courseIndex,
    isCourseExpanded,
    expandedItems,
    sectionCardsCache,
    isFetchingSection,
    currentSectionIdForFetch,
    selectedCard,
    toggleExpand,
    handleCardSelect,
}) => {
    const courseItemId = `course-${course.id}`;

    return (
        <div className={styles.courseItemContainer}>
            <button
                onClick={() => toggleExpand(courseItemId, 'course')}
                className={styles.courseHeaderButton}
                aria-expanded={isCourseExpanded}
            >
                <div className={styles.courseHeaderInfo}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                </div>
                <span className={`${styles.itemToggleIcon} ${isCourseExpanded ? styles.expanded : ''}`}>▼</span>
            </button>

            {isCourseExpanded && (
                <div className={styles.sectionsContainer}>
                    {course.sections.map((section, sectionIndex) => {
                        const sectionItemId = `section-${section.id}`;
                        const isSectionExpanded = !!expandedItems[sectionItemId];
                        const cards = sectionCardsCache[section.id];
                        const isLoadingThisSection = currentSectionIdForFetch === section.id && isFetchingSection;
                        const hasFetched = cards !== undefined;
                        const fetchError = hasFetched && Array.isArray(cards) && cards.length === 0;

                        return (
                            <div key={section.id} className={styles.sectionItem}>
                                <button
                                    onClick={() => toggleExpand(sectionItemId, 'section', section.id)}
                                    className={styles.sectionHeaderButton}
                                    aria-expanded={isSectionExpanded}
                                >
                                    <div className={styles.sectionHeaderInfo}>
                                        <h4 className={styles.sectionTitle}>{section.title}</h4>
                                    </div>
                                    <span className={`${styles.itemToggleIcon} ${isSectionExpanded ? styles.expanded : ''}`}>▼</span>
                                </button>

                                {isSectionExpanded && (
                                    <div className={styles.sectionContent}>
                                        {isLoadingThisSection && (
                                            <div className={styles.loadingCards}>
                                                <span className={styles.smallSpinner}></span> Loading cards...
                                            </div>
                                        )}
                                        {!isLoadingThisSection && hasFetched && fetchError && (
                                            <div className={styles.errorLoadingCards}>
                                                Could not load cards.
                                            </div>
                                        )}
                                        {!isLoadingThisSection && hasFetched && !fetchError && cards && cards.length > 0 && (
                                            <ul className={styles.cardList}>
                                                {cards.map((card) => (
                                                    <li key={card.id} className={styles.cardListItem}>
                                                        <button
                                                            onClick={() => handleCardSelect(card, section.id, cards)}
                                                            className={styles.cardButton}
                                                        >
                                                            <span className={styles.cardIcon}>📄</span>
                                                            <span className={styles.cardKeyword}>{card.keyword}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {!isLoadingThisSection && hasFetched && !fetchError && cards && cards.length === 0 && (
                                            <div className={styles.noCards}>
                                                No cards in this section.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}; 
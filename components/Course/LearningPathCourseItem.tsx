import React, { useEffect } from 'react';
import { CourseResponse, SectionResponse, CardResponse, TaskStatusResponse } from '@/services/api'; // Assuming types are here
import styles from './LearningPathCourseItem.module.css'; // Import the new CSS module
import myPathsStyles from '@/app/[locale]/my-paths/my-paths.module.css'; // Import the my-paths styles for animations

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
    taskStatus: TaskStatusResponse | null;
    sectionReadyStatus: Record<number, boolean>;
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
    taskStatus,
    sectionReadyStatus,
}) => {
    const courseItemId = `course-${course.id}`;

    // --- Helper to check if overall task is active ---
    const isTaskActive = (status: TaskStatusResponse | null): boolean => {
      return !!status && ['pending', 'queued', 'starting', 'running'].includes(status.status);
    };

    // --- Helper to render status indicator ---
    const renderSectionStatusIndicator = (sectionId: number) => {
        const isSectionReady = sectionReadyStatus[sectionId];
        const overallTaskActive = isTaskActive(taskStatus);

        // Determine indicator state
        const showGenerating = overallTaskActive && !isSectionReady;

        if (showGenerating) {
            return (
                <span 
                    className={`${styles.statusIndicator} ${styles.generating}`}
                    title="Section generation in progress..."
                    aria-label="Section generation in progress"
                >
                    <span className={myPathsStyles.smallSpinner}></span>
                </span>
            );
        }

        return (
            <span
                className={`${styles.statusIndicator} ${styles.ready}`}
                title="Section ready"
                aria-label="Section ready"
            >
                ●
            </span>
        );
    };

    // Initialize section readiness for sections with cards
    useEffect(() => {
        if (course.sections && Array.isArray(course.sections)) {
            // For any section that has cards in the API response, mark it as ready
            const readySections = course.sections.reduce((acc, section) => {
                if (section.cards && Array.isArray(section.cards) && section.cards.length > 0) {
                    acc[section.id] = true;
                }
                return acc;
            }, {} as Record<number, boolean>);
            
            // Log what we're doing for debugging
            if (Object.keys(readySections).length > 0) {
                console.log('Marking sections with cards as ready:', readySections);
            }
        }
    }, [course.sections]);

    return (
        <div className={styles.courseItemContainer}>
            {/* Course Header */}
            <button
                className={styles.courseHeaderButton}
                onClick={() => toggleExpand(courseItemId, 'course')}
                aria-expanded={isCourseExpanded}
                aria-controls={`${courseItemId}-content`}
            >
                <span className={styles.courseHeaderTitle}>
                    {courseIndex + 1}. {course.title}
                </span>
                <span className={styles.courseHeaderToggleIcon}>{isCourseExpanded ? '▼' : '▶'}</span>
            </button>

            {/* Course Content (Sections) - Shown when expanded */}
            <div
                id={`${courseItemId}-content`}
                className={`${styles.courseContent} ${isCourseExpanded ? styles.expanded : ''}`}
                hidden={!isCourseExpanded}
                role="region"
                aria-labelledby={courseItemId}
            >
                <ul className={styles.sectionList}>
                    {course.sections && Array.isArray(course.sections) ? course.sections.map(section => {
                        const sectionItemId = `section-${section.id}`;
                        const isSectionExpanded = !!expandedItems[sectionItemId];
                        const isLoadingThisSection = currentSectionIdForFetch === section.id && isFetchingSection;
                        
                        // First try to get cards from the cache, then fallback to the API response
                        let cards: CardResponse[] = [];
                        if (sectionCardsCache.hasOwnProperty(section.id)) {
                            cards = sectionCardsCache[section.id] || [];
                        } else if (section.cards && Array.isArray(section.cards)) {
                            cards = section.cards;
                        }
                        
                        // Add debug logging for section data
                        console.log(`DEBUG Section ${section.id} (${section.title}):`, {
                            sectionId: section.id,
                            hasSectionCards: section.cards && Array.isArray(section.cards),
                            sectionCardsLength: section.cards?.length,
                            sectionCardsData: section.cards?.map(card => ({
                                id: card.id,
                                keyword: card.keyword || 'No keyword',
                                hasQuestionField: !!card.question,
                                isCompleted: card.is_completed
                            })),
                            hasCardsInCache: sectionCardsCache.hasOwnProperty(section.id),
                            cacheCardsLength: sectionCardsCache[section.id]?.length,
                            finalCardsLength: cards.length,
                            isSectionReady: sectionReadyStatus[section.id] || false
                        });
                        
                        const hasCards = cards.length > 0;
                        const isSectionReady = sectionReadyStatus[section.id] || hasCards;
                        const overallTaskActive = isTaskActive(taskStatus);
                        const canInteract = isSectionReady || !overallTaskActive;

                        return (
                            <li key={section.id} className={styles.sectionListItem}>
                                {/* Section Header Button */}
                                <button
                                    className={styles.sectionHeaderButton}
                                    onClick={() => toggleExpand(sectionItemId, 'section', section.id)}
                                    aria-expanded={isSectionExpanded}
                                    aria-controls={`${sectionItemId}-content`}
                                    title={overallTaskActive && !isSectionReady ? 'Section generation likely in progress...' : section.title}
                                >
                                    {/* Status Indicator */}
                                    {renderSectionStatusIndicator(section.id)}
                                    <span className={styles.sectionHeaderTitle}>{section.title}</span>
                                    <span className={styles.sectionHeaderToggleIcon}>
                                        {isLoadingThisSection ? <span className={myPathsStyles.smallSpinner}></span> : (isSectionExpanded ? '▼' : '▶')}
                                    </span>
                                </button>

                                {/* Section Content (Cards) - Shown when expanded */}
                                <div
                                    id={`${sectionItemId}-content`}
                                    className={`${styles.sectionContent} ${isSectionExpanded ? styles.expanded : ''}`}
                                    hidden={!isSectionExpanded}
                                    role="region"
                                    aria-labelledby={sectionItemId}
                                >
                                    {/* Show loading spinner *only* when actively fetching this section */}
                                    {isSectionExpanded && isLoadingThisSection && (
                                        <div className={myPathsStyles.sectionGenerating}>
                                            <span className={myPathsStyles.smallSpinner}></span>
                                            <p>Loading section content...</p>
                                        </div>
                                    )}

                                    {/* Show cards if expanded, not loading, and cards are available */}
                                    {isSectionExpanded && !isLoadingThisSection && hasCards && (
                                        <ul className={`${styles.cardList} ${myPathsStyles.fadeIn}`}>
                                            {cards.map(card => (
                                                <li key={card.id} className={`${styles.cardListItem} ${selectedCard?.id === card.id ? styles.selected : ''}`}>
                                                    <button
                                                        className={styles.cardButton}
                                                        onClick={() => handleCardSelect(card, section.id, cards)}
                                                        title={`View card: ${card.keyword}`}
                                                    >
                                                        {card.keyword}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Show "No cards" if expanded, not loading, no cards available */}
                                    {isSectionExpanded && !isLoadingThisSection && !hasCards && (
                                        <p className={styles.noCardsMessage}>No cards found for this section.</p>
                                    )}

                                    {/* Show "Generating" msg if expanded, not loading, task active, section not ready */}
                                    {isSectionExpanded && !isLoadingThisSection && overallTaskActive && !isSectionReady && (
                                        <div className={myPathsStyles.generatingState}>
                                            <span className={myPathsStyles.smallSpinner}></span>
                                            <p>Section generation in progress... Cards will appear once ready.</p>
                                            <div className={`${myPathsStyles.progressBar} ${myPathsStyles.active}`}></div>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    }) : (
                        <li className={styles.noSectionsMessage}>No sections found for this course.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}; 
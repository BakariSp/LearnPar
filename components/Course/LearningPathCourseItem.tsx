import React from 'react';
// Import necessary types - adjust paths as needed
import { CourseResponse, SectionResponse, CardResponse, TaskStatusResponse } from '@/services/api'; // Assuming types are here
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

        const statusClass = showGenerating ? styles.generating : styles.ready;
        const title = showGenerating ? 'Section generation likely in progress...' : 'Section ready';
        return (
            <span
                className={`${styles.statusIndicator} ${statusClass}`}
                title={title}
                aria-label={title}
            >
                ●
            </span>
        );
    };

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
                    {course.sections.map(section => {
                        const sectionItemId = `section-${section.id}`;
                        const isSectionExpanded = !!expandedItems[sectionItemId];
                        const isLoadingThisSection = currentSectionIdForFetch === section.id && isFetchingSection;
                        const cards = sectionCardsCache[section.id] || [];
                        const isSectionReady = sectionReadyStatus[section.id];
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
                                        {isLoadingThisSection ? <span className={styles.smallSpinner}></span> : (isSectionExpanded ? '▼' : '▶')}
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
                                        <div className={styles.cardsLoading}>Loading cards...</div>
                                    )}

                                    {/* Show cards if expanded, not loading, and cards are available in cache */}
                                    {isSectionExpanded && !isLoadingThisSection && sectionCardsCache.hasOwnProperty(section.id) && cards.length > 0 && (
                                        <ul className={styles.cardList}>
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

                                    {/* Show "No cards" if expanded, not loading, cache entry exists, but is empty */}
                                    {isSectionExpanded && !isLoadingThisSection && sectionCardsCache.hasOwnProperty(section.id) && cards.length === 0 && (
                                        <p className={styles.noCardsMessage}>No cards found for this section.</p>
                                    )}

                                    {/* Show "Generating" msg if expanded, not loading, task active, section not ready */}
                                    {isSectionExpanded && !isLoadingThisSection && overallTaskActive && !isSectionReady && (
                                        <p className={styles.generationInProgressMessage}>Section generation likely in progress. Cards will appear once ready.</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}; 
import React from 'react';
import styles from './my-paths.module.css'; // Assuming styles are passed or imported
import {
    FullLearningPathResponse,
    TaskStatusResponse,
    CardResponse,
    CardResource,
    CompletionInfo,
    NextItemInfo,
    CourseResponse
} from '@/services/api'; // All should now come from api
import {
    // Make sure this type is defined/imported if needed
} from '@/services/api'; // Import these from your central types file (adjust path if needed)
import { LearningPathCourseItem } from '@/components/Course/LearningPathCourseItem'; // Import the new component

// Define the props the component will receive
interface PathDetailViewProps {
    selectedPathId: number | null;
    learningPathData: FullLearningPathResponse | null;
    isLoadingDetails: boolean;
    detailError: string | null;
    taskStatus: TaskStatusResponse | null; // Overall task status
    isFetchingStatus: boolean;
    currentViewMode: 'structure' | 'card' | 'completion';
    selectedCard: CardResponse | null;
    selectedCardSectionId: number | null;
    selectedCardSectionCards: CardResponse[];
    completionInfo: CompletionInfo | null;
    expandedItems: Record<string, boolean>;
    sectionCardsCache: Record<number, CardResponse[]>;
    isFetchingSection: boolean;
    currentSectionIdForFetch: number | null;
    toggleExpand: (itemId: string, itemType: 'course' | 'section', sectionId?: number) => void;
    handleCardSelect: (card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect?: boolean) => void;
    navigateToPreviousCard: () => void;
    navigateToNextCard: () => void;
    handleNavigateNext: (nextItem: NextItemInfo | null) => void;
    getCurrentCardIndex: () => number;
    hasPreviousCard: boolean;
    hasNextCardInSection: boolean;
    handleDeletePath: (pathId: number) => void;
    deletingPathId: number | null;
    sectionReadyStatus: Record<number, boolean>; // NEW: Section readiness map
    // styles?: Record<string, string>;
}

export const PathDetailView: React.FC<PathDetailViewProps> = ({
    selectedPathId,
    learningPathData,
    isLoadingDetails,
    detailError,
    taskStatus,
    isFetchingStatus,
    currentViewMode,
    selectedCard,
    selectedCardSectionId,
    selectedCardSectionCards,
    completionInfo,
    expandedItems,
    sectionCardsCache,
    isFetchingSection,
    currentSectionIdForFetch,
    toggleExpand,
    handleCardSelect,
    navigateToPreviousCard,
    navigateToNextCard,
    handleNavigateNext,
    getCurrentCardIndex,
    hasPreviousCard,
    hasNextCardInSection,
    handleDeletePath,
    deletingPathId,
    sectionReadyStatus,
    // styles // Remove if it was only for LearningPathCourseItem
}) => {

    // --- Helper Functions Moved Here ---

    // Render card resources
    const renderResources = (resources: CardResource): JSX.Element => {
        const resourceEntries = Object.entries(resources).filter(([, value]) => value && value.length > 0);

        if (resourceEntries.length === 0) {
            return <p>No additional resources provided.</p>;
        }

        return (
            <ul className={styles.resourceList}>
                {resourceEntries.map(([key, value]) => (
                    <li key={key}>
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                        {Array.isArray(value) ? (
                            <ul>
                                {value.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        ) : (
                            <span> {value}</span> // Handle potential non-array values if needed
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    // Render status badge
    const renderStatusBadge = () => {
        if (isFetchingStatus) {
            return <span className={`${styles.statusBadge} ${styles.statusLoading}`}>Checking status...</span>;
        }
        if (!taskStatus) {
            // If no task found, assume generation is complete or wasn't tracked
            // We could show nothing or a default "Ready" status if path data exists
            return learningPathData ? <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>Ready</span> : null;
            // return null; // Or show nothing if no status is available
        }

        let statusText = taskStatus.status.replace('_', ' ').toUpperCase();
        let statusStyle = styles.statusUnknown;

        switch (taskStatus.status) {
            case 'completed':
                statusStyle = styles.statusCompleted;
                break;
            case 'pending':
            case 'running': // Combine running-like statuses
                statusStyle = styles.statusRunning;
                break;
            case 'failed':
            case 'timeout': // Treat timeout as failed
                statusStyle = styles.statusFailed;
                if (taskStatus.result_message) {
                    statusText += ` - ${taskStatus.result_message}`;
                } else if (taskStatus.error_details) {
                    statusText += ` - Error`;
                }
                break;
            default:
                statusStyle = styles.statusUnknown;
        }

        return <span className={`${styles.statusBadge} ${statusStyle}`}>{statusText}</span>;
    };


    // --- Main Render Logic for Detail Pane ---

    if (!selectedPathId && !isLoadingDetails && !detailError) {
        return (
            <div className={styles.detailPlaceholder}>
                <h2>Select a Learning Path</h2>
                <p>Choose a path from the list on the left to view its details.</p>
            </div>
        );
    }

    if (isLoadingDetails) {
        return (
            <div className={styles.detailLoading}>Loading Path Details...</div>
        );
    }

    if (detailError && !isLoadingDetails) {
        return (
            <div className={styles.detailError}>
                <h2>Error Loading Path</h2>
                <p>{detailError}</p>
                {/* Optionally add a retry button for the specific path */}
                {/* <button onClick={() => fetchPathDetails(selectedPathId)}>Retry</button> */}
            </div>
        );
    }

    // Render Detail Content when loaded and no error
    if (selectedPathId && learningPathData && !isLoadingDetails && !detailError) {
        const isDeletingThisPath = deletingPathId === selectedPathId;

        return (
            <div className={styles.detailContentContainer}> {/* Added container */}
                {/* Header Section */}
                <header className={styles.detailHeader}>
                    <div className={styles.headerTitleSection}>
                        <h1 className={styles.pathTitleHeader}>{learningPathData.title}</h1>
                        <p className={styles.pathDescriptionHeader}>{learningPathData.description}</p>
                        <div className={styles.pathMetaHeader}>
                            <span>{learningPathData.category}</span>
                            <span>{learningPathData.difficulty_level}</span>
                            <span>{learningPathData.estimated_days} days</span>
                            {/* Render Status Badge */}
                            {renderStatusBadge()}
                        </div>
                    </div>
                    <div className={styles.headerControls}>
                        <button
                            onClick={() => handleDeletePath(selectedPathId)}
                            className={`${styles.detailDeleteButton} ${isDeletingThisPath ? styles.deleting : ''}`}
                            disabled={isDeletingThisPath || isLoadingDetails} // Disable while deleting or loading details
                            title="Delete this Learning Path"
                        >
                            {isDeletingThisPath ? (
                                <>
                                  <span className={styles.smallSpinner}></span> Deleting...
                                </>
                            ) : (
                                'Delete Path' // Or use an Icon
                            )}
                        </button>
                    </div>
                </header>

                {/* Main Content Area (Structure/Card/Completion) */}
                <div className={styles.detailContent}>
                    {currentViewMode === 'structure' && (
                        <div className={styles.structureView}>
                            {learningPathData.courses.map((course, courseIndex) => {
                                const courseItemId = `course-${course.id}`;
                                const isCourseExpanded = !!expandedItems[courseItemId];
                                return (
                                    <LearningPathCourseItem
                                        key={course.id}
                                        course={course}
                                        courseIndex={courseIndex}
                                        isCourseExpanded={isCourseExpanded}
                                        expandedItems={expandedItems}
                                        sectionCardsCache={sectionCardsCache}
                                        isFetchingSection={isFetchingSection}
                                        currentSectionIdForFetch={currentSectionIdForFetch}
                                        selectedCard={selectedCard}
                                        toggleExpand={toggleExpand}
                                        handleCardSelect={handleCardSelect}
                                        taskStatus={taskStatus}
                                        sectionReadyStatus={sectionReadyStatus}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {currentViewMode === 'card' && selectedCard && (
                        <div className={styles.cardDetailView}>
                            <div className={styles.cardContainer}>
                                {/* Card Header */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTags}>
                                        {selectedCard.tags?.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
                                    </div>
                                </div>
                                {/* Card Title */}
                                <h2 className={styles.cardTitle}>{selectedCard.keyword}</h2>
                                {/* Card Content (Question, Answer, Explanation, Resources) */}
                                <div className={styles.cardContent}>
                                    {selectedCard.question && <div className={styles.cardSection}><h3>Question</h3><p>{selectedCard.question}</p></div>}
                                    {selectedCard.answer && <div className={styles.cardSection}><h3>Answer</h3><p>{selectedCard.answer}</p></div>}
                                    {selectedCard.explanation && <div className={styles.cardSection}><h3>Explanation</h3><p>{selectedCard.explanation}</p></div>}
                                    <div className={styles.cardSection}><h3>Resources</h3>{renderResources(selectedCard.resources || {})}</div>
                                </div>
                                {/* Card Navigation */}
                                <div className={styles.cardNavigation}>
                                    <button
                                        className={styles.navButton}
                                        onClick={navigateToPreviousCard}
                                        disabled={getCurrentCardIndex() === -1} // Simplified disable logic
                                    >
                                        ← {getCurrentCardIndex() === 0 ? 'Back to Structure' : 'Previous'}
                                    </button>
                                    <div className={styles.cardCounter}>
                                        {`${getCurrentCardIndex() + 1} / ${selectedCardSectionCards.length}`}
                                    </div>
                                    <button
                                        className={styles.navButton}
                                        onClick={navigateToNextCard}
                                    >
                                        {hasNextCardInSection ? 'Next →' : 'Finish Section →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentViewMode === 'completion' && completionInfo && (
                        <div className={styles.completionView}>
                            <h2>🎉 Congratulations! 🎉</h2>
                            <p>You've completed: <strong>{completionInfo.completedSectionTitle}</strong></p>
                            {completionInfo.nextItem?.type === 'section' && <button onClick={() => handleNavigateNext(completionInfo.nextItem)} className={styles.navButton}>Go to Next Section: {completionInfo.nextItem.title} →</button>}
                            {completionInfo.nextItem?.type === 'course' && <button onClick={() => handleNavigateNext(completionInfo.nextItem)} className={styles.navButton}>Start Next Course: {completionInfo.nextItem.title} →</button>}
                            {completionInfo.nextItem?.type === 'end' && <div><p><strong>You've finished the entire learning path!</strong></p><button onClick={() => handleNavigateNext(completionInfo.nextItem)} className={styles.navButton}>Finish Path</button></div>}
                            <button onClick={navigateToPreviousCard} className={`${styles.navButton} ${styles.secondaryAction}`}>← Back to Last Card</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Fallback if none of the above conditions are met (should ideally not happen)
    return <div className={styles.detailPlaceholder}>Select a path to view details.</div>;

}; 
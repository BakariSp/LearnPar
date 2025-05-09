import React, { JSX, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { useTranslation } from 'react-i18next';

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

    // --- Hooks ---
    const router = useRouter();
    const params = useParams(); // Get params
    // Explicitly check and log the locale derived from params
    const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';
    console.log('[PathDetailView] Locale from params:', locale); // Add this log
    const { t, ready } = useTranslation('common'); // Get the ready state

    // --- handleCardSelect Function ---
    const handleCardSelect = useCallback((card: CardResponse, sectionId: number, sectionCards: CardResponse[], autoSelect: boolean = false) => {
        console.log('[handleCardSelect] Attempting navigation. Locale:', locale, 'Path ID:', selectedPathId); // Add this log
        // Use the selectedPathId prop passed into this component
        if (selectedPathId && locale) { // Check BOTH selectedPathId AND locale
            const targetUrl = `/${locale}/learning-paths/${selectedPathId}?section=${sectionId}&card=${card.id}`;
            console.log('[PathDetailView] Navigating to:', targetUrl);
            router.push(targetUrl);
        } else {
            // Log why navigation failed
            console.warn("Cannot navigate to card view: selectedPathId or locale missing.", { selectedPathId, locale });
        }
    }, [selectedPathId, locale, router]); // Ensure locale and router are dependencies

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

    // Render status badge with improved loading state
    const renderStatusBadge = () => {
        if (isFetchingStatus) {
            return (
                <span className={`${styles.statusBadge} ${styles.statusLoading}`}>
                    <span className={styles.smallSpinner}></span>
                    Checking status...
                </span>
            );
        }
        if (!taskStatus) {
            return learningPathData ? 
                <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>Ready</span> : null;
        }

        let statusText = taskStatus.status.replace('_', ' ').toUpperCase();
        let statusStyle = styles.statusUnknown;

        switch (taskStatus.status) {
            case 'completed':
                statusStyle = styles.statusCompleted;
                break;
            case 'pending':
            case 'queued':
            case 'starting':
            case 'running':
                statusStyle = styles.statusRunning;
                // Add a progress indicator for active tasks
                return (
                    <div>
                        <span className={`${styles.statusBadge} ${statusStyle}`}>
                            <span className={styles.smallSpinner}></span>
                            {statusText}
                        </span>
                        <div className={`${styles.progressBar} ${styles.active}`}></div>
                    </div>
                );
            case 'failed':
            case 'timeout':
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

    // Enhance the section loading state
    const renderSectionLoadingState = (sectionId: number) => {
        const isCurrentlyLoading = isFetchingSection && currentSectionIdForFetch === sectionId;
        const sectionReady = sectionReadyStatus[sectionId];
        
        if (isCurrentlyLoading) {
            return (
                <div className={styles.sectionGenerating}>
                    <span className={styles.smallSpinner}></span>
                    <p>Loading section content...</p>
                </div>
            );
        }
        
        if (!sectionReady && isFetchingStatus && taskStatus && 
            ['pending', 'queued', 'starting', 'running'].includes(taskStatus.status)) {
            return (
                <div className={styles.generatingState}>
                    <span className={styles.smallSpinner}></span>
                    <p>Generating content for this section...</p>
                    <div className={`${styles.progressBar} ${styles.active}`}></div>
                </div>
            );
        }
        
        return null;
    };

    // --- Main Render Logic for Detail Pane ---

    if (!selectedPathId && !isLoadingDetails && !detailError) {
        return (
            <div className={`${styles.detailPlaceholder} ${styles.fadeIn}`}>
                <h2>Select a Learning Path</h2>
                <p>Choose a path from the list on the left to view its details.</p>
            </div>
        );
    }

    if (isLoadingDetails) {
        return (
            <div className={`${styles.detailLoading} ${styles.fadeIn}`}>
                <div className={styles.spinner}></div>
                <p>Loading learning path details...</p>
                {/* Add a progress bar animation for better visual feedback */}
                <div className={`${styles.progressBar} ${styles.active}`}></div>
            </div>
        );
    }

    if (detailError && !isLoadingDetails) {
        return (
            <div className={`${styles.detailError} ${styles.fadeIn}`}>
                <h2>Error Loading Path</h2>
                <p>{detailError}</p>
            </div>
        );
    }

    // Render Detail Content when loaded and no error
    if (selectedPathId && learningPathData && !isLoadingDetails && !detailError) {
        const isDeletingThisPath = deletingPathId === selectedPathId;

        return (
            <div className={`${styles.detailContentContainer} ${styles.fadeIn}`}>
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
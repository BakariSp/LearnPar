'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  apiGetFullLearningPath,
  apiGetLatestTaskForLearningPath,
  apiGetSectionWithCards,
  FullLearningPathResponse,
  TaskStatusResponse,
  CourseResponse,
  SectionResponse,
  CardResponse,
  CardResource
} from '@/services/api'; // Adjust path as needed
import styles from './learning-path-detail.module.css';
// Optional: Import an icon library if you want icons for status
// import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/20/solid';

export default function LearningPathDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null); // State for task status
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false); // Separate loading state for status
  const [currentSectionId, setCurrentSectionId] = useState<number | null>(null); // Add this state
  const [isFetchingSection, setIsFetchingSection] = useState(false); // Add this state
  const [currentSectionCards, setCurrentSectionCards] = useState<CardResponse[]>([]); // Initialize as empty array

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setIsFetchingStatus(false); // Reset status fetching state
      setError(null);
      setLearningPathData(null);
      setTaskStatus(null); // Reset task status
      setSelectedCard(null);
      setExpandedItems({});
      setCurrentSectionId(null);
      setCurrentSectionCards([]);

      try {
        const pathId = parseInt(id, 10);
        if (isNaN(pathId)) {
          throw new Error("Invalid Learning Path ID.");
        }

        // 1. Fetch the FULL learning path structure
        const pathData = await apiGetFullLearningPath(pathId);
        setLearningPathData(pathData);

        // 2. If path data loaded successfully, fetch the latest task status
        if (pathData) {
          setIsFetchingStatus(true);
          try {
            const latestTask = await apiGetLatestTaskForLearningPath(pathId);
            setTaskStatus(latestTask); // Store the latest task status (can be null if none found)
          } catch (taskError: any) {
            // Log status fetch error but don't block the page view
            console.error("Failed to fetch latest task status:", taskError);
            // Optionally set an error message specific to status fetching
            // setError(prev => prev ? `${prev}\nCould not load generation status.` : 'Could not load generation status.');
          } finally {
            setIsFetchingStatus(false);
          }
        }

      } catch (err: any) {
        console.error("Failed to load learning path details:", err);
        setError(err.message || 'Failed to load learning path details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]); // Re-run effect if id changes

  // Add a new effect to fetch section cards when a section is expanded
  useEffect(() => {
    if (!currentSectionId) return;

    const fetchSectionCards = async () => {
      setIsFetchingSection(true);
      try {
        const sectionData = await apiGetSectionWithCards(currentSectionId);
        // Ensure we always set an array, even if cards is undefined
        setCurrentSectionCards(sectionData.cards || []);
      } catch (err: any) {
        console.error(`Failed to fetch cards for section ${currentSectionId}:`, err);
        // Set empty array on error to prevent null reference
        setCurrentSectionCards([]);
      } finally {
        setIsFetchingSection(false);
      }
    };

    fetchSectionCards();
  }, [currentSectionId]);

  // Function to toggle expand/collapse state
  const toggleExpand = (itemId: string, sectionId?: number) => {
    setExpandedItems(prev => {
      const newState = {
        ...prev,
        [itemId]: !prev[itemId]
      };
      
      // If this is a section being expanded, set the current section ID to fetch cards
      if (itemId.startsWith('section-') && sectionId && newState[itemId]) {
        setCurrentSectionId(sectionId);
      }
      
      return newState;
    });
  };

  // Function to handle card selection
  const handleCardSelect = (card: CardResponse) => {
    setSelectedCard(card);
  };

  // Helper to render resources (adjust based on your CardResource structure)
  const renderResources = (resources: Record<string, CardResource> | CardResource[] | {}) => {
    if (!resources || Object.keys(resources).length === 0) {
      return <p>No additional resources provided.</p>;
    }

    // Example: Assuming resources is an object like { "official_doc": { url: "...", title: "..." } }
    if (typeof resources === 'object' && !Array.isArray(resources)) {
      return (
        <ul>
          {Object.entries(resources).map(([key, resource]) => (
            resource.url ? (
              <li key={key}>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {resource.title || key}
                </a>
              </li>
            ) : null
          ))}
        </ul>
      );
    }

    // Example: Assuming resources is an array like [ { url: "...", title: "..." } ]
    if (Array.isArray(resources)) {
       return (
        <ul>
          {resources.map((resource, index) => (
             resource.url ? (
              <li key={index}>
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  {resource.title || `Resource ${index + 1}`}
                </a>
              </li>
            ) : null
          ))}
        </ul>
      );
    }

    return <p>Could not display resources (unknown format).</p>;
  };

  // Helper function to render status indicator
  const renderStatusIndicator = () => {
    if (isFetchingStatus) {
      return <span className={styles.statusLoading}>Checking status...</span>;
    }
    if (!taskStatus) {
      // No task found or failed to fetch - maybe show nothing or a default
      return <span className={styles.statusUnknown}>Status: Unknown</span>;
    }

    let statusText = `Status: ${taskStatus.status}`;
    if (taskStatus.stage) {
      statusText += ` (${taskStatus.stage})`;
    }
    let statusStyle = styles.statusInfo; // Default style

    switch (taskStatus.status) {
      case 'completed':
        statusStyle = styles.statusCompleted;
        // Optional: Add icon
        // statusText = <><CheckCircleIcon className={styles.statusIcon} /> {statusText}</>;
        break;
      case 'running':
      case 'starting':
      case 'pending':
      case 'queued':
        statusStyle = styles.statusRunning;
        // Optional: Add icon
        // statusText = <><ArrowPathIcon className={styles.statusIcon} /> {statusText}</>;
        break;
      case 'failed':
      case 'timeout':
        statusStyle = styles.statusFailed;
        // Optional: Add icon
        // statusText = <><ExclamationTriangleIcon className={styles.statusIcon} /> {statusText}</>;
        if (taskStatus.result_message) {
            statusText += ` - ${taskStatus.result_message}`;
        } else if (taskStatus.error_details) {
             statusText += ` - Check logs for details.`; // Avoid showing raw tracebacks
        }
        break;
      default:
        statusStyle = styles.statusUnknown;
    }

    return <span className={statusStyle}>{statusText}</span>;
  };

  // Function to get the current card index in the section
  const getCurrentCardIndex = () => {
    if (!selectedCard || !currentSectionCards.length) return -1;
    return currentSectionCards.findIndex(card => card.id === selectedCard.id);
  };

  // Function to check if there's a previous card
  const hasPreviousCard = () => {
    const currentIndex = getCurrentCardIndex();
    return currentIndex > 0;
  };

  // Function to check if there's a next card
  const hasNextCard = () => {
    const currentIndex = getCurrentCardIndex();
    return currentIndex < currentSectionCards.length - 1 && currentIndex !== -1;
  };

  // Function to navigate to the previous card
  const navigateToPreviousCard = () => {
    const currentIndex = getCurrentCardIndex();
    if (currentIndex > 0) {
      setSelectedCard(currentSectionCards[currentIndex - 1]);
    }
  };

  // Function to navigate to the next card
  const navigateToNextCard = () => {
    const currentIndex = getCurrentCardIndex();
    if (currentIndex < currentSectionCards.length - 1) {
      setSelectedCard(currentSectionCards[currentIndex + 1]);
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return <div className={styles.loading}>Loading Learning Path...</div>;
  }

  if (error && !learningPathData) { // Only show full page error if path data failed to load
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!learningPathData) {
    // This case might be hit if loading finished but data is still null (e.g., initial state or unexpected issue)
    // Or if the API returned null for a valid ID (though apiGetFullLearningPath throws 404)
    return <div className={styles.notFound}>Learning Path not found or failed to load.</div>;
  }

  // --- Main Render ---
  return (
    <div className={styles.pageLayout}>
      {/* Left Navigation Menu */}
      <nav className={styles.navigationMenu}>
        <h2 className={styles.pathTitleNav}>{learningPathData.title}</h2>
        <p className={styles.pathDescriptionNav}>{learningPathData.description}</p>
        <div className={styles.pathMetaNav}>
          <span>{learningPathData.category}</span>
          <span>{learningPathData.difficulty_level}</span>
          <span>{learningPathData.estimated_days} days</span>
        </div>

        {/* Display Task Status */}
        <div className={styles.statusContainer}>
          {renderStatusIndicator()}
        </div>

        <ul className={styles.courseListNav}>
          {learningPathData.courses.map((course, courseIndex) => (
            <li key={course.id} className={styles.courseItemNav}>
              <button
                onClick={() => toggleExpand(`course-${course.id}`)}
                className={styles.toggleButton}
                aria-expanded={!!expandedItems[`course-${course.id}`]}
              >
                <span className={styles.toggleIcon}>
                  {expandedItems[`course-${course.id}`] ? '▼' : '▶'}
                </span>
                <span className={styles.courseTitleNav}>
                  {courseIndex + 1}. {course.title}
                </span>
              </button>
              {expandedItems[`course-${course.id}`] && (
                <ul className={styles.sectionListNav}>
                  {course.sections.map((section) => (
                    <li key={section.id} className={styles.sectionItemNav}>
                      <button
                        onClick={() => toggleExpand(`section-${section.id}`, section.id)}
                        className={styles.toggleButton}
                        aria-expanded={!!expandedItems[`section-${section.id}`]}
                      >
                        <span className={styles.toggleIcon}>
                          {expandedItems[`section-${section.id}`] ? '▼' : '▶'}
                        </span>
                        <span className={styles.sectionTitleNav}>
                          {section.title}
                        </span>
                      </button>
                      {expandedItems[`section-${section.id}`] && (
                        <ul className={styles.cardListNav}>
                          {currentSectionId === section.id && isFetchingSection ? (
                            <li className={styles.loadingCards}>Loading cards...</li>
                          ) : (
                            currentSectionId === section.id && currentSectionCards && currentSectionCards.length > 0 ? (
                              currentSectionCards.map((card) => (
                                <li key={card.id} className={styles.cardItemNav}>
                                  <button
                                    onClick={() => handleCardSelect(card)}
                                    className={`${styles.cardLinkNav} ${selectedCard?.id === card.id ? styles.selectedCard : ''}`}
                                  >
                                    {card.keyword}
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className={styles.noCards}>No cards available</li>
                            )
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
      </nav>

      {/* Right Content Area */}
      <main className={styles.contentArea}>
        {/* Display general error if path loaded but status fetch failed (optional) */}
        {error && learningPathData && <div className={styles.inlineError}>Note: {error}</div>}

        {selectedCard ? (
          <div className={styles.cardDetailView}>
            <div className={styles.cardContainer}>
              <div className={styles.cardHeader}>
                <div className={styles.cardType}>
                  <span className={styles.cardIcon}>⚡</span>
                  <span>Basic Concept</span>
                </div>
                <div className={styles.cardTags}>
                  {selectedCard.tags && selectedCard.tags.length > 0 && (
                    <span>{selectedCard.tags.join(', ')}</span>
                  )}
                </div>
              </div>
              
              <h2 className={styles.cardTitle}>{selectedCard.keyword}</h2>
              
              <div className={styles.cardContent}>
                {selectedCard.question && (
                  <div className={styles.cardQuestion}>
                    <h3>Question</h3>
                    <p>{selectedCard.question}</p>
                  </div>
                )}
                
                {selectedCard.answer && (
                  <div className={styles.cardAnswer}>
                    <h3>Answer</h3>
                    <p>{selectedCard.answer}</p>
                  </div>
                )}
                
                {selectedCard.explanation && (
                  <div className={styles.cardExplanation}>
                    <h3>Explanation</h3>
                    <p>{selectedCard.explanation}</p>
                  </div>
                )}
                
                <div className={styles.cardResources}>
                  <h3>Resources</h3>
                  {renderResources(selectedCard.resources || {})}
                </div>
              </div>
              
              <div className={styles.cardNavigation}>
                <button 
                  className={styles.navButton} 
                  onClick={navigateToPreviousCard}
                  disabled={!hasPreviousCard()}
                >
                  ← Previous
                </button>
                <div className={styles.cardCounter}>
                  {getCurrentCardIndex() + 1} / {currentSectionCards.length}
                </div>
                <button 
                  className={styles.navButton} 
                  onClick={navigateToNextCard}
                  disabled={!hasNextCard()}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.contentPlaceholder}>
            <h2>Welcome to {learningPathData?.title}</h2>
            <p>Select a card from the learning path menu on the left to view its details.</p>
            {taskStatus && taskStatus.status !== 'completed' && (
              <p className={styles.statusWarning}>
                Note: The generation process reported status '{taskStatus.status}'{taskStatus.stage ? ` (stage: ${taskStatus.stage})` : ''}. The content might be incomplete or reflect an error state.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 
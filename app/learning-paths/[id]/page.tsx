'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  apiGetFullLearningPath,
  FullLearningPathResponse,
  CourseResponse,
  SectionResponse,
  CardResponse,
  CardResource // Make sure CardResource is exported from api.ts
} from '@/services/api'; // Adjust path as needed
import styles from './learning-path-detail.module.css';

export default function LearningPathDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [learningPathData, setLearningPathData] = useState<FullLearningPathResponse | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({}); // Store expanded state for courses/sections
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setLearningPathData(null);
      setSelectedCard(null); // Reset selected card on new path load
      setExpandedItems({}); // Reset expanded items

      try {
        const pathId = parseInt(id, 10);
        if (isNaN(pathId)) {
          throw new Error("Invalid Learning Path ID.");
        }

        // Fetch the FULL learning path structure
        const pathData = await apiGetFullLearningPath(pathId);
        setLearningPathData(pathData);

      } catch (err: any) {
        console.error("Failed to load full learning path details:", err);
        setError(err.message || 'Failed to load learning path details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]); // Re-run effect if id changes

  // Function to toggle expand/collapse state
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
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


  // --- Render Logic ---

  if (isLoading) {
    return <div className={styles.loading}>Loading Learning Path...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!learningPathData) {
    return <div className={styles.notFound}>Learning Path not found.</div>;
  }

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
                        onClick={() => toggleExpand(`section-${section.id}`)}
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
                          {section.cards.map((card) => (
                            <li key={card.id} className={styles.cardItemNav}>
                              <button
                                onClick={() => handleCardSelect(card)}
                                className={`${styles.cardLinkNav} ${selectedCard?.id === card.id ? styles.selectedCard : ''}`}
                              >
                                {card.keyword}
                              </button>
                            </li>
                          ))}
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
        {selectedCard ? (
          <div className={styles.cardDetailView}>
            <h1 className={styles.cardDetailTitle}>{selectedCard.keyword}</h1>
            <div className={styles.cardDetailMeta}>
              <span>Level: {selectedCard.level}</span>
              {selectedCard.tags.length > 0 && (
                <span>Tags: {selectedCard.tags.join(', ')}</span>
              )}
            </div>
            <div className={styles.cardDetailExplanation}>
              <h3>Explanation</h3>
              {/* Render explanation - potentially needs markdown parsing if it contains markdown */}
              <p>{selectedCard.explanation}</p>
            </div>
            <div className={styles.cardDetailResources}>
              <h3>Resources</h3>
              {renderResources(selectedCard.resources)}
            </div>
             <div className={styles.cardDetailTimestamps}>
                <small>Created: {new Date(selectedCard.created_at).toLocaleString()}</small>
                <small>Updated: {new Date(selectedCard.updated_at).toLocaleString()}</small>
            </div>
          </div>
        ) : (
          <div className={styles.contentPlaceholder}>
            <h2>Welcome to {learningPathData.title}</h2>
            <p>Select a card from the learning path menu on the left to view its details.</p>
          </div>
        )}
      </main>
    </div>
  );
} 
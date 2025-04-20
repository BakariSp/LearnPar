'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AiDialog } from '../../components/AiChat/AiDialog';
import { CourseCard } from '../../components/Course/CourseCard';
import { KeywordCard } from '../../components/Course/KeywordCard';
import { LearningPathCard } from '../../components/Course/LearningPathCard';
import styles from './landing-page.module.css';

// Define interfaces for the API response data
interface Resource {
  url: string;
  title: string;
}

interface Card {
  id: number;
  keyword: string;
  explanation: string;
  resources: Resource[];
  level: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  sections: any[];
  created_at: string;
  updated_at: string;
}

interface LearningPath {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_days: number;
  courses: any[];
  created_at: string;
  updated_at: string;
}

// Export the response type for the server component
export interface RecommendationsResponse {
  learning_paths: LearningPath[];
  courses: Course[];
  cards: Card[];
}

// Define props for the component
interface ZeroLandingPageProps {
  initialRecommendations: RecommendationsResponse | null;
}

export default function ZeroLandingPage({ initialRecommendations }: ZeroLandingPageProps) {
  const [query, setQuery] = useState('');
  // Use the initial data passed via props
  // Determine initial loading/error state based on the prop
  const [recommendations] = useState<RecommendationsResponse | null>(initialRecommendations);
  const [isLoading] = useState<boolean>(!initialRecommendations); // Loading if prop is null initially
  const [error] = useState<string | null>(
    initialRecommendations === null ? 'Failed to load recommendations. Please try again later.' : null
  );
  const router = useRouter();

  // Map API cards to KeywordCard format (Add the safety check from fix #1)
  const keywordCards = recommendations?.cards.map(card => ({
    id: card.id,
    title: card.keyword,
    description: card.explanation,
    keywords: card.tags || [], // Ensure keywords is always an array
    icon: getIconForTag(card.tags && card.tags.length > 0 ? card.tags[0] : '') // Safe access
  })) || [];

  // Map API courses to CourseCard format
  const courseCards = recommendations?.courses.map(course => ({
    id: course.id,
    title: course.title,
    subtitle: course.description,
    progress: 0 // New courses start at 0% progress
  })) || [];

  // Map API learning paths to LearningPathCard format
  const learningPathCards = recommendations?.learning_paths.map(path => ({
    id: path.id,
    title: path.title,
    description: path.description,
    category: path.category,
    difficulty: path.difficulty_level,
    days: path.estimated_days
  })) || [];

  // Helper function to assign icons based on tags
  function getIconForTag(tag: string): string {
    const iconMap: {[key: string]: string} = {
      'memory': '🧠',
      'essential': '⭐',
      'theoretical': '📚',
      'cognitive science': '🔬',
      'Balanced Diet': '🥗',
      'Regular Exercise': '🏃‍♂️',
      'Mental Wellness': '🧘‍♀️'
    };
    
    return iconMap[tag] || '📝'; // Default icon if no match
  }

  // Function to handle query submission from AiDialog
  const handleQuerySubmit = (submittedQuery: string) => {
    // Navigate to the chat page with the query as a parameter
    router.push(`/chat?prompt=${encodeURIComponent(submittedQuery)}`);
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <section className={styles.aiSection}>
          <h1 className={styles.heading}>What would you like to learn today?</h1>
          <AiDialog query={query} setQuery={setQuery} onQuerySubmit={handleQuerySubmit} />
        </section>
        
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading recommendations...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {learningPathCards.length > 0 && (
              <section className={styles.learningPathsSection}>
                <h2 className={styles.sectionTitle}>Recommended Learning Paths</h2>
                <div className={styles.learningPathGrid}>
                  {learningPathCards.map(path => (
                    <LearningPathCard key={path.id} path={path} />
                  ))}
                </div>
              </section>
            )}
            
            {courseCards.length > 0 && (
              <section className={styles.coursesSection}>
                <h2 className={styles.sectionTitle}>Recommended Courses</h2>
                <div className={styles.courseGrid}>
                  {courseCards.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}
            
            {keywordCards.length > 0 && (
              <section className={styles.keywordsSection}>
                <h2 className={styles.sectionTitle}>Light Learn</h2>
                <div className={styles.keywordGrid}>
                  {keywordCards.map(card => (
                    <KeywordCard key={card.id} card={card} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
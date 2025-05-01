'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AiDialog } from '../../../components/AiChat/AiDialog';
import { LearningPathCard } from '../../../components/Course/LearningPathCard';
import styles from './home.module.css';

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

// Export the response type for use in other components
export interface RecommendationsResponse {
  learning_paths: LearningPath[];
  courses: Course[];
  cards: Card[];
}

// Define props for the client component
export interface ZeroLandingPageProps {
  initialRecommendations?: RecommendationsResponse | null;
}

// Main client component
export function ZeroLandingPageContent(props: ZeroLandingPageProps) {
  const { initialRecommendations } = props;
  const { t } = useTranslation('common');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(initialRecommendations || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialRecommendations);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Add client-side data fetching
  useEffect(() => {
    // Skip fetching if we already have initialRecommendations
    if (initialRecommendations) return;
    
    async function fetchRecommendations() {
      try {
        const response = await fetch('/api/recommendations');
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [initialRecommendations]);

  const learningPathCards = recommendations?.learning_paths.map((path: LearningPath) => ({
    id: path.id,
    title: path.title,
    description: path.description,
    category: path.category,
    difficulty: path.difficulty_level,
    days: path.estimated_days
  })) || [];

  // If no real data, use mock data for demo purposes
  const mockLearningPaths = [
    {
      id: 1,
      title: 'Understanding of Artificial Intelligence',
      description: 'Foundations of Artificial Intelligence.',
      category: 'AI',
      difficulty: 'Intermediate',
      days: 8
    },
    {
      id: 2,
      title: 'Understanding of Artificial Intelligence',
      description: 'Foundations of Artificial Intelligence.',
      category: 'AI',
      difficulty: 'Beginner',
      days: 8
    },
    {
      id: 3,
      title: 'Understanding of Artificial Intelligence',
      description: 'Foundations of Artificial Intelligence.',
      category: 'AI',
      difficulty: 'Advanced',
      days: 8
    }
  ];

  const displayPaths = learningPathCards.length > 0 ? learningPathCards : mockLearningPaths;

  const handleQuerySubmit = (submittedQuery: string) => {
    if (!locale) {
      return;
    }
    router.push(`/${locale}/chat?prompt=${encodeURIComponent(submittedQuery)}`);
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
            <p>{t('landing.loading_recommendations')}</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        ) : (
          <section className={styles.learningPathsSection}>
            <h2 className={styles.sectionTitle}>Recommended Learning Paths</h2>
            <div className={styles.learningPathGrid}>
              {displayPaths.map((path) => (
                <LearningPathCard key={path.id} path={path} locale={locale ?? 'en'} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
} 
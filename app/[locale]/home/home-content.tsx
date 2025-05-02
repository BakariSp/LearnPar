'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AiDialog } from '../../../components/AiChat/AiDialog';
import { LearningPathCard } from '../../../components/Course/LearningPathCard';
import styles from './home.module.css';
import { apiGetRecommendationsByInterests, RecommendationsByInterestsResponse } from '../../../services/api';
import { getUserProfile } from '../../../services/user';

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
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) : 'en';
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(initialRecommendations || null);
  const [interestRecommendations, setInterestRecommendations] = useState<RecommendationsByInterestsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string>("string");
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
  // Add state to track if there are no more recommendations to load
  const [noMoreRecommendations, setNoMoreRecommendations] = useState<boolean>(false);
  // Add state to track if load more button is clicked to prevent rapid multiple clicks
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const router = useRouter();

  // Fetch user's interests and get recommendations - only run once for initial data
  useEffect(() => {
    // Skip if we've already loaded initial data
    if (initialDataLoaded) return;
    
    // Track if the component is mounted
    let isMounted = true;
    
    async function fetchUserAndRecommendations() {
      try {
        // First get the user profile to determine interests
        const user = await getUserProfile();
        
        // Check if component is still mounted before updating state
        if (!isMounted) return;
        
        if (user && user.interests && user.interests.length > 0) {
          // Fetch recommendations based on user interests
          const interestRecs = await apiGetRecommendationsByInterests(
            user.interests,
            5, // Limit to 5 learning paths
            [],  // No exclusions by default
            refreshToken
          );
          
          // Check if component is still mounted before updating state
          if (!isMounted) return;
          
          if (interestRecs) {
            setInterestRecommendations(interestRecs);
            // Save the refresh token for pagination/future requests
            // This won't trigger the useEffect again due to our initialDataLoaded flag
            setRefreshToken(interestRecs.refresh_token);
          }
        } else {
          // Fallback to generic recommendations if no interests
          const response = await fetch('/api/recommendations');
          
          // Check if component is still mounted before updating state
          if (!isMounted) return;
          
          if (response.ok) {
            const data = await response.json();
            setRecommendations(data);
          }
        }
        
        // Mark initial data as loaded so we don't fetch again
        if (isMounted) {
          setInitialDataLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        // Only update state if component is still mounted
        if (isMounted) {
          setError('Failed to load recommendations. Please try again later.');
          setInitialDataLoaded(true); // Still mark as loaded even on error
          setIsLoading(false);
        }
      }
    }

    fetchUserAndRecommendations();
    
    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [initialDataLoaded]); // Only depend on initialDataLoaded flag, not refreshToken

  // Convert interest-based recommendations to the format needed by LearningPathCard
  const interestBasedPaths = interestRecommendations?.learning_paths.map((path) => ({
    id: path.id,
    title: path.title,
    description: path.description,
    category: path.category,
    difficulty: path.difficulty_level,
    days: path.estimated_days,
    // Add metadata if available
    metadata: interestRecommendations.metadata[path.id.toString()]
  })) || [];

  // Standard recommendations from initialRecommendations
  const standardPathCards = recommendations?.learning_paths.map((path: LearningPath) => ({
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

  // Prioritize interest-based recommendations, then fall back to standard or mock data
  const displayPaths = interestBasedPaths.length > 0 
    ? interestBasedPaths 
    : standardPathCards.length > 0 
      ? standardPathCards 
      : mockLearningPaths;

  const handleQuerySubmit = (submittedQuery: string) => {
    if (!locale) {
      return;
    }
    router.push(`/${locale}/chat?prompt=${encodeURIComponent(submittedQuery)}`);
  };

  // Function to load more recommendations
  const handleLoadMore = async () => {
    if (!interestRecommendations || !refreshToken || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      
      // Get user interests from the current recommendations
      const interests = Object.values(interestRecommendations.metadata)
        .map(meta => meta.interest_id)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
      
      // Get IDs of current paths to exclude from next batch
      const excludePaths = interestRecommendations.learning_paths.map(path => path.id);
      
      // Fetch next batch of recommendations
      const nextBatch = await apiGetRecommendationsByInterests(
        interests,
        5, // Get 5 more
        excludePaths,
        refreshToken
      );
      
      if (nextBatch && nextBatch.learning_paths.length > 0) {
        // Merge the new recommendations with existing ones
        setInterestRecommendations({
          learning_paths: [...interestRecommendations.learning_paths, ...nextBatch.learning_paths],
          metadata: { ...interestRecommendations.metadata, ...nextBatch.metadata },
          refresh_token: nextBatch.refresh_token
        });
        
        // Update the refresh token for future requests without triggering useEffect
        setRefreshToken(nextBatch.refresh_token);
      } else {
        // No more recommendations to load
        setNoMoreRecommendations(true);
      }
    } catch (error) {
      console.error('Error loading more recommendations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <section className={styles.aiSection}>
          <h1 className={styles.heading}>What would you like to learn today?</h1>
          <AiDialog query={query} setQuery={setQuery} onQuerySubmit={handleQuerySubmit} />
        </section>

        {isLoading && displayPaths.length === 0 ? (
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
            
            {interestRecommendations && interestRecommendations.learning_paths.length > 0 && (
              <div className={styles.loadMoreContainer}>
                {noMoreRecommendations ? (
                  <p className={styles.noMoreMessage}>No more recommendations available</p>
                ) : (
                  <button 
                    className={styles.loadMoreButton} 
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Recommendations'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
} 
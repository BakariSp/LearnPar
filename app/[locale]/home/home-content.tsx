'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AiDialog from '../../../components/AiChat/AiDialog';
import { LearningPathCard } from '../../../components/Course/LearningPathCard';
import styles from './home.module.css';
import { apiGetRecommendationsByInterests, RecommendationsByInterestsResponse } from '../../../services/api';
import { getUserProfile } from '../../../services/user';
import axios from 'axios'; 
import { useAuth } from '@/context/AuthContext'; 
// Define interfaces for the API response datas
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
  const [isPageEntering, setIsPageEntering] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string>("string");
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
  // Add state to track if there are no more recommendations to load
  const [noMoreRecommendations, setNoMoreRecommendations] = useState<boolean>(false);
  // Add state to track if load more button is clicked to prevent rapid multiple clicks
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Helper function for fallback to standard recommendations
  const fallbackToStandardRecs = async () => {
    console.log('Falling back to standard recommendations');
    // Fall back to using the props-provided recommendations or API
    if (props.initialRecommendations) {
      setRecommendations(props.initialRecommendations);
    } else {
      try {
        const response = await fetch('/api/recommendations');
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data);
        }
      } catch (e) {
        console.error('Error fetching standard recommendations:', e);
        setError('Failed to load recommendations. Please try again later.');
      }
    }
  };

  // Page entrance animation effect
  useEffect(() => {
    // Simulate loading effect for better UX
    const timer = setTimeout(() => {
      setIsPageEntering(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Main useEffect for fetching user data and recommendations
  useEffect(() => {
    let isMounted = true;
    
    // Function to fetch user data and recommendations
    async function fetchUserAndRecommendations() {
      // Only proceed if authenticated and data not already loaded
      if (!isAuthenticated || initialDataLoaded) {
        console.log('Skipping fetch - auth:', isAuthenticated, 'loaded:', initialDataLoaded);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching user profile and recommendations...');
        
        // Get user profile first to check interests
        const userData = await getUserProfile();
        
        if (!isMounted) return; // Stop if component unmounted
        
        // Check if user has interests and they are not empty
        if (userData?.interests && Array.isArray(userData.interests) && userData.interests.length > 0) {
          console.log('User has interests:', userData.interests.length, 'interests found');
          
          try {
            // Convert userData.interests to an array of interest IDs 
            const interestIds = userData.interests.map((interest: any) => 
              typeof interest === 'object' ? interest.id : interest
            );

            console.log('Interest IDs being sent to API:', interestIds);

            // Only call API if we have valid interest IDs
            if (interestIds.length > 0) {
              const interestRecsData = await apiGetRecommendationsByInterests(
                interestIds,
                5, // Limit to 5 learning paths
                [], // No exclusions by default
                refreshToken
              );
              
              if (!isMounted) return; // Stop if component unmounted

              if (interestRecsData && interestRecsData.learning_paths && interestRecsData.learning_paths.length > 0) {
                console.log('Successfully fetched interest-based recommendations:', interestRecsData.learning_paths.length, 'paths');
                setInterestRecommendations(interestRecsData);
                setRefreshToken(interestRecsData.refresh_token);
              } else {
                console.log('No interest-based recommendations returned, falling back to standard');
                await fallbackToStandardRecs();
              }
            } else {
              console.log('No valid interest IDs found, falling back to standard recommendations');
              await fallbackToStandardRecs();
            }
          } catch (error) {
            console.error('Error fetching interest-based recommendations:', error);
            // If there's an authentication error, don't keep retrying
            if (error instanceof Error && error.message.includes('401')) {
              console.log('Authentication error detected, falling back to standard recommendations');
            }
            await fallbackToStandardRecs();
          }
        } else {
          // No interests or empty interests, fall back to standard recommendations
          console.log('User has no interests, falling back to standard recommendations');
          await fallbackToStandardRecs();
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        await fallbackToStandardRecs();
      } finally {
        if (isMounted) {
          setInitialDataLoaded(true);
          setIsLoading(false);
        }
      }
    }

    fetchUserAndRecommendations();
    
    // Cleanup function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, initialDataLoaded]); // Remove refreshToken and props.initialRecommendations from dependencies

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
      title: locale === 'zh' ? '人工智能基础认知' : 'Understanding of Artificial Intelligence',
      description: locale === 'zh' ? '人工智能的基础知识。' : 'Foundations of Artificial Intelligence.',
      category: locale === 'zh' ? '人工智能' : 'AI',
      difficulty: 'intermediate',
      days: 8
    },
    {
      id: 2,
      title: locale === 'zh' ? '人工智能基础认知' : 'Understanding of Artificial Intelligence',
      description: locale === 'zh' ? '人工智能的基础知识。' : 'Foundations of Artificial Intelligence.',
      category: locale === 'zh' ? '人工智能' : 'AI',
      difficulty: 'beginner',
      days: 8
    },
    {
      id: 3,
      title: locale === 'zh' ? '人工智能基础认知' : 'Understanding of Artificial Intelligence',
      description: locale === 'zh' ? '人工智能的基础知识。' : 'Foundations of Artificial Intelligence.',
      category: locale === 'zh' ? '人工智能' : 'AI',
      difficulty: 'advanced',
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
    
    // Set navigating state to trigger transition animation
    setIsNavigating(true);
    
    // Delay the navigation slightly to allow animation to start
    setTimeout(() => {
      router.push(`/${locale}/chat?prompt=${encodeURIComponent(submittedQuery)}`);
    }, 300);
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
      
      console.log('Load more - Interest IDs being sent to API:', interests);
      
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
        
        // Update the refresh token for future requests
        setRefreshToken(nextBatch.refresh_token);
      } else {
        // No more recommendations to load
        console.log('No more recommendations available');
        setNoMoreRecommendations(true);
      }
      
      // Reset loading state
      setIsLoadingMore(false);
    } catch (error) {
      console.error('Error loading more recommendations:', error);
      setIsLoadingMore(false);
      setError('Failed to load more recommendations. Please try again.');
    }
  };

  // Main content render with loading and animations
  if (isPageEntering || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Show error message if there was a problem
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{t('home.error_loading_recommendations')}</p>
      </div>
    );
  }

  // Main content with fade-in animation
  return (
    <div className={`${styles.container} ${isNavigating ? styles.fadeOut : styles.fadeIn}`}>
      <div className={styles.content}>
        <div className={styles.aiSection}>
          <h2 className={styles.heading}>{t('home.prompt_heading')}</h2>
          <AiDialog
            query={query}
            setQuery={setQuery}
            onQuerySubmit={handleQuerySubmit}
          />
        </div>
        
        {displayPaths && displayPaths.length > 0 && (
          <div className={styles.learningPathsSection}>
            <h3 className={styles.sectionTitle}>{t('home.recommended_learning_paths')}</h3>
            <div className={styles.learningPathGrid}>
              {displayPaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  locale={locale ?? 'en'}
                />
              ))}
            </div>
            
            {/* Load more button */}
            {!noMoreRecommendations && interestRecommendations && (
              <div className={styles.loadMoreContainer}>
                <button 
                  className={styles.loadMoreButton}
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? t('common.loading') : t('home.load_more')}
                </button>
              </div>
            )}
            
            {/* No more recommendations message */}
            {noMoreRecommendations && (
              <div className={styles.noMoreMessage}>
                {t('home.no_more_recommendations')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
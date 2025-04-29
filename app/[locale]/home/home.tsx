'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // ✅ 加 useParams
import { useTranslation } from 'react-i18next'; // ✅ 加 i18n
import { AiDialog } from '../../../components/AiChat/AiDialog';
import { KeywordCard } from '../../../components/Course/KeywordCard';
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
  const { t } = useTranslation('common'); // ✅ 加 i18n
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale; // ✅ locale
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (initialRecommendations) {
      setRecommendations(initialRecommendations);
      setIsLoading(false);
      setError(null);
    } else {
      setIsLoading(true);
    }
  }, [initialRecommendations]);

  const keywordCards = recommendations?.cards.map(card => ({
    id: card.id,
    title: card.keyword,
    description: card.explanation,
    keywords: card.tags || [],
    icon: getIconForTag(card.tags && card.tags.length > 0 ? card.tags[0] : '')
  })) || [];

  const courseCards = recommendations?.courses.map(course => ({
    id: course.id,
    title: course.title,
    subtitle: course.description,
    progress: 0
  })) || [];

  const learningPathCards = recommendations?.learning_paths.map(path => ({
    id: path.id,
    title: path.title,
    description: path.description,
    category: path.category,
    difficulty: path.difficulty_level,
    days: path.estimated_days
  })) || [];

  function getIconForTag(tag: string): string {
    const iconMap: { [key: string]: string } = {
      'memory': '🧠',
      'essential': '⭐',
      'theoretical': '📚',
      'cognitive science': '🔬',
      'Balanced Diet': '🥗',
      'Regular Exercise': '🏃‍♂️',
      'Mental Wellness': '🧘‍♀️'
    };
    return iconMap[tag] || '📝';
  }

  const handleQuerySubmit = (submittedQuery: string) => {
    router.push(`/${locale}/chat?prompt=${encodeURIComponent(submittedQuery)}`); // ✅ router加locale
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <section className={styles.aiSection}>
          <h1 className={styles.heading}>{t('landing.learn_today')}</h1> {/* ✅ 翻译 */}
          <AiDialog query={query} setQuery={setQuery} onQuerySubmit={handleQuerySubmit} />
        </section>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>{t('landing.loading_recommendations')}</p> {/* ✅ 翻译 */}
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {learningPathCards.length > 0 && (
              <section className={styles.learningPathsSection}>
                <h2 className={styles.sectionTitle}>{t('landing.recommended_paths')}</h2> {/* ✅ 翻译 */}
                <div className={styles.learningPathGrid}>
                  {learningPathCards.map(path => (
                    <LearningPathCard key={path.id} path={path} />
                  ))}
                </div>
              </section>
            )}

            {keywordCards.length > 0 && (
              <section className={styles.keywordsSection}>
                <h2 className={styles.sectionTitle}>{t('landing.light_learn')}</h2> {/* ✅ 翻译 */}
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

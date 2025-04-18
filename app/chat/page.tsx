'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import styles from './chat.module.css';

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppending, setIsAppending] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [learningCourses, setLearningCourses] = useState<string[]>([]);
  const [courseData, setCourseData] = useState<any>(null);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  const generateCourses = async (append: boolean = false) => {
    try {
      const payload = {
        interests: [prompt],
        difficulty_level: 'beginner',
        estimated_days: 30,
        existing_items: [],
      };
  
      // 1️⃣ 第一阶段：立即获取 title
      const res1 = await axios.post('/api/generate-course-titles', payload);
      const titles = res1.data.titles || [];
  
      if (append) {
        setLearningCourses(prev => [...prev, ...titles]);
      } else {
        setLearningCourses(titles);
        setCourseData(null); // 清空 section
      }
  
      setIsLoading(false);
      setIsAppending(false);
  
      // 2️⃣ 第二阶段：不等，异步调用生成 section
      axios.post('/api/generate-sections', {
        titles,
        difficulty_level: 'beginner',
        estimated_days: 30,
      }).then(res2 => {
        const newCourses = res2.data.courses || [];
  
        if (append) {
          setCourseData((prev: any) => {
            const prevCourses = prev?.courses || [];
            return { courses: [...prevCourses, ...newCourses] };
          });
        } else {
          setCourseData({ courses: newCourses });
        }
      });
    } catch (err: any) {
      console.error('Course generation failed:', err);
      setError(err.message || 'An error occurred while generating courses.');
      setIsLoading(false);
      setIsAppending(false);
    }
  };
  
  

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!prompt.trim()) {
    setError('Please enter what you want to learn.');
    return;
  }

  setIsLoading(true);
  setError(null);
  setLearningCourses([]);
  setCourseData(null);

  generateCourses(false);
  };

  const handleGenerateMore = async () => {
    if (!prompt.trim()) return;
    setIsAppending(true);
    await generateCourses(true);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setLearningCourses(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleNextStep = async () => {
    if (!learningCourses.length) return;
    setIsFetchingNext(true);
    try {
      const payload = {
        titles: learningCourses,
        difficulty_level: 'beginner',
        estimated_days: 30,
        
      };
      const res = await axios.post('/api/generate-details-from-outline', payload);
      setCourseData(res.data);
    } catch (err: any) {
      console.error('Detail generation failed:', err);
      setError(err.message || 'An error occurred while generating course details.');
    } finally {
      setIsFetchingNext(false);
    }
  };

  return (
    <main className={styles.chatContainer}>
      <h1 className={styles.title}>Create Your Courses</h1>
      <p className={styles.subtitle}>Tell us what you want to learn, and we'll generate a high-level set of learning courses to get you started.</p>

      <form onSubmit={handleSubmit} className={styles.chatForm}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'I want to learn about web development'"
          className={styles.input}
          disabled={isLoading || isAppending}
          aria-label="Learning prompt"
        />
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || isAppending} // ✅ 不受 isFetchingNext 影响
        >
          {isLoading ? 'Generating...' : 'Generate Courses'}
        </button>

      </form>

      {isLoading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>Generating Courses...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className={styles.errorBox}>
          <p>Error: {error}</p>
        </div>
      )}

      {learningCourses.length > 0 && (
        <div className={styles.resultContainer}>
          <h3 className={styles.resultTitle}>Generated Courses:</h3>
          <ul className={styles.resultList}>
            {learningCourses.map((item, index) => (
              <li key={index} className={styles.resultItemBox}>
                <div className={styles.courseRow}>
                  <span className={styles.resultIndex}>{index + 1}.</span>
                  <span className={styles.resultItemText}>{item}</span>
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveItem(index)}
                  >
                    ✕
                  </button>
                </div>
                {courseData?.courses?.[index]?.sections?.length > 0 ? (
                  <ul className={styles.sectionList}>
                    {courseData.courses[index].sections.map((s: any, j: number) => (
                      <li key={j} className={styles.sectionItem}>{s.title}</li>
                    ))}
                  </ul>
                ) : isFetchingNext && (
                  <p style={{ paddingLeft: '2rem', color: '#999' }}>Loading sections...</p>
                )}

              </li>
            ))}
          </ul>

          <div className={styles.bottomButtons}>
            <button
              className={styles.secondaryButton}
              onClick={handleGenerateMore}
              disabled={isAppending || isLoading} // ✅ 不受 isFetchingNext 影响
            >
              {isAppending ? <span className={styles.smallSpinner}></span> : 'Generate More Courses'}
            </button>

            <button className={styles.primaryButton} onClick={handleNextStep} disabled={isFetchingNext}>
              {isFetchingNext ? <span className={styles.smallSpinner}></span> : 'Next Step'}
            </button>


          </div>
        </div>
      )}
    </main>
  );
}
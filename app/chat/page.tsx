'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import styles from './chat.module.css';
import formStyles from '../../components/Shared/InputForm.module.css';
import { EditableLearningPath, Course as EditableCourse, Section as EditableSection } from '../../components/Course/EditableLearningPath';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  apiGenerateLearningPathFromChat,
  apiGetTaskStatus,
  TaskStatusResponse,
  FullLearningPathResponse,
  apiGetFullLearningPath
} from '@/services/api';

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learningCourses, setLearningCourses] = useState<string[]>([]);
  const [courseData, setCourseData] = useState<any>(null);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [editableCourses, setEditableCourses] = useState<EditableCourse[]>([]);
  const [pathTitle, setPathTitle] = useState<string>('Generated Learning Path');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [finalPathData, setFinalPathData] = useState<FullLearningPathResponse | null>(null);
  const [generatingSectionCourseIds, setGeneratingSectionCourseIds] = useState<Set<string | number>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Intermediate');

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPromptChecked = useRef(false);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialPromptChecked.current) {
      const queryPrompt = searchParams.get('prompt');

      if (queryPrompt) {
        initialPromptChecked.current = true;

        const decodedPrompt = decodeURIComponent(queryPrompt);
        setPrompt(decodedPrompt);

        setIsLoading(true);
        setError(null);
        setLearningCourses([]);
        setCourseData(null);
        setEditableCourses([]);
        setPathTitle(`Path for: ${decodedPrompt}`);
        setGeneratingSectionCourseIds(new Set());

        generateCourses(false);

        router.replace('/chat', undefined);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    const combined = learningCourses.map((title, index) => {
      const sectionsData = courseData?.courses?.[index]?.sections || [];
      return {
        id: `course-${index}-${title.replace(/\s+/g, '-')}`,
        title: title,
        sections: sectionsData.map((s: any, sIndex: number) => ({
          id: `section-${index}-${sIndex}-${s.title.replace(/\s+/g, '-')}`,
          title: s.title,
        })),
      };
    });
    setEditableCourses(combined);
  }, [learningCourses, courseData]);

  const generateCourses = async (append: boolean = false) => {
    const currentPrompt = prompt || searchParams.get('prompt');
    if (!currentPrompt) {
        setError("Cannot generate courses without a prompt.");
        setIsLoading(false);
        setIsAppending(false);
        return;
    }

    const startIndex = append ? learningCourses.length : 0;

    try {
      const payload = {
        interests: [currentPrompt],
        difficulty_level: 'beginner',
        estimated_days: 30,
        existing_items: append ? learningCourses : [],
      };
  
      const res1 = await axios.post('/api/generate-course-titles', payload);
      const newTitles = res1.data.titles || [];
  
      if (newTitles.length === 0) {
          setIsLoading(false);
          setIsAppending(false);
          return;
      }
  
      const newCourseIds = newTitles.map((title: string, index: number) =>
        `course-${startIndex + index}-${title.replace(/\s+/g, '-')}`
      );
      setGeneratingSectionCourseIds(prev => new Set([...prev, ...newCourseIds]));
  
      if (append) {
        setLearningCourses(prev => [...prev, ...newTitles]);
      } else {
        setLearningCourses(newTitles);
        setCourseData(null);
      }
  
      setIsLoading(false);
      setIsAppending(false);
  
      axios.post('/api/generate-sections', {
        titles: newTitles,
        difficulty_level: 'beginner',
        estimated_days: 30,
      }).then(res2 => {
        const newSectionData = res2.data.courses || [];
  
        setCourseData((prev: any) => {
          const prevCourses = prev?.courses || [];
          const updatedSectionData = newTitles.map((title: string) => {
              const found = newSectionData.find((c: any) => c.title === title);
              return found || { title: title, sections: [] };
          });
          return { courses: append ? [...prevCourses, ...updatedSectionData] : updatedSectionData };
        });
  
        setGeneratingSectionCourseIds(prev => {
            const updatedSet = new Set(prev);
            newCourseIds.forEach(id => updatedSet.delete(id));
            return updatedSet;
        });
  
      }).catch(sectionErr => {
          console.error('Section generation failed:', sectionErr);
          setGeneratingSectionCourseIds(prev => {
              const updatedSet = new Set(prev);
              newCourseIds.forEach(id => updatedSet.delete(id));
              return updatedSet;
          });
      });
  
    } catch (err: any) {
      console.error('Course generation failed:', err);
      setError(err.message || 'An error occurred while generating courses.');
      setIsLoading(false);
      setIsAppending(false);
      setGeneratingSectionCourseIds(new Set());
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
  setEditableCourses([]);
  setPathTitle(`Path for: ${prompt}`);
  setGeneratingSectionCourseIds(new Set());

  generateCourses(false);
  };

  const handleGenerateMore = async () => {
    if (!prompt.trim()) return;
    setIsAppending(true);
    setError(null);
    await generateCourses(true);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setLearningCourses(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDeleteCourse = (courseId: string | number) => {
    setEditableCourses(prev => {
        const updatedCourses = prev.filter(course => course.id !== courseId);
        setLearningCourses(updatedCourses.map(c => c.title));
        setCourseData((prevData: any) => {
            if (!prevData || !prevData.courses) return null;
            const currentTitles = updatedCourses.map(c => c.title);
            const updatedCourseDetails = prevData.courses.filter((cd: any) => currentTitles.includes(cd.title));
            return { courses: updatedCourseDetails };
        });
        setGeneratingSectionCourseIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(courseId);
            return newSet;
        });
        return updatedCourses;
    });
  };

  const handleReorderCourses = (reordered: EditableCourse[]) => {
    setEditableCourses(reordered);
    const newTitles = reordered.map(c => c.title);
    setLearningCourses(newTitles);
    setCourseData((prevData: any) => {
        if (!prevData || !prevData.courses) return null;
        const orderedCourseDetails = newTitles.map(title =>
            prevData.courses.find((cd: any) => cd.title === title)
        ).filter(Boolean);
        return { courses: orderedCourseDetails };
    });
  };

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
  };

  const handleNextStep = async () => {
    if (!editableCourses.length || !prompt.trim()) {
      setError("Cannot generate path without a prompt and defined courses.");
      return;
    }
    setIsFetchingNext(true);
    setError(null);
    setTaskId(null);
    setTaskStatus(null);
    setFinalPathData(null);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    try {
      const payload = {
        prompt: prompt,
        title: pathTitle,
        courses: editableCourses.map(course => ({
          id: course.id,
          title: course.title,
          sections: course.sections.map((section: EditableSection) => ({
             id: section.id,
             title: section.title
          })),
        })),
        difficulty_level: selectedDifficulty.toLowerCase(),
      };
      console.log("Payload for generating full path:", payload);

      const response = await apiGenerateLearningPathFromChat(payload);
      setTaskId(response.task_id);
      startPolling(response.task_id);

    } catch (err: any) {
      console.error('Full path generation initiation failed:', err);
      let errorMessage = 'An error occurred while starting the full path generation.';
      if (err.message) {
          errorMessage = err.message;
      } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
      setIsFetchingNext(false);
    }
  };

  const pollStatus = async (currentTaskId: string) => {
    try {
      const statusResponse = await apiGetTaskStatus(currentTaskId);
      setTaskStatus(statusResponse);

      if (statusResponse.status === 'completed') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        if (statusResponse.learning_path_id) {
          setIsFetchingNext(false);
          router.push(`/learning-paths/${statusResponse.learning_path_id}`);
        } else {
           setError("Generation completed but no Learning Path ID was found.");
           setIsFetchingNext(false);
        }
      } else if (statusResponse.status === 'failed' || statusResponse.status === 'timeout') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setError(statusResponse.errors?.join(', ') || `Generation ${statusResponse.status}.`);
        setIsFetchingNext(false);
      }

    } catch (error: any) {
      console.error("Error polling task status:", error);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setError("Error checking generation status. Please try again later.");
      setIsFetchingNext(false);
    }
  };

  const startPolling = (currentTaskId: string) => {
    pollStatus(currentTaskId);
    const intervalId = setInterval(() => {
      pollStatus(currentTaskId);
    }, 5000);
    pollingIntervalRef.current = intervalId;
  };

  return (
    <main className={styles.chatContainer}>
      <h1 className={styles.title}>Create Your Courses</h1>
      <p className={styles.subtitle}>Tell us what you want to learn, and we'll generate a high-level set of learning courses. You can reorder or remove them before proceeding.</p>

      <form onSubmit={handleSubmit} className={formStyles.inputForm}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'I want to learn about web development'"
          className={formStyles.input}
          disabled={isLoading || isAppending || isFetchingNext}
          aria-label="Learning prompt"
        />
        <button
          type="submit"
          className={formStyles.submitButton}
          disabled={isLoading || isAppending || isFetchingNext || !prompt.trim()}
          aria-label={isLoading ? "Generating outline" : "Generate outline"}
        >
          {isLoading ? (
            <span className={styles.smallSpinner}></span>
          ) : (
            <span className={formStyles.submitButtonIcon}>→</span>
          )}
        </button>

      </form>

      {isLoading && !isAppending && (
        <div className={styles.loadingIndicator}>
          <p>Generating Course Outline...</p>
        </div>
      )}

      {isAppending && (
        <div className={styles.loadingIndicator} style={{marginTop: '1rem'}}>
           <p>Generating more courses...</p>
        </div>
      )}

      {error && !isLoading && !isAppending && (
        <div className={styles.errorBox}>
          <p>Error: {error}</p>
        </div>
      )}

      {editableCourses.length > 0 && !isLoading && (
        <div className={styles.resultContainer}>
           <EditableLearningPath
             pathTitle={pathTitle}
             courses={editableCourses}
             onDeleteCourse={handleDeleteCourse}
             onReorderCourses={handleReorderCourses}
             generatingCourseIds={generatingSectionCourseIds}
             selectedDifficulty={selectedDifficulty}
             onDifficultyChange={handleDifficultyChange}
           />

           <div className={styles.bottomButtons}>
             <button
               className={styles.secondaryButton}
               onClick={handleGenerateMore}
               disabled={isAppending || isLoading || isFetchingNext || !prompt.trim()}
             >
               {isAppending ? <span className={styles.smallSpinner}></span> : 'Generate More Courses'}
             </button>

             <button
                className={styles.primaryButton}
                onClick={handleNextStep}
                disabled={isFetchingNext || isLoading || isAppending || editableCourses.length === 0 || generatingSectionCourseIds.size > 0}
             >
               {isFetchingNext ? <span className={styles.smallSpinner}></span> : 'Generate Full Path'}
             </button>
           </div>
        </div>
      )}

      {isFetchingNext && taskId && (
        <div className={styles.loadingIndicator} style={{ marginTop: '2rem', borderTop: '1px solid #e9ecef', paddingTop: '1.5rem', width: '100%' }}>
          <div className={styles.spinner}></div>
          <h4>Generating Full Learning Path...</h4>
          {taskStatus && (
            <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.5rem' }}>
              <p>Status: {taskStatus.status}</p>
              {taskStatus.stage && <p>Stage: {taskStatus.stage}</p>}
              {taskStatus.progress !== null && <p>Progress: {taskStatus.progress}%</p>}
              {taskStatus.cards_completed !== null && taskStatus.total_cards !== null && (
                <p>Cards: {taskStatus.cards_completed} / {taskStatus.total_cards}</p>
              )}
            </div>
          )}
          {!taskStatus && <p>Status: Initializing...</p>}
        </div>
      )}
    </main>
  );
}
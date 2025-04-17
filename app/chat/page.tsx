'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiGenerateLearningPathFromChat,
  apiGetTaskStatus,
  TaskCreationResponse, // We get this first
  TaskStatusResponse,   // We poll for this
  // apiGetFullLearningPath // We'll use this at the end, but don't need the type here
} from '@/services/api'; // Adjust path if needed
import styles from './chat.module.css';

const POLLING_INTERVAL = 5000; // Poll every 5 seconds

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false); // True during initial request and polling
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null); // Message from TaskCreationResponse

  const router = useRouter();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Function to poll status
  const pollStatus = async (currentTaskId: string) => {
    try {
      const statusResponse = await apiGetTaskStatus(currentTaskId);
      setTaskStatus(statusResponse);

      // Check status and stop polling if completed, failed, or timed out
      if (statusResponse.status === 'completed') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsLoading(false); // Generation finished
        if (statusResponse.learning_path_id) {
          // Redirect to the newly created path page
          router.push(`/learning-paths/${statusResponse.learning_path_id}`);
        } else {
          // Should not happen if status is completed, but handle defensively
          setError('Generation completed, but Learning Path ID was missing.');
        }
      } else if (statusResponse.status === 'failed' || statusResponse.status === 'timeout') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setError(statusResponse.errors?.join(', ') || `Generation ${statusResponse.status}.`);
        setIsLoading(false);
      }
      // If status is still pending/running, the interval will call pollStatus again
    } catch (err: any) {
      // Handle polling errors (e.g., network issue, 404 Task not found)
      console.error("Polling failed:", err);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setError(`Error checking generation status: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Function to start polling
  const startPolling = (currentTaskId: string) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    // Poll immediately first time
    pollStatus(currentTaskId);
    // Then set interval
    pollingIntervalRef.current = setInterval(() => {
      pollStatus(currentTaskId);
    }, POLLING_INTERVAL);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter what you want to learn.');
      return;
    }

    // Reset state for new request
    setIsLoading(true);
    setError(null);
    setTaskId(null);
    setTaskStatus(null);
    setInitialMessage(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      // 1. Initiate Generation
      const response: TaskCreationResponse = await apiGenerateLearningPathFromChat(prompt);
      setTaskId(response.task_id);
      setInitialMessage(response.message); // Show the initial feedback message

      // 2. Start Polling
      startPolling(response.task_id);
      // isLoading remains true while polling

      // Optionally clear input after successful initiation
      // setPrompt('');

    } catch (err: any) {
      console.error('Chat generation initiation failed:', err);
      setError(err.message || 'An error occurred while starting the learning path generation.');
      setIsLoading(false); // Stop loading if initiation fails
    }
  };

  // Helper to display progress message
  const getProgressMessage = (): string => {
    if (!isLoading || !taskStatus) return initialMessage || 'Starting generation...';

    const stage = taskStatus.stage ? ` (${taskStatus.stage.replace(/_/g, ' ')})` : '';
    let progressText = '';

    if (taskStatus.stage === 'generating_cards' && taskStatus.cards_completed !== null && taskStatus.total_cards !== null && taskStatus.total_cards > 0) {
      progressText = ` - ${taskStatus.cards_completed} / ${taskStatus.total_cards} cards generated`;
    } else if (taskStatus.progress !== null) {
      progressText = ` - ${taskStatus.progress}% complete`;
    }

    return `Generating your path${stage}${progressText}...`;
  };


  return (
    <main className={styles.chatContainer}>
      <h1 className={styles.title}>Create Your Learning Path</h1>
      <p className={styles.subtitle}>Tell us what you want to learn, and we'll generate a personalized path for you.</p>

      <form onSubmit={handleSubmit} className={styles.chatForm}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'I want to learn about web development in 60 days'"
          className={styles.input}
          disabled={isLoading} // Disable input while loading/polling
          aria-label="Learning prompt"
        />
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading} // Disable button while loading/polling
        >
          {isLoading ? 'Generating...' : 'Generate Path'}
        </button>
      </form>

      {/* Loading / Progress Indicator */}
      {isLoading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>{getProgressMessage()}</p>
          {/* Optional: Add progress bar based on taskStatus.progress */}
        </div>
      )}

      {/* Error Display */}
      {error && !isLoading && ( // Show error only if not loading
        <div className={styles.errorBox}>
          <p>Error: {error}</p>
        </div>
      )}

      {/* Success/Result Area - Removed as we now redirect on completion */}
      {/*
        The old logic displayed the path info here. Now, upon successful completion,
        the pollStatus function redirects the user to the learning path page.
        You could potentially show a "Generation Complete! Redirecting..." message
        briefly before the redirect happens if desired.
      */}
       {!isLoading && taskId && taskStatus?.status === 'completed' && (
         <div className={styles.successBox}> {/* Optional: Add styles for this */}
           <p>Learning path generated successfully! Redirecting...</p>
         </div>
       )}

    </main>
  );
} 
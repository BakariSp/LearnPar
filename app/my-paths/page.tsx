'use client';

import { useState, useEffect, useCallback } from 'react';
// No longer need useRef or useRouter unless used for other purposes
// import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  apiGetUserLearningPaths,
  // LearningPath, // No longer directly used for state
  UserLearningPathResponseItem, // Import the new type
  // TaskStatusResponse, // No longer needed for polling here
  // apiGetTaskStatus, // No longer needed for polling here
} from '@/services/api'; // Adjust path if needed
import styles from './my-paths.module.css'; // Create this CSS module

// Polling constants and types are no longer needed here
// const POLLING_INTERVAL = 8000;
// type TaskStatuses = Record<string, TaskStatusResponse>;

export default function MyLearningPathsPage() {
  // State now holds the new response item type
  const [paths, setPaths] = useState<UserLearningPathResponseItem[]>([]);
  // Remove polling-related state
  // const [taskStatuses, setTaskStatuses] = useState<TaskStatuses>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // Remove if not used

  // Remove polling refs and functions
  // const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  // const stopPolling = useCallback(...)
  // const pollStatus = useCallback(...)
  // const startPolling = useCallback(...)

  // Fetch initial data using the updated API call
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the updated API function
      const userPaths = await apiGetUserLearningPaths();
      setPaths(userPaths);

      // Remove polling initiation logic (lines 95-121 from original file)
      // The new endpoint doesn't provide task IDs/status to start polling

    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setError(err.message || 'Could not load your learning paths.');
    } finally {
      setIsLoading(false);
    }
  }, []); // No polling dependencies needed

  // Initial fetch on mount - remove polling cleanup
  useEffect(() => {
    fetchData();
    // Remove polling cleanup logic (lines 133-139 from original file)
    // return () => { ... };
  }, [fetchData]); // Only fetchData dependency

  // Helper to get the display status for a path
  // Simplified as polling status is unavailable from this endpoint
  const getPathDisplayStatus = (pathItem: UserLearningPathResponseItem): { text: string; className: string } => {
    // TODO: Check if pathItem or pathItem.learning_path contains a status field from the API.
    // If not, assume 'Completed' for now as the endpoint doesn't give generation status.
    // You might need to adjust this based on actual API behavior for in-progress paths.

    // Example: Check for a hypothetical status field
    // const status = pathItem.learning_path.generation_status || pathItem.status;
    // switch (status) { ... }

    // Defaulting to 'Completed' as per the current schema limitations
    return { text: 'Completed', className: styles.statusCompleted };

    // --- Original logic based on polling (for reference, now removed) ---
    // const taskId = path.generation_task_id;
    // const taskStatus = taskId ? taskStatuses[taskId] : null;
    // const finalStatus = taskStatus?.status || path.generation_status; // Prefer polled status
    // switch (finalStatus) { ... }
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>My Learning Paths</h1>

      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading your paths...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className={styles.errorBox}>
          <p>Error: {error}</p>
        </div>
      )}

      {!isLoading && !error && paths.length === 0 && (
        <p>You haven't generated any learning paths yet. Try creating one using the AI Chat!</p>
      )}

      {!isLoading && !error && paths.length > 0 && (
        <ul className={styles.pathList}>
          {/* Map over the new paths structure */}
          {paths.map(pathItem => {
            // Get status based on the simplified function
            const displayStatus = getPathDisplayStatus(pathItem);
            // Determine if the path is completed based on the display status
            const isCompleted = displayStatus.className === styles.statusCompleted;

            return (
              // Use the UserLearningPath link ID (pathItem.id) as the key
              <li key={pathItem.id} className={styles.pathItem}>
                <div className={styles.pathInfo}>
                  {/* Access data from the nested learning_path object */}
                  <h2 className={styles.pathTitle}>{pathItem.learning_path.title}</h2>
                  <p className={styles.pathDescription}>{pathItem.learning_path.description}</p>
                  <span className={`${styles.statusBadge} ${displayStatus.className}`}>
                    {displayStatus.text}
                  </span>
                </div>
                <div className={styles.pathActions}>
                  {/* Link uses the actual learning_path_id */}
                  {isCompleted ? (
                    <Link href={`/learning-paths/${pathItem.learning_path_id}`} className={styles.viewButton}>
                      View Path
                    </Link>
                  ) : (
                    // This button might always be disabled now, or logic needs adjustment
                    // if non-completed paths can be returned by the API without polling info.
                    <button className={styles.viewButtonDisabled} disabled>
                      View Path
                    </button>
                  )}
                  {/* Add other actions like delete if needed */}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
} 
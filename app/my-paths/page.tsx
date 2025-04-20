'use client';

import { useEffect, useState, useCallback } from 'react';
// No longer need useRef or useRouter unless used for other purposes
// import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  apiGetUserLearningPaths,
  // LearningPath, // No longer directly used for state
  UserLearningPathResponseItem, // Import the new type
  // TaskStatusResponse, // No longer needed for polling here
  // apiGetTaskStatus, // No longer needed for polling here
  apiDeleteUserLearningPath // Import the new delete function
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
  // Add state to track which path is currently being deleted
  const [deletingPathId, setDeletingPathId] = useState<number | null>(null);

  // Remove polling refs and functions
  // const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  // const stopPolling = useCallback(...)
  // const pollStatus = useCallback(...)
  // const startPolling = useCallback(...)

  // Fetch initial data using the updated API call
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDeletingPathId(null); // Reset deleting state on fetch
    try {
      // Call the updated API function
      const userPaths = await apiGetUserLearningPaths();
      setPaths(userPaths);

      // Remove polling initiation logic (lines 95-121 from original file)
      // The new endpoint doesn't provide task IDs/status to start polling

    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      setError(err.message || 'Failed to load your learning paths. Please try again.');
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

  // Helper to determine the display status based on available data
  // This cannot show live generation progress from this endpoint.
  const getPathDisplayStatus = (pathItem: UserLearningPathResponseItem): { text: string; className: string; isReady: boolean } => {
    // Option 1: Use completion date if available
    if (pathItem.completed_at) {
      return { text: 'Completed', className: styles.statusCompleted, isReady: true };
    }

    // Option 2: Use progress if meaningful (e.g., > 0 means started)
    // Note: Progress might be 0 even if generation is finished but user hasn't started.
    if (pathItem.progress > 0) {
       return { text: `In Progress (${Math.round(pathItem.progress * 100)}%)`, className: styles.statusInProgress, isReady: true };
    }

    // Fallback: Assume it's ready to view if not explicitly completed or in progress.
    // We lack a definitive "generating" status from this specific API response.
    // If the backend *could* add a generation_status field to the nested learning_path object
    // returned by /users/me/learning-paths, we could check that here.
    // e.g., if (pathItem.learning_path.generation_status === 'completed') return ...
    // e.g., if (pathItem.learning_path.generation_status !== 'completed' && pathItem.learning_path.generation_status !== null) return { text: 'Processing...', className: styles.statusProcessing, isReady: false };

    // Defaulting to 'Ready' or 'Not Started' as the best guess without generation status
     return { text: 'Ready to Start', className: styles.statusReady, isReady: true };
  };

  // Handler for deleting a path
  const handleDeletePath = async (pathToDeleteId: number) => {
    // Confirm with the user
    if (!window.confirm('Are you sure you want to delete this learning path? This action cannot be undone.')) {
      return;
    }

    setDeletingPathId(pathToDeleteId); // Set loading state for this specific path
    setError(null); // Clear previous errors

    try {
      await apiDeleteUserLearningPath(pathToDeleteId);
      // On successful deletion, update the state to remove the path
      setPaths(currentPaths => currentPaths.filter(p => p.learning_path_id !== pathToDeleteId));
    } catch (err: any) {
      console.error(`Failed to delete path ${pathToDeleteId}:`, err);
      setError(err.message || 'Failed to delete the learning path. Please try again.');
      // Optionally, display a more specific error message to the user
    } finally {
      setDeletingPathId(null); // Reset loading state
    }
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
          {/* Show retry only if it's not a delete error */}
          {!deletingPathId && <button onClick={fetchData} className={styles.retryButton}>Retry</button>}
        </div>
      )}

      {!isLoading && !error && paths.length === 0 && (
        <div className={styles.emptyState}>
          <p>You haven't started any learning paths yet.</p>
          <p>Try generating one using the AI Chat or browse available paths!</p>
          {/* Optional: Add links to chat or browse pages */}
          {/* <Link href="/chat" className={styles.actionLink}>Generate with AI</Link> */}
          {/* <Link href="/browse-paths" className={styles.actionLink}>Browse Paths</Link> */}
        </div>
      )}

      {!isLoading && !error && paths.length > 0 && (
        <ul className={styles.pathList}>
          {/* Map over the new paths structure */}
          {paths.map(pathItem => {
            const displayStatus = getPathDisplayStatus(pathItem);
            // Use the actual learning_path ID for the link
            const pathDetailId = pathItem.learning_path_id;
            // Use the UserLearningPath link ID as the unique key for the list item
            const listItemKey = pathItem.id;
            const isDeleting = deletingPathId === pathDetailId; // Check if this path is being deleted

            return (
              <li key={listItemKey} className={`${styles.pathItem} ${isDeleting ? styles.deleting : ''}`}>
                <div className={styles.pathInfo}>
                  {/* Access data from the nested learning_path object */}
                  <h2 className={styles.pathTitle}>{pathItem.learning_path.title || 'Untitled Path'}</h2>
                  <p className={styles.pathDescription}>{pathItem.learning_path.description || 'No description available.'}</p>
                  <span className={`${styles.statusBadge} ${displayStatus.className}`}>
                    {displayStatus.text}
                  </span>
                   {/* Optionally display start date */}
                   {pathItem.start_date && (
                     <small className={styles.dateInfo}>Started: {new Date(pathItem.start_date).toLocaleDateString()}</small>
                   )}
                </div>
                <div className={styles.pathActions}>
                  {/* Link uses the actual learning_path_id */}
                  {displayStatus.isReady ? (
                    <Link href={`/learning-paths/${pathDetailId}`} className={styles.viewButton}>
                      {pathItem.progress > 0 ? 'Continue Path' : 'View Path'}
                    </Link>
                  ) : (
                    // This state might be unreachable with the current getPathDisplayStatus logic,
                    // but kept for robustness if status logic changes.
                    <button className={styles.viewButtonDisabled} disabled>
                      Processing...
                    </button>
                  )}
                  {/* Add Delete Button */}
                  <button
                    onClick={() => handleDeletePath(pathDetailId)}
                    className={`${styles.deleteButton} ${isDeleting ? styles.deleteButtonDeleting : ''}`}
                    disabled={isDeleting || isLoading} // Disable if deleting this or general loading
                  >
                    {isDeleting ? (
                      <span className={styles.smallSpinner}></span> // Show spinner when deleting
                    ) : (
                      'Delete' // Show 'Delete' text otherwise
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
} 
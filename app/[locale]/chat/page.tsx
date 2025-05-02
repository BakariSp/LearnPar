'use client';
import { useTranslation } from 'react-i18next'; 
import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
// Removed axios import as fetch is used
import styles from './chat.module.css';
import formStyles from '../../../components/Shared/InputForm.module.css';
// Ensure type names don't clash if reused locally
import { EditableLearningPath, Course as EditableCourseDefinition, Section as EditableSectionDefinition } from '../../../components/Course/EditableLearningPath';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
// Import the missing types along with existing ones
import { FullLearningPathResponse, GeneratePathPayload, apiCreatePathFromStructure, apiGetTaskStatus, TaskStatusResponse, CourseResponse, SectionResponse, CardResponse } from '@/services/api'; // Keep this type, Removed apiGenerateFullPath
// Import subscription related functions
import { checkDailyLimits } from '@/services/api/subscription';
// Remove NotificationContext import if no longer needed anywhere else in this file
// import { useNotificationContext } from '@/context/NotificationContext';
import { SuccessAnimation } from '../../../app/components';

// --- Define Dialogue types here ---
interface DialogueMessage {
  role: 'user' | 'ai' | 'error'; // Add error role for display
  content: string;
}

interface DialogueRequestPayload {
  user_input: string;
  current_plan?: object | null;
  chat_history?: string[];
}

// Define expected structure from /api/ai/dialogue response
interface DialogueResponseData {
    status: {
        has_learning_path: boolean;
        has_courses: boolean;
        has_sections?: boolean; // Optional
        has_cards?: boolean; // Optional
    };
    result: {
        learning_path?: Partial<FullLearningPathResponse>;
        courses?: any[]; // Use specific type if available e.g., EditableCourseDefinition[]
        sections?: any[]; // Use specific type if available
        cards?: any[]; // Use specific type if available
    };
    ai_reply: string;
}
// --- End Dialogue Types ---

// Keep the LearningPlan type alias
type LearningPlan = FullLearningPathResponse | null;

// --- Rename the original component ---
function ChatPageContent() {
  const { t } = useTranslation('common');
  const params = useParams();
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) : 'en';

  // --- Re-introduce chat-specific state ---
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for chat
  const [error, setError] = useState<string | null>(null); // Chat errors
  const [isPageEntering, setIsPageEntering] = useState(true);

  const [currentPlan, setCurrentPlan] = useState<LearningPlan>(null); // State for the plan remains
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null); // State to hold initial prompt
  
  // Add a separate state for user-selected difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Intermediate");

  // --- Re-introduce Finalization State ---
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationMessage, setFinalizationMessage] = useState<string | null>(null);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPromptProcessed = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null); // Chat scroll ref
  // Remove if NotificationContext is not used elsewhere in this file
  // const { setHasNewPaths } = useNotificationContext();

  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successRedirectPath, setSuccessRedirectPath] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // --- Re-introduce chat scroll effect ---
  useEffect(() => {
     // Only scroll if there are messages
     if (messages.length > 0) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }
  }, [messages]);

  // Page entrance animation effect
  useEffect(() => {
    // Set a timeout to remove the entrance animation
    const timer = setTimeout(() => {
      setIsPageEntering(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handler to update plan based on AI response or direct manipulation
   const handlePlanUpdateFromAI = useCallback((updatedPlanData: Partial<LearningPlan>) => {
     setCurrentPlan(prevPlan => {
        // Simple merge: Overwrites existing top-level keys, replaces courses array entirely if present
        const mergedPlan = {
            ...(prevPlan || {}), // Start with previous plan or empty object
            ...updatedPlanData   // Apply updates from AI
        };
        // Ensure courses array exists if plan is not null
        if (mergedPlan && !mergedPlan.courses) {
            mergedPlan.courses = [];
        }
        // Ensure essential fields exist if creating a new plan
        if (!prevPlan && mergedPlan) {
            mergedPlan.title = mergedPlan.title || t('default_plan_title'); 
            mergedPlan.difficulty_level = mergedPlan.difficulty_level || "Intermediate";
            // Add other defaults if needed
        }
        return mergedPlan as LearningPlan;
     });
  }, [t]);


  // --- Re-introduce sendMessage function ---
  const sendMessage = useCallback(async (input: string, planOverride?: LearningPlan | null, history?: DialogueMessage[]) => {
    if (!input.trim() && !planOverride) return; // Don't send empty messages unless it's an initial plan generation

    const currentHistory = history || messages;
    let updatedMessages = [...currentHistory];

    // Add user message only if input is not empty (initial prompt might not have user input text)
    if (input.trim()) {
        const userMessage: DialogueMessage = { role: 'user', content: input };
        updatedMessages = [...updatedMessages, userMessage];
        setMessages(updatedMessages);
        setUserInput(''); // Clear input field
    }

    setIsLoading(true);
    setError(null);
    setFinalizationError(null); // Clear finalization errors on new message
    setFinalizationMessage(null); // Clear finalization messages

    // Prepare chat history for API
    const apiChatHistory = updatedMessages
        .filter(msg => msg.role !== 'error') // Don't send error messages back
        .slice(-10) // Keep history limit
        .map(msg => `${msg.role}: ${msg.content}`);

    // Use planOverride if provided (e.g., for initial prompt), otherwise use current plan state
    const planToSend = planOverride !== undefined ? planOverride : currentPlan;

    const payload: DialogueRequestPayload = {
      user_input: input,
      // Ensure current_plan is null or a valid object, not undefined
      current_plan: planToSend ? { ...planToSend } : null,
      chat_history: apiChatHistory,
    };

    try {
      const response = await fetch(`/api/ai/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = `API Error: ${response.status}`; // Default message with status
        // Clone the response here so we can potentially read the body twice
        const responseForErrorHandling = response.clone();

        try {
          // Try to parse JSON from the original response
          const errorData = await response.json();
          // Use the 'detail' field if available, otherwise stringify the whole object for context
          errorDetail = errorData.detail || JSON.stringify(errorData);
        } catch (jsonError) {
          // If JSON parsing fails, the response body might be text or HTML
          console.warn("API error response was not valid JSON. Trying to read as text.", jsonError);
          try {
            // Use the cloned response to read as text
            const errorText = await responseForErrorHandling.text();
            // Use the text if available, otherwise stick with the status code message
            if (errorText) {
              // Limit length to avoid overly long messages in UI
              errorDetail = `API Error ${response.status}: ${errorText.substring(0, 150)}${errorText.length > 150 ? '...' : ''}`;
            }
          } catch (textError) {
            // If reading as text also fails, log it but stick with the status code message
            console.error("Failed to read API error response body as text:", textError);
          }
        }
        // Throw the error with the best detail we could get
        throw new Error(errorDetail);
      }

      // If response.ok is true, read the JSON body from the original response
      const data: DialogueResponseData = await response.json();

      // Add AI reply to messages
      if (data.ai_reply) {
          setMessages(prev => [...prev, { role: 'ai', content: data.ai_reply }]);
      }

      // --- Logic to build updated plan data and notify parent (self) ---
      let planUpdates: Partial<LearningPlan> = {};
      let planChanged = false;

      // Check for learning path top-level updates (title, difficulty etc.)
      if (data.status.has_learning_path && data.result.learning_path) {
          planUpdates = { ...planUpdates, ...data.result.learning_path };
          planChanged = true;
      }
      // Check for course list updates
      if (data.status.has_courses && data.result.courses) {
          // Ensure courses have a structure compatible with LearningPlan (CourseResponse[])
          const formattedCourses: CourseResponse[] = data.result.courses.map((course, index) => ({
              // --- CourseResponse Fields ---
              id: course.id, // Rely on API ID
              title: course.title || `${t('default_course_title')} ${index + 1}`,
              description: course.description || "", // Default description
              estimated_days: course.estimated_days || 0, // Default estimated_days
              created_at: course.created_at, // Rely on API timestamp
              updated_at: course.updated_at, // Rely on API timestamp
              // --- Map Sections to SectionResponse ---
              sections: course.sections?.map((section: any, sIndex: number): SectionResponse => ({
                  id: section.id, // Rely on API ID
                  title: section.title || `${t('default_section_title')} ${sIndex + 1}`,
                  description: section.description || "", // Default description
                  order_index: section.order_index ?? sIndex, // Keep order_index for sections
                  estimated_days: section.estimated_days || 0, // Default estimated_days
                  cards: section.cards || [], // Default to empty cards array
                  created_at: section.created_at, // Rely on API timestamp
                  updated_at: section.updated_at, // Rely on API timestamp
              })) || [],
          }));
          planUpdates = { ...planUpdates, courses: formattedCourses };
          planChanged = true;
      }
      // Add logic for sections/cards if the API provides them separately and needs merging

      // If the plan structure was updated, call the state update handler
      if (planChanged && planUpdates && Object.keys(planUpdates).length > 0) {
          handlePlanUpdateFromAI(planUpdates);
      }
      // --- End notification logic ---

    } catch (err: any) {
      console.error('Dialogue API error:', err);
      const errorMessage = err.message || t('error_default');
      setError(errorMessage); // Set chat error state
      // Add an error message to the chat display
      setMessages(prev => [...prev, { role: 'error', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
    // Pass handlePlanUpdateFromAI as dependency
  }, [messages, currentPlan, handlePlanUpdateFromAI, t]);


  // Process the initial prompt from URL parameter
  useEffect(() => {
    if (!initialPromptProcessed.current) {
      const queryPrompt = searchParams?.get('prompt');
      if (queryPrompt) {
        initialPromptProcessed.current = true;
        const decodedPrompt = decodeURIComponent(queryPrompt);
        setInitialPrompt(decodedPrompt); // Keep track of the initial prompt text
        // Send the initial prompt via the sendMessage function
        // Pass null for planOverride initially, API should generate from scratch
        sendMessage(decodedPrompt, null, []);
        // Clean the URL
        router.replace(`/${locale}/chat`);
      }
    }
    // Add sendMessage to dependency array
  }, [searchParams, router, sendMessage, locale]);


  // --- Re-introduce handleSubmit for chat form ---
  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     sendMessage(userInput); // Send current user input using the local sendMessage
  };

  // Add localStorage effects for saving and loading the plan
  useEffect(() => {
    // Load the plan from localStorage on component mount
    try {
      const savedPlan = localStorage.getItem('currentLearningPlan');
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan);
        setCurrentPlan(parsedPlan);
        console.log('Loaded learning plan from localStorage');
      }
    } catch (error) {
      console.error('Error loading plan from localStorage:', error);
    }
  }, []);

  // Save the current plan to localStorage whenever it changes
  useEffect(() => {
    if (currentPlan) {
      try {
        localStorage.setItem('currentLearningPlan', JSON.stringify(currentPlan));
        console.log('Learning plan saved to localStorage');
      } catch (error) {
        console.error('Error saving plan to localStorage:', error);
      }
    } else {
      console.log('Current plan was set to null');
    }
  }, [currentPlan]);

  // --- Handlers for EditableLearningPath ---
  const handleDeleteCourse = (courseId: string | number) => {
    console.log('Deleting course with ID:', courseId);
    
    if (!currentPlan || !currentPlan.courses) {
      console.error('Cannot delete course: no current plan or courses');
      return;
    }
    
    // Convert courseId to string to ensure consistent comparison
    const courseIdStr = String(courseId);
    
    // Filter using the correct course ID (string comparison for consistency)
    const updatedCourses = currentPlan.courses.filter(course => String(course.id) !== courseIdStr);
    
    // Verify filtering worked correctly
    if (updatedCourses.length === currentPlan.courses.length) {
      console.error(`Filter didn't remove any courses. Course ID may not exist: ${courseIdStr}`);
      return;
    }
    
    // Create a new plan object to ensure React detects the change
    const updatedPlan = {
      ...currentPlan,
      courses: [...updatedCourses]
    };
    
    // Force update by setting a new plan object
    setCurrentPlan(updatedPlan);
    
    // localStorage is automatically updated via the useEffect
  };

  // Utility function to manually clear learning plan data
  const clearLearningPlanData = () => {
    try {
      localStorage.removeItem('currentLearningPlan');
      console.log('Learning plan data cleared from localStorage');
      setCurrentPlan(null);
    } catch (error) {
      console.error('Error clearing learning plan data from localStorage:', error);
    }
  };

  const handleReorderCourses = (reorderedCourses: EditableCourseDefinition[]) => {
    if (!currentPlan) return;
    // Map reordered courses back to the expected structure (e.g., CourseResponse)
    // Remove order_index since it's not part of CourseResponse
    const coursesForState = reorderedCourses.map(({ order_index, ...rest }) => rest);
    
    const updatedPlan = { ...currentPlan, courses: coursesForState as any };
    setCurrentPlan(updatedPlan);
    // Save the change automatically via the useEffect above
  };

  // --- Updated handler for difficulty change ---
  const handleDifficultyChange = (difficulty: string) => {
    if (!currentPlan) return;
    
    const updatedPlan = { ...currentPlan, difficulty_level: difficulty };
    setCurrentPlan(updatedPlan);
    setSelectedDifficulty(difficulty);
    console.log(`Difficulty changed to: ${difficulty}`);
    // Save the change automatically via the useEffect above
  };


  // --- Re-introduce Finalize Path Handler ---
   const handleFinalizePath = async () => {
    if (!currentPlan) {
      setFinalizationError(t('chat.no_plan_to_finalize', 'There is no learning plan to finalize.'));
      return;
    }

    setIsFinalizing(true);
    setFinalizationMessage(t('chat.finalizing', 'Finalizing your learning path...'));
    setFinalizationError(null);

    try {
      // Ensure the plan has the required fields and use the user-selected difficulty
      const planToFinalize = {
        ...currentPlan,
        title: currentPlan.title || t('default_plan_title'),
        description: currentPlan.description || '',
        difficulty_level: selectedDifficulty, // Use the selected difficulty level
        estimated_days: currentPlan.estimated_days || 7, // Default to 7 days if not specified
      };

      // Log the payload
      console.log('Plan being finalized:', JSON.stringify(planToFinalize, null, 2));

      // Check subscription limits before sending - added to prevent wasteful API calls
      try {
        const limits = await checkDailyLimits();
        
        if (!limits.canCreatePaths) {
          throw new Error(limits.message || 'You have reached your subscription limit for learning paths. Please upgrade your subscription to add more learning paths.');
        }
        
        setFinalizationMessage(prev => 
          prev + '\n' + t('chat.checking_limits', 'Checking subscription limits... OK')
        );
      } catch (limitsError: any) {
        // If error contains subscription messaging, handle it specially
        if (limitsError.message && (
          limitsError.message.includes('subscription limit') || 
          limitsError.message.includes('upgrade your subscription')
        )) {
          console.warn('Subscription limit check failed:', limitsError.message);
          setFinalizationError(limitsError.message);
          
          // Show subscription upgrade message
          setFinalizationMessage(prev => 
            prev + '\n' + t('chat.subscription_limit', 'Subscription limit reached. Redirecting to dashboard for upgrade options...')
          );
          
          // Wait 3 seconds then redirect to dashboard
          setTimeout(() => {
            router.push(`/${locale}/dashboard?show_upgrade=true`);
          }, 3000);
          
          return; // Exit early
        }
        
        // For other limit check errors, just log warning but proceed with attempt
        console.warn('Error checking limits, will attempt creation anyway:', limitsError);
        setFinalizationMessage(prev => 
          prev + '\n' + t('chat.limits_check_warning', 'Warning: Could not verify subscription limits, proceeding anyway...')
        );
      }

      try {
        // Create the learning path on the server - this returns a task
        setFinalizationMessage(prev => 
          prev + '\n' + t('chat.sending_plan', 'Sending learning path to server...')
        );
        
        // Make sure the API is aware of the selected difficulty level
        const createResponse = await apiCreatePathFromStructure({
          ...planToFinalize,
          difficulty_level: selectedDifficulty // Ensure difficulty is set correctly
        });
        
        let learningPathId: number | null = null;
        
        if (createResponse && createResponse.task_id) {
          setFinalizationMessage(prev => 
            prev + '\n' + t('chat.task_created', 'Task created: {{task_id}}', { task_id: createResponse.task_id })
          );
          
          // Poll for task completion to get the learning path ID
          let taskStatus: TaskStatusResponse;
          let pollCount = 0;
          const maxPolls = 15; // Increased from 10 to 15
          let hasSubscriptionError = false;
          
          // Poll until we get a learning path ID or reach max polls
          while (pollCount < maxPolls) {
            // Calculate wait time based on poll count
            const pollWaitTime = Math.min(1000 * (pollCount + 1), 5000); // Start at 1s, increase to max 5s
            
            await new Promise(resolve => setTimeout(resolve, pollWaitTime));
            
            try {
              // Try to get the task status
              taskStatus = await apiGetTaskStatus(createResponse.task_id);
              console.log(`Poll ${pollCount + 1}: Task status:`, JSON.stringify(taskStatus, null, 2));
              
              // If the task has a learning path ID, use it
              if (taskStatus.learning_path_id) {
                learningPathId = taskStatus.learning_path_id;
                console.log(`Learning path ID found: ${learningPathId}`);
                break;
              }
              
              // Check for task completion without a learning path ID
              if (taskStatus.status === 'completed' && !taskStatus.learning_path_id) {
                // This is unusual - log it but continue polling for one more attempt
                console.warn('Task completed but no learning_path_id provided in response');
                setFinalizationMessage(prev => 
                  prev + '\n' + t('chat.completed_no_id', 'Task completed but waiting for learning path ID...')
                );
              }
              
              // Check specifically for subscription limit errors
              if (taskStatus.status === 'failed' && taskStatus.result_message && 
                  (taskStatus.result_message.includes('subscription limit') || 
                   taskStatus.result_message.includes('upgrade your subscription') ||
                   taskStatus.result_message.includes('403:'))) {
                hasSubscriptionError = true;
                const errorMsg = typeof taskStatus.result_message === 'string' ? 
                  taskStatus.result_message : 'Subscription limit reached. Please upgrade.';
                  
                throw new Error(errorMsg);
              }
              
              // If the task failed for other reasons, throw a more detailed error
              if (taskStatus.status === 'failed' || taskStatus.status === 'timeout') {
                // Try to get detailed error information
                const errorDetails = taskStatus.result_message || 
                                    (taskStatus.errors && taskStatus.errors.length > 0 ? taskStatus.errors.join(', ') : '') || 
                                    (taskStatus.error_details || 'Unknown error');
                console.error('Task failed:', taskStatus);
                throw new Error(t('chat.task_failed', 'Learning path creation failed: {{message}}', { 
                  message: errorDetails 
                }));
              }
              
              // Update status message - show more details for better debugging
              setFinalizationMessage(prev => 
                prev + '\n' + t('chat.task_status', 'Status: {{status}}, Progress: {{progress}}%', { 
                  status: taskStatus.status,
                  progress: taskStatus.progress || 0
                }) + (taskStatus.result_message ? ` - ${taskStatus.result_message}` : '') +
                (taskStatus.stage ? ` (${taskStatus.stage})` : '')
              );
              
              // Check if the task is still processing
              if (taskStatus.status !== 'running' && 
                  taskStatus.status !== 'pending' && 
                  taskStatus.status !== 'starting' && 
                  taskStatus.status !== 'queued') {
                
                console.warn('Task in potentially unexpected state:', taskStatus.status);
                
                // For any unexpected status, show a warning but continue polling
                setFinalizationMessage(prev => 
                  prev + '\n' + t('chat.unusual_status', 'Note: Task in {{status}} state.', { 
                    status: taskStatus.status 
                  })
                );
              }
              
              pollCount++;
            } catch (error: any) {
              console.error('Error polling task status:', error);
              
              // Try to capture all useful information about the error
              const errorMessage = error.message || 'Unknown error';
              
              // If this is a subscription limit error, stop polling and show proper message
              if (hasSubscriptionError || (errorMessage && (
                  errorMessage.includes('subscription limit') || 
                  errorMessage.includes('upgrade your subscription') ||
                  errorMessage.includes('403:')))) {
                
                // Clean up the error message for display
                const cleanErrorMessage = errorMessage
                  .replace('Learning path creation failed: Error during saving_structure: 403:', '')
                  .replace('403:', '')
                  .trim();
                
                setFinalizationError(cleanErrorMessage || t('chat.subscription_limit_reached', 
                  'You have reached your subscription limit for learning paths. Please upgrade your subscription.'));
                  
                // Update the finalization message
                setFinalizationMessage(prev => 
                  prev + '\n' + t('chat.redirecting_to_upgrade', 'Redirecting to dashboard for subscription options...')
                );
                
                // Redirect to dashboard to show subscription options
                setTimeout(() => {
                  router.push(`/${locale}/dashboard?show_upgrade=true`);
                }, 3000); // Give user time to read the message before redirecting
                
                return; // Exit the function early
              }
              
              // If we're on the last poll attempt, throw the error to show proper message
              if (pollCount >= maxPolls - 1) {
                throw new Error(errorMessage);
              }
              
              // Show warning in status message but continue polling
              setFinalizationMessage(prev => 
                prev + '\n' + t('chat.polling_error', 'Warning: Error checking status - {{error}}', {
                  error: errorMessage
                })
              );
              
              pollCount++;
              // Continue polling despite other errors
            }
          }
          
          // If we have a subscription error, don't continue
          if (hasSubscriptionError) {
            return;
          }
          
          // If we couldn't get a learning path ID, try one more approach - fetch user learning paths
          if (!learningPathId) {
            try {
              // If we reached max polls but task status was 'completed', try to get the learning path ID from the user's learning paths
              setFinalizationMessage(prev => 
                prev + '\n' + t('chat.finding_path', 'Looking for your newly created learning path...')
              );
              
              // Attempt to fetch the user's learning paths
              const response = await fetch('/api/users/me/learning-paths', {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
              });

              if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
              }

              const data = await response.json();

              if (data.learning_paths && data.learning_paths.length > 0) {
                learningPathId = data.learning_paths[0].id;
                console.log(`Learning path ID found: ${learningPathId}`);
              }
            } catch (error: any) {
              console.error('Error finding learning path:', error);
              setFinalizationError(error.message || t('chat.error_finding_path', 'Error finding your learning path. Please try again later.'));
              return;
            }
          }
        }

        if (learningPathId) {
          // Update message to indicate redirection
          setFinalizationMessage(prev => 
            prev + '\n' + t('chat.path_created_redirecting', 'Learning path created successfully! Redirecting...')
          );
          
          // Set success animation state variables
          setSuccessMessage(t('chat.learning_path_success', 'Learning path created successfully!'));
          setSuccessRedirectPath(`/${locale}/learning-paths/${learningPathId}`);
          setShowSuccessAnimation(true);

        } else {
          setFinalizationError(t('chat.error_creating_path', 'Error creating learning path. Please try again later.'));
        }
      } catch (error: any) {
        console.error('Error finalizing path:', error);
        setFinalizationError(error.message || t('chat.error_finalizing_path', 'Error finalizing learning path. Please try again later.'));
      }
    } catch (error: any) {
      console.error('Error finalizing path:', error);
      setFinalizationError(error.message || t('chat.error_finalizing_path', 'Error finalizing learning path. Please try again later.'));
    } finally {
      setIsFinalizing(false);
    }
  };

  // Add cleanup effect to remove learning plan from localStorage when leaving the page
  useEffect(() => {
    // Function to handle the beforeunload event
    const handleBeforeUnload = () => {
      // Check if we should clean up the localStorage data
      try {
        // Clean up the temporary learning plan from localStorage
        localStorage.removeItem('currentLearningPlan');
        console.log('Learning plan cleanup: removed from localStorage');
      } catch (error) {
        console.error('Error cleaning up learning plan from localStorage:', error);
      }
    };

    // Only add listener on client-side (window only exists in browser)
    if (typeof window !== 'undefined') {
      // Add event listener for page unload
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up function to remove event listener
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, []); // Empty dependency array means this only runs on mount/unmount

  // Add cleanup when component unmounts (e.g., navigating to a different page)
  useEffect(() => {
    // Return a cleanup function that will run when the component unmounts
    return () => {
      // Clean up localStorage when navigating away from this page (not refreshing)
      try {
        localStorage.removeItem('currentLearningPlan');
        console.log('Component unmount: Cleaned up learning plan from localStorage');
      } catch (error) {
        console.error('Error cleaning up learning plan on unmount:', error);
      }
    };
  }, []); // Empty dependency array means cleanup only runs on unmount

  return (
    <>
      {showSuccessAnimation && (
        <SuccessAnimation 
          message={successMessage}
          redirectPath={successRedirectPath}
          delay={2000}
          onAnimationComplete={() => {
            // Clean up state when animation is done
            setShowSuccessAnimation(false);
            setSuccessRedirectPath('');
            setSuccessMessage('');
            
            // Clear stored learning plan data when redirecting
            try {
              localStorage.removeItem('currentLearningPlan');
            } catch (error) {
              console.error('Error cleaning up learning plan from localStorage:', error);
            }
          }}
        />
      )}
      {/* Use the new two-column layout container with animation */}
      <main className={`${styles.twoColumnLayout} ${isPageEntering ? styles.fadeIn : ''}`}>

        {/* Left Column: Learning Path + Generate Button */}
        <div className={styles.leftColumn}>
          {/* Conditionally render EditableLearningPath only when a plan exists */}
          {currentPlan ? (
            <>
              <EditableLearningPath
                initialPlan={currentPlan}
                onDeleteCourse={handleDeleteCourse}
                onReorderCourses={handleReorderCourses}
                onDifficultyChange={handleDifficultyChange}
              />
              
              {/* --- Finalize Path Button --- */}
              <button
                onClick={handleFinalizePath}
                className={styles.generateFullPathButton}
                disabled={isFinalizing || isLoading || !currentPlan || !currentPlan.courses || currentPlan.courses.length === 0}
              >
                {/* Show generic "Processing..." if finalizing */}
                {isFinalizing ? t('chat.processing') : t('chat.generate_full_path')}
              </button>
              {/* --- Display Finalization Status (includes Redirecting message) --- */}
              {isFinalizing && finalizationMessage && <p className={styles.successMessage}>{finalizationMessage}</p>}
              {/* Show error only if NOT finalizing (finalizing has its own message) */}
              {!isFinalizing && finalizationError && <p className={styles.errorMessage}>{finalizationError}</p>}
            </>
          ) : (
            // Show placeholder if no plan exists yet
            <div className={styles.placeholder}>
               {/* Show different message while initial prompt is loading */}
               {isLoading && messages.length === 0 && initialPrompt ? (
                  <>
                    <h3 className={styles.placeholderTitle}>Zero AI is working on your path...</h3>
                    <p className={styles.placeholderText}>
                      <span className={styles.phaseText}>Planning</span> • 
                      <span className={styles.activePhase}>Generating</span> • 
                      <span className={styles.phaseText}>Organizing</span>
                    </p>
                    <div className={styles.spinner}></div>
                    <p className={styles.aiThinkingText}>
                      Analyzing your interests and crafting a personalized learning journey
                    </p>
                  </>
               ) : (
                  <>
                    <h3 className={styles.placeholderTitle}>Your learning path will appear here</h3>
                    <p className={styles.placeholderText}>Zero AI is analyzing your interests and creating a structured learning path.</p>
                    {/* Visual placeholder for the editable learning path container */}
                    <div className={styles.pathPlaceholder}>
                      <div className={styles.pathPlaceholderHeader}></div>
                      <div className={styles.placeholderMessage}>
                        Zero AI is ready to craft your perfect learning journey
                      </div>
                      <div className={styles.pathPlaceholderControls}>
                        <div className={styles.pathPlaceholderLabel}>Study Days</div>
                        <div className={styles.pathPlaceholderDays}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className={styles.pathPlaceholderDay}>{day}</div>
                          ))}
                        </div>
                        <div className={styles.pathPlaceholderLabel}>Difficulty Level</div>
                        <div className={styles.pathPlaceholderDifficulty}>
                          {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                            <div key={level} className={`${styles.pathPlaceholderLevel} ${level === 'Intermediate' ? styles.pathPlaceholderLevelSelected : ''}`}>{level}</div>
                          ))}
                        </div>
                      </div>
                      <div className={styles.pathPlaceholderRow}></div>
                      <div className={styles.pathPlaceholderRow}></div>
                    </div>
                  </>
               )}
            </div>
          )}
        </div>

        {/* Right Column: Chat Interface */}
        <div className={styles.rightColumn}>
           {/* Chat Display Area */}
           <div className={styles.chatDisplayArea}>
              {/* Optional: Add a welcome message or initial state message */}
              {messages.length === 0 && !isLoading && (
                  <div className={`${styles.chatMessage} ${styles.ai}`}>
                    <span className={styles.chatRole}>AI</span>
                    <p className={styles.chatContent}>{t('chat.chat_greeting')}</p>
                </div>
              )}
              {/* Render actual messages */}
              {messages.map((msg, index) => (
                  <div key={index} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                      <span className={styles.chatRole}>
                          {msg.role === 'ai' ? 'AI' : msg.role === 'user' ? 'You' : 'System'}
                      </span>
                      <p className={styles.chatContent}>{msg.content}</p>
                  </div>
              ))}
              {/* Display loading indicator within chat */}
              {isLoading && (
                  <div className={`${styles.chatMessage} ${styles.ai}`}>
                    <span className={styles.chatRole}>AI</span>
                    <p className={styles.chatContent}><i>{t('chat.thinking')} <span className={styles.smallSpinner}></span></i></p>
                  </div>
              )}
              {/* Scroll anchor */}
              <div ref={chatEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSubmit} className={`${formStyles.inputForm} ${styles.chatInputForm}`}>
               <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t('chat.chat_placeholder')}
                  className={formStyles.input}
                  disabled={isLoading || isFinalizing} // Disable if chat loading OR finalizing
                  aria-label="Chat input"
              />
              <button
                  type="submit"
                  className={formStyles.submitButton}
                  // style={{ backgroundColor: 'black', color: 'white' }} // Style for black button from image
                  disabled={isLoading || isFinalizing || !userInput.trim()}
                  aria-label={isLoading ? t('chat.sending') : t('chat.send_message')}
              >
                  {isLoading ? <span className={styles.smallSpinner}></span> : <span className={formStyles.submitButtonIcon}>→</span>}
              </button>
          </form>

          {/* Display general chat errors (e.g., network) below input */}
          {error && !isLoading && (
               <div className={styles.errorBox}>
                  {error}
              </div>
          )}
        </div>

      </main>
    </>
  );
}

export default ChatPageContent;
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
// Removed axios import as fetch is used
import styles from './chat.module.css';
import formStyles from '../../components/Shared/InputForm.module.css';
// Ensure type names don't clash if reused locally
import { EditableLearningPath, Course as EditableCourseDefinition, Section as EditableSectionDefinition } from '../../components/Course/EditableLearningPath';
import { useRouter, useSearchParams } from 'next/navigation';
// Import the missing types along with existing ones
import { FullLearningPathResponse, GeneratePathPayload, apiCreatePathFromStructure, CourseResponse, SectionResponse, CardResponse } from '@/services/api'; // Keep this type, Removed apiGenerateFullPath
// Remove NotificationContext import if no longer needed anywhere else in this file
// import { useNotificationContext } from '@/context/NotificationContext';

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
  // --- Re-introduce chat-specific state ---
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for chat
  const [error, setError] = useState<string | null>(null); // Chat errors

  const [currentPlan, setCurrentPlan] = useState<LearningPlan>(null); // State for the plan remains
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null); // State to hold initial prompt

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

  // --- Re-introduce chat scroll effect ---
  useEffect(() => {
     // Only scroll if there are messages
     if (messages.length > 0) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }
  }, [messages]);

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
            mergedPlan.title = mergedPlan.title || "Generated Learning Plan";
            mergedPlan.difficulty_level = mergedPlan.difficulty_level || "Intermediate";
            // Add other defaults if needed
        }
        return mergedPlan as LearningPlan;
     });
  }, []);


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
      const response = await fetch('/api/ai/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }

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
              id: course.id || Date.now() + index, // Use a temporary numeric ID if missing
              title: course.title || `Course ${index + 1}`,
              description: course.description || "", // Default description
              estimated_days: course.estimated_days || 0, // Default estimated_days
              created_at: course.created_at || new Date().toISOString(), // Default created_at
              updated_at: course.updated_at || new Date().toISOString(), // Default updated_at
              // --- Map Sections to SectionResponse ---
              sections: course.sections?.map((section: any, sIndex: number): SectionResponse => ({
                  id: section.id || Date.now() + index + sIndex + 1000, // Temp numeric ID
                  title: section.title || `Section ${sIndex + 1}`,
                  description: section.description || "", // Default description
                  order_index: section.order_index ?? sIndex, // Keep order_index for sections
                  estimated_days: section.estimated_days || 0, // Default estimated_days
                  cards: section.cards || [], // Default to empty cards array
                  created_at: section.created_at || new Date().toISOString(), // Default created_at
                  updated_at: section.updated_at || new Date().toISOString(), // Default updated_at
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
      const errorMessage = err.message || 'Failed to get response from AI.';
      setError(errorMessage); // Set chat error state
      // Add an error message to the chat display
      setMessages(prev => [...prev, { role: 'error', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
    // Pass handlePlanUpdateFromAI as dependency
  }, [messages, currentPlan, handlePlanUpdateFromAI]);


  // Handle initial prompt from URL query parameter
  useEffect(() => {
    if (!initialPromptProcessed.current) {
      const queryPrompt = searchParams.get('prompt');
      if (queryPrompt) {
        initialPromptProcessed.current = true;
        const decodedPrompt = decodeURIComponent(queryPrompt);
        setInitialPrompt(decodedPrompt); // Keep track of the initial prompt text
        // Send the initial prompt via the sendMessage function
        // Pass null for planOverride initially, API should generate from scratch
        sendMessage(decodedPrompt, null, []);
        // Clean the URL
        router.replace('/chat', undefined);
      }
    }
    // Add sendMessage to dependency array
  }, [searchParams, router, sendMessage]);


  // --- Re-introduce handleSubmit for chat form ---
  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     sendMessage(userInput); // Send current user input using the local sendMessage
  };

  // --- Handlers for EditableLearningPath (modified - removed sendMessage calls) ---
  const handleDeleteCourse = (courseId: string | number) => {
    if (!currentPlan || !currentPlan.courses) return;
    // Filter using the correct course ID
    const updatedCourses = currentPlan.courses.filter(course => course.id !== courseId);
    // Remove the renumbering step that added order_index back
    // Ensure updatedPlan.courses matches the expected CourseResponse[] structure
    const updatedPlan = { ...currentPlan, courses: updatedCourses };
    setCurrentPlan(updatedPlan);
    // Optionally: Inform AI about the deletion?
    sendMessage(`I have deleted the course titled "${currentPlan.courses.find(c => c.id === courseId)?.title}". Please acknowledge.`, updatedPlan);
  };

  const handleReorderCourses = (reorderedCourses: EditableCourseDefinition[]) => {
    if (!currentPlan) return;
    // Map reordered courses back to the expected structure (e.g., CourseResponse)
    // Assuming CourseResponse doesn't have order_index, remove it.
    // Adjust this mapping if CourseResponse structure differs significantly.
    const coursesForState = reorderedCourses.map(({ order_index, ...rest }) => rest);

    const updatedPlan = { ...currentPlan, courses: coursesForState as any }; // Use 'as any' for now to bypass strict type check, review needed
    setCurrentPlan(updatedPlan);
     // Optionally: Inform AI about the reorder?
    sendMessage(`I have reordered the courses. Please acknowledge.`, updatedPlan);
  };

  const handleDifficultyChange = (difficulty: string) => {
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, difficulty_level: difficulty };
    setCurrentPlan(updatedPlan);
    // Optionally: Inform AI about the difficulty change?
    sendMessage(`I have changed the difficulty to ${difficulty}. Please update the plan if necessary.`, updatedPlan);
  };


  // --- Re-introduce Finalize Path Handler ---
   const handleFinalizePath = async () => {
    if (!currentPlan || !currentPlan.courses || currentPlan.courses.length === 0 || isFinalizing || isLoading) {
        setFinalizationError("Cannot finalize: Plan details are missing or an operation is in progress.");
        return;
    }

    setFinalizationMessage(null); // Clear previous messages
    setFinalizationError(null);
    setError(null);
    setIsFinalizing(true); // Start finalizing/loading state

    // --- Show Initial Finalizing Message ---
    setFinalizationMessage("Generating full path and content..."); // Optional: Initial message

    const payload: GeneratePathPayload = {
      prompt: initialPrompt || currentPlan.description || "User generated and finalized this learning path via chat.",
      title: currentPlan.title || "Untitled Learning Path",
      courses: currentPlan.courses.map(course => ({
          title: course.title,
          sections: course.sections?.map(section => ({ title: section.title })) || []
      })),
      difficulty_level: currentPlan.difficulty_level || 'Intermediate',
      estimated_days: currentPlan.estimated_days || currentPlan.courses.length * 7
    };

    try {
        console.log('[ChatPage] Attempting apiCreatePathFromStructure...');
        const result = await apiCreatePathFromStructure(payload);
        console.log('[ChatPage] apiCreatePathFromStructure SUCCESS:', result);

        // <<< --- UPDATE MESSAGE & REDIRECT --- >>>
        setFinalizationMessage("Path created successfully! Redirecting to My Paths...");

        // Redirect immediately after setting the message
        router.push('/my-paths');
        // NOTE: We intentionally DON'T set isFinalizing=false here.
        // The redirect will unmount the component. If the redirect fails
        // or is slow, the "Redirecting..." message will persist.

    } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || "Failed to finalize learning path.";
        console.error("[ChatPage] Finalization API error:", err);
        setFinalizationError(errorMsg);
        // Set finalizing false only on error, so the button becomes active again
        setIsFinalizing(false);
    }
  };


  return (
    // Use the new two-column layout container
    <main className={styles.twoColumnLayout}>

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
                className={styles.generateFullPathButton} // Use style defined in chat.module.css
                disabled={isFinalizing || isLoading || !currentPlan || !currentPlan.courses || currentPlan.courses.length === 0}
            >
                {/* Show generic "Processing..." if finalizing */}
                {isFinalizing ? 'Processing...' : 'Generate Full Path'}
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
                    Generating initial plan...
                    <div className={styles.spinner}></div>
                </>
             ) : (
                'Enter a prompt in the chat to start generating a learning path.'
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
                    <p className={styles.chatContent}>Hello! How can I help you create a learning path today?</p>
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
                    <p className={styles.chatContent}><i>Thinking... <span className={styles.smallSpinner}></span></i></p>
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
                placeholder="Ask AI to modify the plan..."
                className={formStyles.input}
                disabled={isLoading || isFinalizing} // Disable if chat loading OR finalizing
                aria-label="Chat input"
            />
            <button
                type="submit"
                className={formStyles.submitButton}
                // style={{ backgroundColor: 'black', color: 'white' }} // Style for black button from image
                disabled={isLoading || isFinalizing || !userInput.trim()}
                aria-label={isLoading ? "Sending..." : "Send message"}
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
  );
}

// --- New default export component wrapping the content in Suspense ---
export default function ChatPage() {
  return (
    // Provide a fallback UI while the search params are read
    <Suspense fallback={<div className={styles.loadingFallback}>Loading Chat...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}

// --- Optional: Add some basic styling for the fallback ---
/* Add to learn-par/app/chat/chat.module.css:
.loadingFallback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh; // Adjust as needed
  font-size: 1.2rem;
  color: #555;
}
*/
import { apiClient } from './auth'; // Assuming apiClient handles base URL and auth

// Export the interface
export interface LearningPathCourse {
  learning_path_id: number;
  course_id: number;
  order_index: number;
}

// Export the interface
export interface Course {
  id: number;
  title: string;
  description: string;
  // Add other relevant fields your API returns for a single course
  created_at: string;
  updated_at: string;
  // Add sections if the basic course endpoint includes them (optional)
  sections?: SectionResponse[]; // Optional based on your API design
  estimated_days?: number; // Added based on full response
}

// Export the interface
export interface LearningPath {
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty_level: string;
    estimated_days: number;
    created_at: string;
    updated_at: string;
    // Add courses if the basic learning path endpoint includes them (optional)
    courses?: CourseResponse[]; // Optional based on your API design
    sections?: SectionResponse[]; // Optional, for backwards compatibility
    // NOTE: generation_task_id and generation_status might be missing from the new endpoint's nested object
    // Add them back here if the API *does* include them within the nested learning_path object.
    // generation_task_id?: string | null;
    // generation_status?: 'pending' | 'starting' | 'running' | 'completed' | 'failed' | 'timeout' | null;
}

// --- New Interfaces based on /full endpoint ---

export interface CardResource {
  // Define structure based on your actual resource data
  // Example:
  url?: string;
  title?: string;
  type?: string;
}

export interface CardResponse {
  id: number;
  keyword: string;
  explanation: string;
  resources: Record<string, CardResource> | CardResource[] | {}; // Flexible based on actual structure
  level: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SectionResponse {
  id: number;
  title: string;
  description: string;
  order_index: number;
  estimated_days: number;
  cards: CardResponse[];
  created_at: string;
  updated_at: string;
}

export interface CourseResponse {
  id: number;
  title: string;
  description: string;
  estimated_days: number;
  sections: SectionResponse[];
  created_at: string;
  updated_at: string;
}

// Interface for the response of the /full endpoint
export interface FullLearningPathResponse {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_days: number;
  courses: CourseResponse[];
  sections: SectionResponse[]; // Included for backwards compatibility as noted in docs
  created_at: string;
  updated_at: string;
}

// --- Deprecated Interface (No longer returned by initial chat generation) ---
// Note: This structure might still be useful if you want to display
// *some* info before polling completes, but the primary flow changes.
// export interface GenerateLearningPathResponse { ... }

// --- New Interfaces for Background Task Workflow ---

// Response from POST /api/chat/generate-learning-path
export interface TaskCreationResponse {
  task_id: string;
  message: string; // e.g., "Learning path generation has started..."
}

// Response from GET /api/tasks/{task_id}/status
export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'starting' | 'running' | 'completed' | 'failed' | 'timeout' | 'unknown'; // Added 'unknown' for safety
  stage: string | null; // e.g., "initializing", "extracting_goals", "planning_path_structure", "generating_cards", "finished", "queued"
  progress: number | null; // Overall progress percentage
  total_cards?: number | null; // Estimated total cards
  cards_completed?: number | null; // Cards generated so far
  learning_path_id: number | null; // Populated once path structure is created, key for fetching final result
  errors: string[] | null; // List of error messages if status is "failed" or "timeout"
  start_time: number | null; // Task start timestamp
  end_time: number | null; // Task end timestamp
  error_details?: string | null; // Optional traceback
}

// --- New Interfaces for /api/users/me/learning-paths ---

// Interface for the nested learning_path object in the new response
// (Matches the existing LearningPath interface for now, adjust if needed)
export type NestedLearningPath = LearningPath;

// Interface for each item in the response array
export interface UserLearningPathResponseItem {
  learning_path_id: number;
  id: number; // This is the UserLearningPath link ID
  user_id: number;
  progress: number;
  start_date: string | null;
  completed_at: string | null;
  learning_path: NestedLearningPath; // The actual learning path details
}

// --- API Functions ---

// Fetch details for a single learning path (Basic)
export const apiGetLearningPathById = async (id: number): Promise<LearningPath | null> => {
  const response = await apiClient(`/api/learning-paths/learning-paths/${id}`);
  if (response && response.ok) {
    return response.json();
  }
  console.error(`Failed to fetch learning path ${id}`);
  return null;
};

// Fetch course associations for a learning path
export const apiGetCoursesForLearningPath = async (learningPathId: number): Promise<LearningPathCourse[]> => {
  const response = await apiClient(`/api/courses/learning-paths/${learningPathId}/courses`);
  if (response && response.ok) {
    return response.json();
  }
  console.error(`Failed to fetch courses for learning path ${learningPathId}`);
  return [];
};

// Fetch details for a single course
export const apiGetCourseById = async (id: number): Promise<Course | null> => {
  const response = await apiClient(`/api/courses/courses/${id}`);
  if (response && response.ok) {
    return response.json();
  }
  console.error(`Failed to fetch course ${id}`);
  return null;
};

// Fetch the FULL learning path structure (Used after polling completes)
export const apiGetFullLearningPath = async (id: number): Promise<FullLearningPathResponse | null> => {
  // Note: The update doc mentions /recommendation/learning-paths/{path_id}/full
  // but current implementation uses /api/learning-paths/{id}/full.
  // Sticking with the current path unless backend confirms change.
  const response = await apiClient(`/api/learning-paths/${id}/full`);
  if (response && response.ok) {
    return response.json();
  }
  console.error(`Failed to fetch full learning path ${id}`);
  if (response && response.status === 404) {
      throw new Error(`Learning Path with ID ${id} not found.`);
  }
  throw new Error(`Failed to fetch full learning path details (status: ${response?.status}).`);
};

// Function to *initiate* learning path generation via chat prompt
export const apiGenerateLearningPathFromChat = async (prompt: string): Promise<TaskCreationResponse> => {
  try {
    // Path matches the update doc: /api/chat/generate-learning-path
    const response = await apiClient('/api/chat/generate-learning-path', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response || !response.ok) {
      const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error occurred during generation request.' })) : { detail: 'Network error or invalid response during generation request.' };
      console.error('Failed to initiate learning path generation:', response?.status, errorData);
      throw new Error(errorData.detail || `Failed to start generation (status: ${response?.status})`);
    }

    // Returns TaskCreationResponse: { task_id: string, message: string }
    return response.json();
  } catch (error) {
    console.error("Error in apiGenerateLearningPathFromChat:", error);
    throw error; // Re-throw for the component to handle
  }
};

// Function to get the status of a background task
export const apiGetTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  try {
    // Path matches the update doc: /api/tasks/{task_id}/status
    const response = await apiClient(`/api/tasks/${taskId}/status`);

    if (!response || !response.ok) {
       const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error occurred while fetching status.' })) : { detail: 'Network error or invalid response while fetching status.' };
       console.error('Failed to get task status:', response?.status, errorData);
       // Handle 404 specifically as per docs
       if (response?.status === 404) {
           throw new Error(errorData.detail || `Task with ID ${taskId} not found.`);
       }
       throw new Error(errorData.detail || `Failed to get task status (status: ${response?.status})`);
    }

    // Returns TaskStatusResponse
    return response.json();
  } catch (error) {
     console.error(`Error in apiGetTaskStatus for task ${taskId}:`, error);
     // Simulate a 'failed' status if the API call itself fails critically
     // This helps the polling logic in the component handle unexpected errors.
     // Alternatively, re-throw and let the component handle the polling interruption.
     // Let's re-throw for now, component needs robust error handling.
     throw error;
  }
};

// Fetch all learning paths associated with the currently authenticated user
export const apiGetUserLearningPaths = async (): Promise<UserLearningPathResponseItem[]> => {
  try {
    // Use the new endpoint
    const response = await apiClient('/api/users/me/learning-paths');
    if (response && response.ok) {
      return response.json();
    }
    console.error('Failed to fetch user learning paths:', response?.status);
    throw new Error(`Failed to fetch learning paths (status: ${response?.status})`);
  } catch (error) {
    console.error("Error in apiGetUserLearningPaths:", error);
    throw error; // Re-throw for the component
  }
};

// --- Other API functions (Keep as is) ---
// apiGetLearningPathTemplates(...)
// apiGetUserLearningPaths(...)
// apiGenerateLearningPath(...) // Might need update if it also uses tasks now
// apiGenerateCards(...) // Might need update if it also uses tasks now
// apiGetCardsForSection(...)
// apiGetCardsGeneral(...)
// apiGetGenericRecommendations(...)
// apiGetPersonalizedRecommendations(...) 
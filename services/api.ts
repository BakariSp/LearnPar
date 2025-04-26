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
  question: string;  // Add this field
  answer: string;    // Add this field
  explanation: string;
  resources: Record<string, CardResource> | CardResource[] | {};
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

// Response from GET /api/tasks/{task_id}/status OR /api/tasks/learning-paths/{learning_path_id}
// Updated to include fields from UserTaskResponse in doc/task_api.md
export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed' | 'timeout' | 'unknown';
  stage: string | null; // e.g., "initializing", "extracting_goals", "planning_path_structure", "generating_cards", "finished", "queued"
  progress: number | null; // Overall progress percentage
  learning_path_id: number | null; // Populated once path structure is created, key for fetching final result
  errors: string[] | null; // List of error messages if status is "failed" or "timeout" (from original)
  error_details?: string | null; // Optional traceback or detailed error
  start_time: number | null; // Task start timestamp (original) -> Renamed from started_at for consistency? Keep doc name.
  end_time: number | null; // Task end timestamp (original) -> Renamed from ended_at for consistency? Keep doc name.
  // Added fields from UserTaskResponse doc
  user_id?: number; // ID of the user who initiated the task
  total_items?: number | null; // Estimated total items (e.g., cards)
  completed_items?: number | null; // Items completed so far (e.g., cards)
  result_message?: string | null; // Short message on completion or failure
  started_at?: string | null; // ISO Timestamp when the task started processing
  ended_at?: string | null; // ISO Timestamp when the task finished
  id?: number; // Database ID of the task record
  created_at?: string; // ISO Timestamp when the task was created/scheduled
  updated_at?: string; // ISO Timestamp of the last status update
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

// Interface for the courses structure sent from the chat page
export interface ChatCourseStructure {
  id?: string | number; // Allow optional ID
  title: string;
  // Include sections if your backend expects them for structure creation
  sections?: { id?: string | number; title: string }[];
}

// Interface for the payload to generate the full path from chat OR structure
export interface GeneratePathPayload {
  prompt?: string; // Make prompt optional as per structure doc
  title: string;
  // Ensure ChatCourseStructure includes sections if needed by this endpoint
  courses: ChatCourseStructure[];
  difficulty_level: string;
  estimated_days?: number; // Optional as per structure doc
}

// --- Add these interfaces ---

export interface NextItemInfo {
  type: 'section' | 'course' | 'end'; // Type of the next item
  courseId?: number;
  sectionId?: number;
  title?: string; // Title of the next section/course
}

export interface CompletionInfo {
  completedSectionTitle: string;
  nextItem: NextItemInfo | null;
}

// --- End of added interfaces ---

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

// Function to initiate learning path generation via chat prompt
// (Keep the existing function for chat-based initiation)
export const apiGenerateLearningPathFromChat = async (payload: { prompt: string }): Promise<TaskCreationResponse> => {
  try {
    // Path for prompt-based generation
    const response = await apiClient('/api/chat/generate-learning-path', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload), // Only prompt is needed here
    });

    if (!response || !response.ok) {
      const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error occurred during prompt generation request.' })) : { detail: 'Network error or invalid response during prompt generation request.' };
      console.error('Failed to initiate learning path generation from prompt:', response?.status, errorData);
      throw new Error(errorData.detail || `Failed to start generation from prompt (status: ${response?.status})`);
    }

    return response.json();
  } catch (error) {
    console.error("Error in apiGenerateLearningPathFromChat:", error);
    throw error;
  }
};

// --- NEW FUNCTION ---
// Function to initiate learning path creation from a predefined structure
export const apiCreatePathFromStructure = async (payload: GeneratePathPayload): Promise<TaskCreationResponse> => {
  try {
    // Path matches the structure doc: /api/learning-paths/create-from-structure
    const response = await apiClient('/api/learning-paths/create-from-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the full structured payload
      body: JSON.stringify(payload),
    });

    if (!response || !response.ok) {
      const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error occurred during structure creation request.' })) : { detail: 'Network error or invalid response during structure creation request.' };
      console.error('Failed to initiate learning path creation from structure:', response?.status, errorData);
      throw new Error(errorData.detail || `Failed to start creation from structure (status: ${response?.status})`);
    }

    // Returns TaskCreationResponse: { task_id: string, message: string }
    return response.json();
  } catch (error) {
    console.error("Error in apiCreatePathFromStructure:", error);
    throw error; // Re-throw for the component to handle
  }
};
// --- END NEW FUNCTION ---

// Function to get the status of a background task by Task ID
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
     // Re-throw for the component to handle.
     throw error;
  }
};

// Function to get the *latest* task status associated with a Learning Path ID
export const apiGetLatestTaskForLearningPath = async (learningPathId: number): Promise<TaskStatusResponse | null> => {
  try {
    // Path matches the update doc: /tasks/learning-paths/{learning_path_id}
    const response = await apiClient(`/api/tasks/learning-paths/${learningPathId}/latest`);

    if (!response || !response.ok) {
       // Handle 404 specifically - it might mean no task exists yet, which isn't necessarily an error here
       if (response?.status === 404) {
           console.log(`No task found for learning path ${learningPathId}.`);
           return null; // Return null instead of throwing an error for 404
       }
       const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error occurred while fetching latest task.' })) : { detail: 'Network error or invalid response while fetching latest task.' };
       console.error('Failed to get latest task status for learning path:', learningPathId, response?.status, errorData);
       throw new Error(errorData.detail || `Failed to get latest task status (status: ${response?.status})`);
    }

    // Returns TaskStatusResponse (or null if 404)
    return response.json();
  } catch (error) {
     console.error(`Error in apiGetLatestTaskForLearningPath for path ${learningPathId}:`, error);
     // Re-throw for the component to handle unexpected errors
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

// Delete a learning path assigned to the current user
export const apiDeleteUserLearningPath = async (learningPathId: number): Promise<Response | null> => {
  try {
    // Endpoint from doc/learing-path.md (lines 172-175)
    const response = await apiClient(`/api/users/me/learning-paths/${learningPathId}`, {
      method: 'DELETE',
    });

    // Check for successful deletion (204 No Content) or other statuses
    if (response && (response.ok || response.status === 204)) {
      return response; // Return the response object (even if it has no body)
    }

    // Handle specific errors if needed (e.g., 404)
    if (response && response.status === 404) {
        console.error(`Learning path ${learningPathId} not found or not assigned to user.`);
        throw new Error(`Learning path not found or you don't have permission to delete it.`);
    }

    // Handle other errors
    const errorData = response ? await response.json().catch(() => ({ detail: 'Unknown error during deletion.' })) : { detail: 'Network error or invalid response during deletion.' };
    console.error('Failed to delete learning path:', response?.status, errorData);
    throw new Error(errorData.detail || `Failed to delete learning path (status: ${response?.status})`);

  } catch (error) {
    console.error("Error in apiDeleteUserLearningPath:", error);
    throw error; // Re-throw for the component to handle
  }
};

// Fetch a section with its cards
export const apiGetSectionWithCards = async (sectionId: number): Promise<SectionResponse> => {
  try {
    const response = await apiClient(`/api/sections/${sectionId}`);
    if (response && response.ok) {
      return response.json();
    }
    console.error(`Failed to fetch section ${sectionId} with cards`);
    if (response && response.status === 404) {
      throw new Error(`Section with ID ${sectionId} not found.`);
    }
    throw new Error(`Failed to fetch section details (status: ${response?.status}).`);
  } catch (error) {
    console.error("Error in apiGetSectionWithCards:", error);
    throw error;
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
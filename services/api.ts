import { apiClient, getToken } from './auth'; // Assuming apiClient handles base URL and auth

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
  is_admin?: boolean; // Optional property to indicate if the current user is an admin
  user_token?: string; // Optional property for the user's token
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

// --- Add this interface ---
// Interface for the response from /api/users/me/learning-paths/basic
export interface LearningPathBasicInfo {
  id: number;
  title: string; // Add title field
  name?: string; // Keep name, maybe make it optional if title is primary
  description: string;
  state: 'published' | 'draft' | string; // Allow other potential states
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
  const response = await apiClient(`/api/learning-paths/${id}`);
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
    console.log('Creating path from structure - payload:', JSON.stringify(payload, null, 2));
    
    // Validate payload before sending to avoid server errors
    if (!payload.title || !payload.title.trim()) {
      throw new Error('Learning path title cannot be empty');
    }
    
    if (!payload.courses || !Array.isArray(payload.courses) || payload.courses.length === 0) {
      throw new Error('Learning path must have at least one course');
    }
    
    if (!payload.difficulty_level) {
      throw new Error('Learning path must have a difficulty level');
    }
    
    // Path matches the structure doc: /api/learning-paths/create-from-structure
    const response = await apiClient('/api/learning-paths/create-from-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send the full structured payload
      body: JSON.stringify(payload),
    });

    // Detailed error handling
    if (!response) {
      console.error('No response received from API');
      throw new Error('Network error: No response received from the server when creating learning path');
    }
    
    if (!response.ok) {
      let errorMessage = `API Error ${response.status}: Failed to create learning path`;
      let errorDetail = 'Unknown error';
      
      try {
        // Try to parse error response as JSON
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        
        if (errorData.detail) {
          errorDetail = errorData.detail;
        } else if (errorData.message) {
          errorDetail = errorData.message;
        } else if (typeof errorData === 'string') {
          errorDetail = errorData;
        } else {
          // If we can't get a specific error message, log the entire object for debugging
          errorDetail = JSON.stringify(errorData);
        }
      } catch (parseError) {
        // If we can't parse JSON, try to get the response as text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorDetail = errorText.substring(0, 200); // Limit length for UI
          }
        } catch (textError) {
          console.error('Failed to get error response as text:', textError);
        }
      }
      
      // Build detailed error message
      errorMessage = `${errorMessage}: ${errorDetail}`;
      console.error('Failed to create learning path:', errorMessage);
      throw new Error(errorMessage);
    }

    // Parse successful response
    try {
      const data = await response.json();
      console.log('Successfully created task for learning path:', data);
      
      // Basic validation of response data
      if (!data.task_id) {
        throw new Error('API returned success but no task_id was provided');
      }
      
      return data;
    } catch (parseError) {
      console.error('Error parsing successful response:', parseError);
      throw new Error('The server returned an invalid response after successfully creating the learning path task');
    }
  } catch (error) {
    console.error("Error in apiCreatePathFromStructure:", error);
    // Include error details in the error message if available
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred during learning path creation';
    
    throw new Error(errorMessage);
  }
};
// --- END NEW FUNCTION ---

// Function to get the status of a background task by Task ID
export const apiGetTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  try {
    if (!taskId) {
      throw new Error('Task ID is required to check status');
    }
    
    console.log(`Checking status for task ${taskId}`);
    
    // Path matches the update doc: /api/tasks/{task_id}/status
    const response = await apiClient(`/api/tasks/${taskId}/status`);

    // Detailed error handling
    if (!response) {
      console.error(`No response received when checking status for task ${taskId}`);
      throw new Error('Network error: No response received from the server when checking task status');
    }

    if (!response.ok) {
      let errorMessage = `API Error ${response.status}: Failed to get task status`;
      let errorDetail = 'Unknown error';
      
      try {
        // Try to parse error response as JSON
        const errorData = await response.json();
        console.error('Task Status API Error Response:', errorData);
        
        if (errorData.detail) {
          errorDetail = errorData.detail;
        } else if (errorData.message) {
          errorDetail = errorData.message;
        } else if (typeof errorData === 'string') {
          errorDetail = errorData;
        } else {
          // If we can't get a specific error message, log the entire object for debugging
          errorDetail = JSON.stringify(errorData);
        }
      } catch (parseError) {
        // If we can't parse JSON, try to get the response as text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorDetail = errorText.substring(0, 200); // Limit length for UI
          }
        } catch (textError) {
          console.error('Failed to get error response as text:', textError);
        }
      }
      
      // Handle 404 specifically as per docs
      if (response.status === 404) {
        errorDetail = `Task with ID ${taskId} not found.`;
      }
      
      // Build detailed error message
      errorMessage = `${errorMessage}: ${errorDetail}`;
      console.error(`Failed to get task status for ${taskId}:`, errorMessage);
      throw new Error(errorMessage);
    }

    // Parse successful response
    let responseText;
    try {
      // First store the response as text for debugging in case JSON parsing fails
      responseText = await response.text();
      
      // Then parse the text as JSON
      const data = JSON.parse(responseText) as TaskStatusResponse;
      
      // Log task status for debugging
      console.log(`Task ${taskId} status:`, JSON.stringify(data, null, 2));
      
      // Create a default response structure if the API response is missing fields
      const defaultResponse: TaskStatusResponse = {
        task_id: taskId,
        status: 'unknown',
        stage: null,
        progress: null,
        learning_path_id: null,
        errors: null,
        error_details: null,
        start_time: null,
        end_time: null,
        result_message: null
      };
      
      // Merge the API response with the default to ensure all expected fields exist
      const safeResponse = { ...defaultResponse, ...data };
      
      // Basic validation of response data
      if (!safeResponse || typeof safeResponse !== 'object') {
        throw new Error('API returned invalid task status data: not an object');
      }
      
      // Ensure status is a valid value
      if (!safeResponse.status || typeof safeResponse.status !== 'string') {
        console.warn('Task status response missing or invalid status field:', safeResponse);
        safeResponse.status = 'unknown';
      }
      
      // Ensure result_message is a string if present
      if (safeResponse.result_message && typeof safeResponse.result_message !== 'string') {
        try {
          safeResponse.result_message = String(safeResponse.result_message);
        } catch (e) {
          safeResponse.result_message = 'Error converting result message to string';
        }
      }
      
      // Ensure learning_path_id is a number if present
      if (safeResponse.learning_path_id && typeof safeResponse.learning_path_id !== 'number') {
        try {
          const numericValue = Number(safeResponse.learning_path_id);
          if (!isNaN(numericValue)) {
            safeResponse.learning_path_id = numericValue;
          }
        } catch (e) {
          console.warn('Could not convert learning_path_id to number:', safeResponse.learning_path_id);
        }
      }
      
      // If completed but no learning_path_id, check if we can extract it from the result_message
      if (safeResponse.status === 'completed' && !safeResponse.learning_path_id && safeResponse.result_message) {
        // Try to extract a path ID from the result message using regex
        const idMatch = safeResponse.result_message.match(/learning\s*path\s*ID\s*:?\s*(\d+)/i);
        if (idMatch && idMatch[1]) {
          const extractedId = parseInt(idMatch[1], 10);
          if (!isNaN(extractedId)) {
            console.log(`Extracted learning path ID ${extractedId} from result message`);
            safeResponse.learning_path_id = extractedId;
          }
        }
      }
      
      return safeResponse;
    } catch (parseError: unknown) {
      console.error('Error parsing task status response:', parseError);
      console.error('Raw response text:', responseText);
      
      const errorMessage = parseError instanceof Error ? 
        parseError.message : 
        'Invalid response format';
        
      throw new Error(`The server returned an invalid response for task status: ${errorMessage}`);
    }
  } catch (error) {
    console.error(`Error in apiGetTaskStatus for task ${taskId}:`, error);
    // Include error details in the error message if available
    const errorMessage = error instanceof Error 
      ? error.message 
      : `Unknown error occurred while checking status for task ${taskId}`;
    
    // Create and return a basic task response with error information
    // This prevents UI from breaking and allows the polling to continue
    const errorResponse: TaskStatusResponse = {
      task_id: taskId,
      status: 'unknown',
      stage: 'error',
      progress: null,
      learning_path_id: null,
      errors: [errorMessage],
      error_details: error instanceof Error ? error.stack : undefined,
      start_time: null,
      end_time: null,
      result_message: errorMessage
    };
    
    return errorResponse;
  }
};

// Function to get the *latest* task status associated with a Learning Path ID
export const apiGetLatestTaskForLearningPath = async (learningPathId: number): Promise<TaskStatusResponse | null> => {
  try {
    // Path needs to be updated to match the API documentation
    const response = await apiClient(`/api/tasks/learning-paths/${learningPathId}`);

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

// Fetch a basic list of learning paths for the currently authenticated user
export const apiGetUserLearningPathsBasic = async (): Promise<LearningPathBasicInfo[]> => {
  try {
    // ADD '/api' back, assuming apiClient does NOT add it automatically
    const response = await apiClient('/api/users/me/learning-paths/basic');
    if (response && response.ok) {
      return response.json();
    }
    // Log the actual status from the response object when it's not ok
    console.error('Failed to fetch basic user learning paths:', response?.status);
    throw new Error(`Failed to fetch basic learning paths (status: ${response?.status})`);
  } catch (error) {
    console.error("Error in apiGetUserLearningPathsBasic:", error);
    throw error; // Re-throw for the component
  }
};

// Fetch all learning paths associated with the currently authenticated user (Full details)
export const apiGetUserLearningPaths = async (): Promise<UserLearningPathResponseItem[]> => {
  try {
    // Use the endpoint that returns full nested details
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

// --- Subscription Interfaces ---

export interface SubscriptionInfo {
  subscription_type: 'free' | 'standard' | 'premium';
  // Backend format
  limits: {
    paths: number;
    cards: number;
  };
  usage: {
    paths: {
      count: number;
      limit_reached: boolean;
      remaining: number;
    };
    cards: {
      count: number;
      limit_reached: boolean;
      remaining: number;
    };
  };
  // Frontend compatibility format
  current_usage?: {
    learning_paths: number;
    cards: number;
  };
  has_reached_limit?: {
    learning_paths: boolean;
    cards: boolean;
  };
}

export interface SubscriptionUpgradePayload {
  subscription_type?: 'free' | 'standard' | 'premium';
  promotion_code?: string;
  user_id?: string; // Optional, only for superusers
}

export interface SubscriptionUpgradeResponse {
  success: boolean;
  message: string;
  subscription_type: 'free' | 'standard' | 'premium';
}

// --- Subscription API Functions ---

// Get user's current subscription information
export const apiGetUserSubscription = async (): Promise<SubscriptionInfo | null> => {
  try {
    const response = await apiClient('/api/subscription');
    
    if (!response || !response.ok) {
      console.error('Failed to fetch subscription info:', response?.status);
      return null;
    }
    
    const data = await response.json();
    
    // Transform the data to match our component's expected format
    return {
      subscription_type: data.subscription_type,
      limits: data.limits,
      usage: data.usage,
      // Add properties for frontend component compatibility
      current_usage: {
        learning_paths: data.usage.paths.count,
        cards: data.usage.cards.count
      },
      has_reached_limit: {
        learning_paths: data.usage.paths.limit_reached,
        cards: data.usage.cards.limit_reached
      }
    };
  } catch (error) {
    console.error("Error in apiGetUserSubscription:", error);
    return null;
  }
};

// Upgrade user subscription with optional promotion code
export const apiUpgradeSubscription = async (payload: SubscriptionUpgradePayload): Promise<SubscriptionUpgradeResponse | null> => {
  try {
    const response = await apiClient('/api/subscription', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    if (!response) {
      console.error('No response received when upgrading subscription');
      return null;
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to upgrade subscription');
    }
    
    // Transform the response to our expected format
    const userData = await response.json();
    return {
      success: true,
      message: `Successfully upgraded to ${userData.subscription_type} tier!`,
      subscription_type: userData.subscription_type
    };
  } catch (error) {
    console.error("Error in apiUpgradeSubscription:", error);
    throw error;
  }
};

// --- Recommendation Interfaces ---

export interface RecommendationMetadata {
  interest_id: string;
  score: number;
  priority: number;
  tags: string[];
}

export interface RecommendationsByInterestsResponse {
  learning_paths: LearningPath[];
  metadata: Record<string, RecommendationMetadata>;
  refresh_token: string;
}

// Get recommendations based on user interests
export const apiGetRecommendationsByInterests = async (
  interests: string[], 
  limit: number = 5, 
  excludePaths: number[] = [],
  refreshToken: string = "string"
): Promise<RecommendationsByInterestsResponse | null> => {
  try {
    const response = await apiClient('/api/recommendations/interests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interests,
        limit,
        exclude_paths: excludePaths,
        refresh_token: refreshToken
      })
    });
    
    if (!response || !response.ok) {
      console.error('Failed to fetch interest-based recommendations:', response?.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in apiGetRecommendationsByInterests:", error);
    return null;
  }
};

// Add a learning path to the user's account
export const apiAddToMyLearningPaths = async (learningPathId: number): Promise<boolean> => {
  try {
    console.log('🔍 DEBUG API - apiAddToMyLearningPaths called with ID:', learningPathId);
    
    // Make sure the user is authenticated for this operation
    const token = getToken();
    console.log('🔍 DEBUG API - Token exists:', !!token);
    
    if (!token) {
      console.log('🔍 DEBUG API - No auth token found, throwing error');
      throw new Error('Authentication required to add learning path to your account');
    }
    
    // Get the API URL from environment or use default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/learning-paths/${learningPathId}/add-to-my-paths`;
    console.log(`🔍 DEBUG API - Making direct API call to: ${fullUrl}`);
    
    // Make a direct fetch request to the backend
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('🔍 DEBUG API - API response status:', response.status);
    console.log('🔍 DEBUG API - Response ok:', response.ok);
    
    if (!response.ok) {
      // Handle specific response codes
      if (response.status === 403) {
        console.log('🔍 DEBUG API - 403 Forbidden error');
        throw new Error('You do not have permission to add this learning path');
      } else if (response.status === 404) {
        console.log('🔍 DEBUG API - 404 Not Found error');
        throw new Error('Learning path not found');
      } else if (response.status === 409) {
        console.log('🔍 DEBUG API - 409 Conflict error - path already in account');
        throw new Error('This learning path is already in your account');
      } else {
        console.log('🔍 DEBUG API - Other error status:', response.status);
        // Try to get the error message from the response
        try {
          const errorData = await response.json();
          console.log('🔍 DEBUG API - Error details from response:', errorData);
          throw new Error(errorData.detail || 'Failed to add learning path to your account');
        } catch (e) {
          console.log('🔍 DEBUG API - Could not parse error details');
          throw new Error(`Failed to add learning path (Status: ${response.status})`);
        }
      }
    }
    
    // Assume success if response is ok
    console.log('🔍 DEBUG API - Successfully added learning path');
    return true;
  } catch (error) {
    console.error("🔍 DEBUG API - Error in apiAddToMyLearningPaths:", error);
    throw error;
  }
}; 
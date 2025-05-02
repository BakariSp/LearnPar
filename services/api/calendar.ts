import { apiClient, getCurrentUser } from '../auth'; // Import shared apiClient and getCurrentUser
// Import necessary types
import { Task } from '../../components/Calendar/types';

/**
 * IMPORTANT CHANGE: April 2024
 * We've updated all API endpoints to consistently use the /api/calendar/me endpoints instead of /api/calendar/tasks.
 * The /api/calendar/me endpoints automatically set the user_id based on the authentication token,
 * while the /api/calendar/tasks endpoints required the user_id to be explicitly provided in the request body.
 * This change fixes the 422 Unprocessable Entity errors that occurred when creating tasks.
 * 
 * See API documentation:
 * - POST /api/calendar/me: Create a task for the current user (automatically sets user_id)
 * - GET /api/calendar/me: Get tasks for the current user (automatically sets user_id)
 * - PATCH /api/calendar/me/{task_id}: Update a task (automatically sets user_id)
 * - DELETE /api/calendar/me/{task_id}: Delete a task (automatically sets user_id)
 */

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'userId'; // Add constant for consistency with auth.ts

// Map frontend status to backend status
export const mapStatusToBackend = (status: string): string => {
  const statusMap: Record<string, string> = {
    'todo': 'TODO',
    'done': 'DONE',
    'skipped': 'SKIPPED'
  };
  return statusMap[status] || 'TODO';
};

// Map backend status to frontend status
export const mapStatusToFrontend = (status: string): 'todo' | 'done' | 'skipped' => {
  const statusMap: Record<string, 'todo' | 'done' | 'skipped'> = {
    'TODO': 'todo',
    'DONE': 'done',
    'SKIPPED': 'skipped'
  };
  return statusMap[status.toUpperCase()] || 'todo';
};

// Get the current user ID
export const getUserId = async (): Promise<string | undefined> => {
  // First try to get userId from localStorage
  let userId = localStorage.getItem(USER_ID_KEY);

  // If userId is null or invalid format, fetch from API
  if (!userId || isNaN(Number(userId))) {
    if (userId) {
      console.warn(`Invalid user ID format in localStorage: ${userId}, removing and fetching from API`);
      localStorage.removeItem(USER_ID_KEY);
    } else {
      console.log('No user ID found in localStorage, fetching from API');
    }

    // Fetch from /api/users/me using getCurrentUser
    try {
      console.log('Fetching current user data using getCurrentUser...');
      const userData = await getCurrentUser(); // This now also updates localStorage

      if (userData && userData.id) {
        // getCurrentUser now handles storing the userId in localStorage
        return userData.id.toString();
      } else {
        console.error('User data received from getCurrentUser but no valid ID found:', userData);
      }
    } catch (error) {
      console.error('Error calling getCurrentUser:', error);
    }

    console.warn('Could not determine user ID, API calls requiring user_id may fail');
    return undefined; // Return undefined if fetch fails or no ID
  } else {
    // User ID from localStorage is valid
    console.log(`Using user ID from localStorage: ${userId}`);
    return userId;
  }
};

// Calendar API Service
export const CalendarService = {
  // Fetch tasks for a date range
  fetchTasks: async (start: string, end: string): Promise<Task[]> => {
    try {
      // Always use the /api/calendar/me endpoint as it automatically sets the user_id
      const params = new URLSearchParams({ start, end });
      const endpoint = `/api/calendar/me?${params.toString()}`;
      
      console.log(`Fetching tasks from endpoint: ${endpoint} using apiClient`);
      // Use apiClient for the request
      const response = await apiClient(endpoint); 
      
      if (!response) {
         console.error(`No response received from apiClient for ${endpoint}`);
         throw new Error('API request failed');
      }
      
      if (!response.ok) {
        // apiClient might handle 401 by logging out, but other errors need handling
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Failed to fetch tasks: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched tasks data:', data);
      
      // Handle the API response properly based on its structure
      if (data && typeof data === 'object') {
        const tasksArray = Array.isArray(data) ? data : 
                          Array.isArray(data.data) ? data.data : 
                          Array.isArray(data.tasks) ? data.tasks : [];
        
        return tasksArray.map((task: any) => ({
          id: task.id,
          card_id: task.card_id || null,
          scheduled_date: task.scheduled_date || new Date().toISOString().split('T')[0],
          start_time: task.start_time || null,
          end_time: task.end_time || null,
          status: mapStatusToFrontend(task.status || 'TODO'),
          section_id: task.section_id || null,
          course_id: task.course_id || null,
          learning_path_id: task.learning_path_id || null,
          title: task.title || `Task #${task.id}`,
          note: task.note || null
        }));
      } else {
         console.warn('Received unexpected data format for tasks:', data);
        return [];
      }
    } catch (error) {
      // Catch errors from getUserId or apiClient/fetch processing
      console.error('Error in fetchTasks:', error);
      // Re-throw or handle as appropriate for the UI
      throw error; 
    }
  },

  // Update an existing task
  updateTask: async (taskId: number, updatedTask: Partial<Task>): Promise<Task | null> => { // Return updated task or null
    if (!taskId || isNaN(Number(taskId))) {
      console.error(`Invalid task ID provided for update: ${taskId}`);
      throw new Error(`Invalid task ID: ${taskId}`);
    }
    
    try {
      // Always use the /api/calendar/me endpoint as it automatically sets the user_id
      const endpoint = `/api/calendar/me/${taskId}`;

      // Prepare payload - map status and ensure only provided fields are sent
      const payload: Record<string, any> = {};
      
      // Map frontend status to backend status if present
      if (updatedTask.status !== undefined) {
          payload.status = mapStatusToBackend(updatedTask.status);
      }

      // Include other fields if they are present in updatedTask
      if (updatedTask.title !== undefined) payload.title = updatedTask.title;
      if (updatedTask.scheduled_date !== undefined) payload.scheduled_date = updatedTask.scheduled_date;
      if (updatedTask.start_time !== undefined) payload.start_time = updatedTask.start_time; // Assumes correct format HH:MM:SS or null
      if (updatedTask.end_time !== undefined) payload.end_time = updatedTask.end_time; // Assumes correct format HH:MM:SS or null
      if (updatedTask.note !== undefined) payload.note = updatedTask.note;

      // Only send request if there's something to update
      if (Object.keys(payload).length === 0) {
          console.warn(`Update task ${taskId} called with no changes.`);
          // Optionally fetch and return the current task state or just return null/undefined
          // For now, let's just return null as nothing was updated.
          // You might want to fetch the task here if the caller expects the current state.
          return null; 
      }
      
      console.log(`Updating task ${taskId} using endpoint ${endpoint}:`, payload);
      
      // Use apiClient for the PUT request
      const response = await apiClient(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        // apiClient adds Content-Type: application/json and Authorization header
      });

      if (!response) {
         console.error(`No response received from apiClient for PATCH ${endpoint}`);
         throw new Error('API request failed');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Failed to update task ${taskId}: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to update task ${taskId}: ${response.status} ${response.statusText}`);
      }
      
      // Assuming the backend returns the updated task object on success
      const updatedTaskData = await response.json();
      console.log(`Task ${taskId} updated successfully:`, updatedTaskData);

      // Map the response back to the frontend Task structure
       return {
          id: updatedTaskData.id,
          card_id: updatedTaskData.card_id || null,
          scheduled_date: updatedTaskData.scheduled_date || new Date().toISOString().split('T')[0],
          start_time: updatedTaskData.start_time || null,
          end_time: updatedTaskData.end_time || null,
          status: mapStatusToFrontend(updatedTaskData.status || 'TODO'),
          section_id: updatedTaskData.section_id || null,
          course_id: updatedTaskData.course_id || null,
          learning_path_id: updatedTaskData.learning_path_id || null,
          title: updatedTaskData.title || `Task #${updatedTaskData.id}`,
          note: updatedTaskData.note || null
        };

    } catch (error) {
       console.error(`Error in updateTask for ID ${taskId}:`, error);
       throw error; // Re-throw or handle as appropriate for the UI
    }
  },

  // Create a new task
  createTask: async (newTaskData: Omit<Task, 'id'>): Promise<Task> => { // Return the created Task
    try {
      // Always use the /api/calendar/me endpoint as it automatically sets the user_id
      const endpoint = `/api/calendar/me`;

      // Prepare payload
      const payload: Record<string, any> = {
        ...newTaskData,
        status: mapStatusToBackend(newTaskData.status || 'todo'), // Ensure backend status format
      };
      // Remove potential id if passed in newTaskData (should not be there)
      delete payload.id; 
      
      console.log(`Creating new task using endpoint ${endpoint}:`, payload);

      // Use apiClient for the POST request
      const response = await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        // apiClient adds Content-Type: application/json and Authorization header
      });

       if (!response) {
         console.error(`No response received from apiClient for POST ${endpoint}`);
         throw new Error('API request failed');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Failed to create task: ${response.status} ${response.statusText}`, errorText);
        // Try to parse potential JSON error detail from backend
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) {
               throw new Error(errorJson.detail);
            }
        } catch(e) { /* ignore parsing error */ }
        throw new Error(`Failed to create task: ${response.status} ${response.statusText}`);
      }

      // Assuming the backend returns the created task object with its new ID
      const createdTaskData = await response.json();
      console.log('Task created successfully:', createdTaskData);

      // Map the response back to the frontend Task structure
       return {
          id: createdTaskData.id,
          card_id: createdTaskData.card_id || null,
          scheduled_date: createdTaskData.scheduled_date || new Date().toISOString().split('T')[0],
          start_time: createdTaskData.start_time || null,
          end_time: createdTaskData.end_time || null,
          status: mapStatusToFrontend(createdTaskData.status || 'TODO'),
          section_id: createdTaskData.section_id || null,
          course_id: createdTaskData.course_id || null,
          learning_path_id: createdTaskData.learning_path_id || null,
          title: createdTaskData.title || `Task #${createdTaskData.id}`,
          note: createdTaskData.note || null
        };

    } catch (error) {
      console.error('Error in createTask:', error);
      throw error; // Re-throw or handle as appropriate for the UI
    }
  },

  // Delete a task
  deleteTask: async (taskId: number): Promise<void> => {
     if (!taskId || isNaN(Number(taskId))) {
      console.error(`Invalid task ID provided for delete: ${taskId}`);
      throw new Error(`Invalid task ID: ${taskId}`);
    }
    try {
      // Always use the /api/calendar/me endpoint as it automatically sets the user_id
      const endpoint = `/api/calendar/me/${taskId}`;

      console.log(`Deleting task ${taskId} using endpoint ${endpoint}`);

      // Use apiClient for the DELETE request
      const response = await apiClient(endpoint, {
        method: 'DELETE',
        // apiClient adds Authorization header
      });

       if (!response) {
         console.error(`No response received from apiClient for DELETE ${endpoint}`);
         throw new Error('API request failed');
      }

      if (!response.ok) {
        // Handle potential errors like 404 Not Found or 403 Forbidden
        const errorText = await response.text().catch(() => 'Could not read error response');
         console.error(`Failed to delete task ${taskId}: ${response.status} ${response.statusText}`, errorText);
         throw new Error(`Failed to delete task ${taskId}: ${response.status} ${response.statusText}`);
      }

      console.log(`Task ${taskId} deleted successfully.`);
      // No return value needed for delete

    } catch (error) {
      console.error(`Error in deleteTask for ID ${taskId}:`, error);
      throw error; // Re-throw or handle as appropriate for the UI
    }
  },

  // Update task status specifically
  updateTaskStatus: async (taskId: number, status: 'todo' | 'done' | 'skipped'): Promise<Task | null> => {
    if (!taskId || isNaN(Number(taskId))) {
      console.error(`Invalid task ID provided for status update: ${taskId}`);
      throw new Error(`Invalid task ID: ${taskId}`);
    }

    try {
      const backendStatus = mapStatusToBackend(status);

      // Use the /api/calendar/me endpoint as it automatically sets the user_id
      const endpoint = `/api/calendar/me/${taskId}`;

      const payload = { status: backendStatus };
      
      console.log(`Updating task ${taskId} status to ${status} (backend: ${backendStatus}) using endpoint ${endpoint}`);

      const response = await apiClient(endpoint, {
        method: 'PATCH', // Use PATCH for partial updates if supported by backend
        body: JSON.stringify(payload),
      });

      if (!response) {
         console.error(`No response received from apiClient for PATCH ${endpoint}`);
         throw new Error('API request failed');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Failed to update task status ${taskId}: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to update task status ${taskId}: ${response.status} ${response.statusText}`);
      }

      const updatedTaskData = await response.json();
      console.log(`Task ${taskId} status updated successfully:`, updatedTaskData);

       // Map the response back to the frontend Task structure
       return {
          id: updatedTaskData.id,
          card_id: updatedTaskData.card_id || null,
          scheduled_date: updatedTaskData.scheduled_date || new Date().toISOString().split('T')[0],
          start_time: updatedTaskData.start_time || null,
          end_time: updatedTaskData.end_time || null,
          status: mapStatusToFrontend(updatedTaskData.status || 'TODO'),
          section_id: updatedTaskData.section_id || null,
          course_id: updatedTaskData.course_id || null,
          learning_path_id: updatedTaskData.learning_path_id || null,
          title: updatedTaskData.title || `Task #${updatedTaskData.id}`,
          note: updatedTaskData.note || null
        };

    } catch (error) {
      console.error(`Error updating status for task ${taskId}:`, error);
      throw error;
    }
  },

  // Fetch tasks for a specific date
  fetchTasksForDate: async (date: string): Promise<Task[]> => {
    // This can likely reuse fetchTasks with start=date and end=date
    // Or, if the backend has a dedicated endpoint, use that.
    console.log(`Fetching tasks specifically for date: ${date}`);
    return CalendarService.fetchTasks(date, date); 
  },

  // Generate recurring tasks (if needed, requires backend support)
  generateRecurringTasks: async (/* parameters */): Promise<void> => {
    // Implementation depends heavily on backend API
    console.warn('generateRecurringTasks is not implemented');
    // Example:
    // const response = await apiClient('/api/calendar/generate-recurring', { method: 'POST', body: JSON.stringify(...) });
    // Handle response...
  },

  // Check for task conflicts (if needed, might be frontend logic or backend endpoint)
  checkTaskConflicts: async (tasks: Task[]): Promise<any[]> => {
     // Implementation depends on requirements - could be purely frontend logic
     // or call a backend endpoint if complex rules exist.
     console.warn('checkTaskConflicts is not implemented');
     // Example frontend logic: iterate through tasks, check for overlapping times
     return []; // Return array of conflicts
  },

  // Shift tasks starting from a specific date by a number of days
  shiftTasks: async (fromDate: string, days: number): Promise<void> => {
    // TODO: Implement actual API call to backend endpoint for shifting tasks
    console.warn('shiftTasks is not implemented. Needs API endpoint.');
    try {
        // Always use the /api/calendar/me endpoint as it automatically sets the user_id
        const endpoint = `/api/calendar/me/shift`; // Example endpoint
        const payload = { from_date: fromDate, days };
        console.log(`Placeholder: Calling shiftTasks endpoint ${endpoint} with payload:`, payload);
        
        // Example API call structure (replace with actual call)
        // const response = await apiClient(endpoint, {
        //   method: 'POST', // or PUT/PATCH
        //   body: JSON.stringify(payload),
        // });
        // if (!response || !response.ok) {
        //   throw new Error('Failed to shift tasks');
        // }
        
        // Simulating success for now
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation

    } catch (error) {
        console.error(`Error in placeholder shiftTasks for date ${fromDate} and days ${days}:`, error);
        throw error; 
    }
  },

  // Reschedule a specific section to a new date range
  rescheduleSection: async (sectionId: number, newStartDate: string, newEndDate: string): Promise<void> => {
    // TODO: Implement actual API call to backend endpoint for rescheduling sections
     if (!sectionId || isNaN(Number(sectionId))) {
      console.error(`Invalid section ID provided for reschedule: ${sectionId}`);
      throw new Error(`Invalid section ID: ${sectionId}`);
    }
    console.warn('rescheduleSection is not implemented. Needs API endpoint.');
     try {
        // Always use the /api/calendar/me endpoint as it automatically sets the user_id
        const endpoint = `/api/calendar/me/sections/${sectionId}/reschedule`; 
        const payload = { start_date: newStartDate, end_date: newEndDate };
        console.log(`Placeholder: Calling rescheduleSection endpoint ${endpoint} for section ${sectionId} with payload:`, payload);

        // Example API call structure (replace with actual call)
        // const response = await apiClient(endpoint, {
        //   method: 'PUT', // or POST/PATCH
        //   body: JSON.stringify(payload),
        // });
        // if (!response || !response.ok) {
        //   throw new Error('Failed to reschedule section');
        // }

        // Simulating success for now
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation

    } catch (error) {
        console.error(`Error in placeholder rescheduleSection for section ${sectionId}:`, error);
        throw error; 
    }
  }

}; // End of CalendarService

export default CalendarService;

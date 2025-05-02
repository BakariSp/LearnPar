import { apiClient } from './auth';
import { UserProfile } from './auth';

export interface UpdateUserProfilePayload {
  username?: string;
  full_name?: string;
  profile_picture?: string;
  interests?: string[];
  subscription_type?: string;
}

/**
 * Gets the current user's profile information
 * @returns {Promise<UserProfile | null>} - User profile data or null if not available
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const response = await apiClient('/api/users/me');

    if (!response || !response.ok) {
      console.error(`Failed to fetch user profile: ${response?.status}`);
      return null;
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error in getUserProfile function:', error);
    return null;
  }
};

/**
 * Updates the current user's profile information
 * @param {UpdateUserProfilePayload} payload - User profile data to update
 * @returns {Promise<any>} - Updated user profile data
 */
export const updateUserProfile = async (payload: UpdateUserProfilePayload): Promise<any> => {
  try {
    const response = await apiClient('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response) {
      console.error('No response received from apiClient for /api/users/me update');
      throw new Error('Failed to update profile. Please try again.');
    }

    if (!response.ok) {
      console.error(`API error updating user: ${response.status} ${response.statusText}`);
      // Try to parse error details
      const errorData = await response.json().catch(() => ({}));
      console.error("Error details:", errorData);
      throw new Error(errorData.message || 'Failed to update profile. Please try again.');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error in updateUserProfile function:', error);
    throw error;
  }
}; 
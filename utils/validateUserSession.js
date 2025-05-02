/**
 * Utility function to validate user session and fix potential localStorage issues
 * Call this function when you need to ensure the user ID in localStorage is in sync with the user ID from the API
 */

import { getCurrentUser } from '../services/auth';

const USER_ID_KEY = 'userId';
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Validates the user session and ensures localStorage is in sync with the API
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
export const validateUserSession = async () => {
  console.log('ValidateUserSession: Validating user session...');
  
  // Check if we have a token
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    console.log('ValidateUserSession: No auth token found, session invalid');
    return false;
  }
  
  // Get user ID from localStorage
  const storedUserId = localStorage.getItem(USER_ID_KEY);
  
  try {
    // Fetch current user from API
    const userData = await getCurrentUser();
    
    if (!userData || !userData.id) {
      console.warn('ValidateUserSession: User data not available or invalid, clearing session');
      localStorage.removeItem(USER_ID_KEY);
      return false;
    }
    
    const apiUserId = userData.id.toString();
    
    // Compare localStorage user ID with API user ID
    if (storedUserId !== apiUserId) {
      console.warn(`ValidateUserSession: User ID mismatch - localStorage: ${storedUserId}, API: ${apiUserId}, updating localStorage`);
      localStorage.setItem(USER_ID_KEY, apiUserId);
    } else {
      console.log('ValidateUserSession: User ID in localStorage matches API');
    }
    
    return true;
  } catch (error) {
    console.error('ValidateUserSession: Error validating user session:', error);
    return false;
  }
};

/**
 * Called when user signs out to clean up localStorage
 */
export const clearUserSession = () => {
  console.log('ValidateUserSession: Clearing user session');
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export default validateUserSession; 
// import { LoginCredentials } from './auth'; // Assuming LoginCredentials is defined elsewhere or above

const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'userId'; // Add a constant for the user ID key
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Import cookie functions if you're using the 'cookies-next' package
// If not, these functions will rely on document.cookie APIs
import { setCookie, getCookie, deleteCookie } from 'cookies-next';
import { getCurrentLocale, getLocalizedUrl } from './utils'; // Import utility functions

export interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  console.log('🔍 DEBUG LOGIN - Login attempt started for username:', credentials.username);
  
  // Use URLSearchParams to create x-www-form-urlencoded data
  const body = new URLSearchParams();
  body.append('username', credentials.username); // Use 'username' as per doc
  body.append('password', credentials.password);

  console.log('🔍 DEBUG LOGIN - Making token request to /api/token');
  
  const response = await fetch(`/api/token`, { // Should be relative now
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', // Correct Content-Type
    },
    body: body.toString() // Send the URL-encoded string
  });

  console.log('🔍 DEBUG LOGIN - Token response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const errorData = await response.json();
      // Use 'detail' field from the backend error response as per doc
      errorMessage = errorData.detail || 'Invalid username or password';
      console.log('🔍 DEBUG LOGIN - Login error details:', errorData);
    } catch (e) {
      // Keep default message if parsing fails
      console.error('Failed to parse login error response:', e);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('🔍 DEBUG LOGIN - Token received, length:', data.access_token ? data.access_token.length : 'none');
  
  // Store the token received in the 'access_token' field
  localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
  console.log('🔍 DEBUG LOGIN - Token stored in localStorage');
  
  // Clear any existing userId from localStorage to ensure it's refreshed on login
  localStorage.removeItem(USER_ID_KEY);
  console.log('🔍 DEBUG LOGIN - Cleared existing userId from localStorage');
  
  // Check if user needs setup
  checkUserNeedsSetup();
  
  return data; // Contains access_token and token_type
};

// Check if the user is a new user and needs setup
export const checkUserNeedsSetup = async () => {
  const user = await getCurrentUser();
  
  // User is new if they don't have a username (or whatever your criteria is)
  const isNewUser = user && (!user.username || !user.interests || user.interests.length === 0);
  
  if (isNewUser) {
    // Set cookie to indicate new user status (7 days expiry)
    setNewUserStatus(true);
    setSetupCompleteStatus(false);
  } else if (user) {
    // User exists and has completed profile
    setNewUserStatus(false);
    setSetupCompleteStatus(true);
  }
  
  return isNewUser;
};

// Set user as new in cookies
export const setNewUserStatus = (isNew: boolean) => {
  if (typeof window !== 'undefined') {
    // Set the cookie with 7 days expiry
    setCookie('new_user', isNew ? 'true' : 'false', { 
      maxAge: 7 * 24 * 60 * 60,
      path: '/' 
    });
  }
};

// Set setup complete status in cookies
export const setSetupCompleteStatus = (isComplete: boolean) => {
  if (typeof window !== 'undefined') {
    // Set the cookie with 7 days expiry
    setCookie('setup_complete', isComplete ? 'true' : 'false', {
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });
  }
};

// Get new user status from cookies
export const getNewUserStatus = (): boolean => {
  if (typeof window !== 'undefined') {
    return getCookie('new_user') === 'true';
  }
  return false;
};

// Get setup complete status from cookies
export const getSetupCompleteStatus = (): boolean => {
  if (typeof window !== 'undefined') {
    return getCookie('setup_complete') === 'true';
  }
  return false;
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // Log the first few characters for debugging (not the whole token for security)
      console.log(`🔍 DEBUG TOKEN - Retrieved token from localStorage, starts with: ${token.substring(0, 10)}...`);
      return token;
    } else {
      console.log('🔍 DEBUG TOKEN - No token found in localStorage');
      return null;
    }
  }
  return null;
};

export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY); // Also remove the user ID from localStorage
    // Also clear setup cookies
    deleteCookie('new_user');
    deleteCookie('setup_complete');
    
    // Use utility function to get localized URL
    window.location.href = getLocalizedUrl('login');
  }
};

export const apiClient = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  console.log(`🔍 DEBUG AUTH - API request initiated for: ${url}`);
  console.log(`🔍 DEBUG AUTH - Token exists: ${!!token}`);
  console.log(`🔍 DEBUG AUTH - Request method: ${options.method || 'GET'}`);

  if (!token && !url.includes('/token')) { // Skip token check for login requests
    console.warn(`🔍 DEBUG AUTH - API request to ${url} made without authentication token`);
  }

  // Initialize headers safely to prevent undefined errors
  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
    // Default to application/json if no Content-Type specified
    'Content-Type': 'application/json',
    // Then add any existing headers from options, which will override defaults if present
    ...(options.headers || {}),
  };

  console.log(`🔍 DEBUG AUTH - Headers set:`, Object.keys(headers));
  console.log(`🔍 DEBUG AUTH - Authorization header present: ${!!headers['Authorization']}`);

  // Use the relative URL directly, assuming it starts with /api/ or similar
  // Let the Next.js rewrite handle the destination
  const relativeUrl = url;
  console.log(`🔍 DEBUG AUTH - Making API request to: ${relativeUrl} with method: ${options.method || 'GET'}`);
  
  // Get the env variable for the API URL to check configuration
  const apiUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
  console.log(`🔍 DEBUG AUTH - NEXT_PUBLIC_API_URL env variable: ${apiUrl || 'Not set'}`);
  
  // Log request body for debugging if it exists and isn't a file upload
  if (options.body && typeof options.body === 'string' && 
      !(headers['Content-Type']?.includes('multipart/form-data'))) {
    try {
      // Try to parse and log the body as JSON, but only if it's not too large
      const bodyStr = options.body.length > 1000 ? 
        `${options.body.substring(0, 1000)}... (truncated)` : options.body;
      console.log(`🔍 DEBUG AUTH - Request body: ${bodyStr}`);
    } catch (e) {
      // If it's not valid JSON, just log it as is
      console.log('🔍 DEBUG AUTH - Request has non-JSON body');
    }
  }

  // Set a timeout for fetch requests to prevent hanging
  const timeoutMs = 10000; // 10 seconds timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Implement retry logic
  const maxRetries = 1; // Reduced from 2 to 1 to avoid too many retries
  let retryCount = 0;
  let lastError = null;

  while (retryCount <= maxRetries) {
    try {
      console.log(`🔍 DEBUG AUTH - Sending fetch request to ${relativeUrl} (attempt ${retryCount + 1})`);
      // Fetch using the relative path with abort signal
      const response = await fetch(relativeUrl, {
        ...options,
        headers: headers as HeadersInit,
        signal: controller.signal
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      // Log response information for debugging
      console.log(`🔍 DEBUG AUTH - Response received: status ${response.status} for ${relativeUrl}`);
      
      // Add special handling for common error codes
      if (response.status === 401) {
        console.error('🔍 DEBUG AUTH - Unauthorized API request - token may be invalid or expired');
        // Only log out on the first 401 error to avoid endless redirects
        if (retryCount === 0) {
          console.log('🔍 DEBUG AUTH - Logging out user due to 401 response');
          logout(); // Consider redirecting within logout or letting caller handle redirect
        }
        return null;
      } 
      else if (response.status === 403) {
        console.error('🔍 DEBUG AUTH - Forbidden: You lack permission to access this resource');
      }
      else if (response.status === 404) {
        console.error(`🔍 DEBUG AUTH - Resource not found: ${relativeUrl}`);
      }
      else if (response.status === 500) {
        console.error(`🔍 DEBUG AUTH - Server error on ${relativeUrl}`);
        
        // For server errors, retry the request
        if (retryCount < maxRetries) {
          retryCount++;
          const retryDelay = 1000 * retryCount; // Exponential backoff: 1s
          console.log(`🔍 DEBUG AUTH - Retrying in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Skip to next retry iteration
        }
      }
      
      return response;
    } catch (error: any) {
      // Clear the timeout
      clearTimeout(timeoutId);
      
      lastError = error;
      
      // Check if this was a timeout
      if (error.name === 'AbortError') {
        console.error(`🔍 DEBUG AUTH - Request timeout after ${timeoutMs}ms for ${relativeUrl}`);
        return null;
      }
      
      console.error(`🔍 DEBUG AUTH - API request failed for ${relativeUrl}:`, error);
      
      // For network errors, retry the request
      if (retryCount < maxRetries) {
        retryCount++;
        const retryDelay = 1000 * retryCount;
        console.log(`🔍 DEBUG AUTH - Network error. Retrying in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`🔍 DEBUG AUTH - All ${maxRetries} retry attempts failed for ${relativeUrl}`);
        break; // Exit retry loop
      }
    }
  }

  // All retries failed or non-retryable error
  console.error(`🔍 DEBUG AUTH - API request ultimately failed after retries: ${relativeUrl}`);
  return null;
};

// Add this function to handle OAuth callback
export const handleOAuthCallback = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  // Trigger user setup check
  // Note: We don't await this because we don't want to block the function,
  // and the AuthContext will handle the actual flow
  checkUserNeedsSetup();
};

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  profile_picture?: string;
  is_active: boolean;
  oauth_provider?: string;
  created_at?: string;
  interests?: string[];
  is_superuser?: boolean;
  subscription_type?: 'free' | 'standard' | 'premium';
}

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    console.log('🔍 DEBUG USER - getCurrentUser called');
    const response = await apiClient('/api/users/me');
    
    if (!response || !response.ok) {
      console.error('🔍 DEBUG USER - Failed to fetch current user');
      return null;
    }

    const user = await response.json();
    console.log('🔍 DEBUG USER - Current user data retrieved:', user ? `ID: ${user.id}, Email: ${user.email}` : 'No user');
    
    // Store the user ID in localStorage when we successfully retrieve the user
    if (user && user.id) {
      const userId = user.id.toString();
      localStorage.setItem(USER_ID_KEY, userId);
      console.log(`🔍 DEBUG USER - Updated user ID in localStorage to: ${userId}`);
    }
    
    return user;
  } catch (error) {
    console.error('🔍 DEBUG USER - Error in getCurrentUser:', error);
    return null;
  }
};

/**
 * Verifies the authentication state and fixes any issues
 * This should be called early in the application lifecycle
 */
export const verifyAuthState = async (): Promise<void> => {
  console.log('🔍 DEBUG AUTH - Verifying auth state...');
  
  const token = getToken();
  if (!token) {
    console.log('🔍 DEBUG AUTH - No token found, clearing any user ID in localStorage');
    // If there's no token, but there is a userId, clear it
    if (typeof window !== 'undefined' && localStorage.getItem(USER_ID_KEY)) {
      localStorage.removeItem(USER_ID_KEY);
    }
    return;
  }
  
  // If we have a token but no user ID, try to fetch the user and update the user ID
  try {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      console.log('🔍 DEBUG AUTH - Token exists but no user ID, fetching user data');
      await getCurrentUser(); // This will update the userId in localStorage
    } else {
      // Validate that the stored user ID matches the actual user ID
      console.log('🔍 DEBUG AUTH - Token and user ID exist, validating user ID...');
      const userData = await getCurrentUser();
      
      if (userData && userData.id && userData.id.toString() !== userId) {
        console.warn(`🔍 DEBUG AUTH - User ID mismatch: stored ${userId}, actual ${userData.id}, updating`);
        localStorage.setItem(USER_ID_KEY, userData.id.toString());
      } else if (!userData || !userData.id) {
        console.warn('🔍 DEBUG AUTH - User data invalid but token exists, clearing user ID');
        localStorage.removeItem(USER_ID_KEY);
      }
    }
  } catch (error) {
    console.error('🔍 DEBUG AUTH - Error verifying auth state:', error);
  }
}; 
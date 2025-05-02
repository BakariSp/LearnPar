// import { LoginCredentials } from './auth'; // Assuming LoginCredentials is defined elsewhere or above

const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Import cookie functions if you're using the 'cookies-next' package
// If not, these functions will rely on document.cookie APIs
import { setCookie, getCookie, deleteCookie } from 'cookies-next';

export interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  // Use URLSearchParams to create x-www-form-urlencoded data
  const body = new URLSearchParams();
  body.append('username', credentials.username); // Use 'username' as per doc
  body.append('password', credentials.password);

  const response = await fetch(`/api/token`, { // Should be relative now
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', // Correct Content-Type
    },
    body: body.toString() // Send the URL-encoded string
  });

  if (!response.ok) {
    let errorMessage = 'Login failed';
    try {
      const errorData = await response.json();
      // Use 'detail' field from the backend error response as per doc
      errorMessage = errorData.detail || 'Invalid username or password';
    } catch (e) {
      // Keep default message if parsing fails
      console.error('Failed to parse login error response:', e);
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  // Store the token received in the 'access_token' field
  localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
  
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
    return localStorage.getItem(AUTH_TOKEN_KEY);
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
    // Also clear setup cookies
    deleteCookie('new_user');
    deleteCookie('setup_complete');
    window.location.href = '/login';
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
    console.log('Fetching user data from API...');
    // Ensure the path starts with /api/ to match the rewrite rule
    const response = await apiClient('/api/users/me');

    if (!response) {
      // apiClient already logs the specific fetch error
      console.error('No response received from apiClient for /api/users/me');
      return null;
    }

    if (!response.ok) {
      console.error(`API error fetching user: ${response.status} ${response.statusText}`);
      // Optionally try to parse error details
      try {
        const errorData = await response.json();
        console.error("Error details:", errorData);
      } catch (e) { /* Ignore parsing error */ }
      return null;
    }

    const userData = await response.json();
    console.log('User data received:', userData);
    return userData;
  } catch (error) {
    // This catch might be less likely now as apiClient handles the fetch error
    console.error('Error in getCurrentUser function:', error);
    return null;
  }
}; 
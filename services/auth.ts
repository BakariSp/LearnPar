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
      return token;
    } else {
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
    
    // Check if we're forcing local frontend
    if (process.env.NEXT_PUBLIC_FORCE_LOCAL_FRONTEND === 'true') {
      console.log('Forcing redirect to local login page (NEXT_PUBLIC_FORCE_LOCAL_FRONTEND)');
      // Use local redirect instead of potentially redirecting to production
      const locale = typeof window !== 'undefined' && 
        document.documentElement.lang ? document.documentElement.lang : 'en';
      window.location.href = `/${locale}/login`;
    } else {
      // Use utility function to get localized URL
      window.location.href = getLocalizedUrl('login');
    }
  }
};

function normalizeHeaders(input?: HeadersInit): Record<string, string> {
  if (!input) return {};
  if (input instanceof Headers) {
    const result: Record<string, string> = {};
    input.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } else if (Array.isArray(input)) {
    return Object.fromEntries(input);
  } else {
    return { ...input }; // 强制转成 Record<string, string>
  }
}

export const apiClient = async (endpoint: string, options: RequestInit = {}): Promise<Response | null> => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const MAX_RETRIES = 3;
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const token = getToken();
  console.log("🧪 token =", token);
  const headers: Record<string, string> = {
    ...normalizeHeaders(options.headers),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Add auth token if available
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add custom header to prevent redirection to production frontend when using production API
  if (process.env.NEXT_PUBLIC_FORCE_LOCAL_FRONTEND === 'true') {
    headers['X-Force-Local-Frontend'] = 'true';
    console.log('Using remote API with local frontend (forced by NEXT_PUBLIC_FORCE_LOCAL_FRONTEND)');
  }
  options.headers = headers;

  // Implement retry logic with exponential backoff
  let retryCount = 0;
  let lastError = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Add increasing delay for each retry attempt
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount) * 300; // Exponential backoff: 600ms, 1200ms, 2400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Retry ${retryCount} for ${endpoint} after ${delay}ms delay`);
      }

      const response = await fetch(url, options);
      
      // If we get a 429 (too many requests), implement backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retryCount + 1) * 500;
        const delay = typeof retryAfter === 'string' ? parseInt(retryAfter, 10) * 1000 : retryAfter;
        console.log(`Rate limited. Retrying after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Request to ${endpoint} failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      retryCount++;
      
      // Only retry on network errors, not on HTTP errors
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        break;
      }
    }
  }
  console.log("📡 Sending request to", url, "with headers:", headers);
  console.error(`Failed to connect to ${endpoint} after ${MAX_RETRIES} attempts:`, lastError);
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
  is_guest: boolean;
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
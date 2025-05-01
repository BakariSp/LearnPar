// import { LoginCredentials } from './auth'; // Assuming LoginCredentials is defined elsewhere or above

const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  return data; // Contains access_token and token_type
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
    window.location.href = '/login';
  }
};

export const apiClient = async (url: string, options: RequestInit = {}) => {
  const token = getToken();

  if (!token && !url.includes('/token')) { // Skip token check for login requests
    console.warn(`API request to ${url} made without authentication token`);
  }

  // Initialize headers safely to prevent undefined errors
  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
    // Default to application/json if no Content-Type specified
    'Content-Type': 'application/json',
    // Then add any existing headers from options, which will override defaults if present
    ...(options.headers || {}),
  };

  // Use the relative URL directly, assuming it starts with /api/ or similar
  // Let the Next.js rewrite handle the destination
  const relativeUrl = url;
  console.log(`Making API request to: ${relativeUrl} with method: ${options.method || 'GET'}`);
  
  // Log request body for debugging if it exists and isn't a file upload
  if (options.body && typeof options.body === 'string' && 
      !(headers['Content-Type']?.includes('multipart/form-data'))) {
    try {
      // Try to parse and log the body as JSON, but only if it's not too large
      const bodyStr = options.body.length > 1000 ? 
        `${options.body.substring(0, 1000)}... (truncated)` : options.body;
      console.log(`Request body: ${bodyStr}`);
    } catch (e) {
      // If it's not valid JSON, just log it as is
      console.log('Request has non-JSON body');
    }
  }

  // Implement retry logic
  const maxRetries = 2;
  let retryCount = 0;
  let lastError = null;

  while (retryCount <= maxRetries) {
    try {
      // Fetch using the relative path
      const response = await fetch(relativeUrl, {
        ...options,
        headers: headers as HeadersInit
      });

      // Log response information for debugging
      console.log(`Response status: ${response.status} for ${relativeUrl}`);
      
      // Add special handling for common error codes
      if (response.status === 401) {
        console.error('Unauthorized API request - token may be invalid or expired');
        // Only log out on the first 401 error to avoid endless redirects
        if (retryCount === 0) {
          logout(); // Consider redirecting within logout or letting caller handle redirect
        }
        return null;
      } 
      else if (response.status === 403) {
        console.error('Forbidden: You lack permission to access this resource');
      }
      else if (response.status === 404) {
        console.error(`Resource not found: ${relativeUrl}`);
      }
      else if (response.status === 500) {
        console.error(`Server error on ${relativeUrl}`);
        
        // For server errors, retry the request
        if (retryCount < maxRetries) {
          retryCount++;
          const retryDelay = 1000 * retryCount; // Exponential backoff: 1s, 2s
          console.log(`Retrying in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Skip to next retry iteration
        }
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`API request failed for ${relativeUrl}:`, error);
      
      // For network errors, retry the request
      if (retryCount < maxRetries) {
        retryCount++;
        const retryDelay = 1000 * retryCount; // Exponential backoff: 1s, 2s
        console.log(`Network error. Retrying in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`All ${maxRetries} retry attempts failed for ${relativeUrl}`);
        break; // Exit retry loop
      }
    }
  }

  // All retries failed or non-retryable error
  console.error(`API request ultimately failed after retries: ${relativeUrl}`);
  return null;
};

// Add this function to handle OAuth callback
export const handleOAuthCallback = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // No redirect here, we'll let the component handle it
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
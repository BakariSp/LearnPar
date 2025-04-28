// import { LoginCredentials } from './auth'; // Assuming LoginCredentials is defined elsewhere or above

const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE_URL = 'https://zero-ai-d9e8f5hgczgremge.westus-01.azurewebsites.net'; // Use HTTPS

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

  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
    // Keep Content-Type flexible, let caller override if needed (e.g., for form data)
    // Default to JSON only if no Content-Type is provided in options
    ...(!options.headers || !(options.headers as Record<string, string>)['Content-Type']) && {
        'Content-Type': 'application/json'
    },
  };

  // Use the relative URL directly, assuming it starts with /api/ or similar
  // Let the Next.js rewrite handle the destination
  const relativeUrl = url;
  console.log(`Making API request to relative path: ${relativeUrl}`);

  try {
    // Fetch using the relative path
    const response = await fetch(relativeUrl, {
      ...options,
      headers: headers as HeadersInit
    });

    if (response.status === 401) {
      console.error('Unauthorized API request - logging out');
      logout(); // Consider redirecting within logout or letting caller handle redirect
      return null;
    }

    return response;
  } catch (error) {
    console.error(`API request failed for ${relativeUrl}: ${error}`);
    // Consider throwing the error or returning a specific error object
    // instead of null to allow for better error handling upstream.
    // For now, keeping return null for consistency with previous code.
    return null;
  }
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
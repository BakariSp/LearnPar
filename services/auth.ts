import { LoginCredentials } from './auth'; // Assuming LoginCredentials is defined elsewhere or above

const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE_URL = 'http://localhost:8000'; // Your backend URL

export interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  // Use URLSearchParams to create x-www-form-urlencoded data
  const body = new URLSearchParams();
  body.append('username', credentials.username); // Use 'username' as per doc
  body.append('password', credentials.password);

  const response = await fetch(`${API_BASE_URL}/api/token`, { // Use /api/token endpoint
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
    'Content-Type': 'application/json',
  };
  
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  console.log(`Making API request to: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, { 
      ...options, 
      headers: headers as HeadersInit 
    });
    
    if (response.status === 401) {
      console.error('Unauthorized API request - logging out');
      logout();
      return null;
    }
    
    return response;
  } catch (error) {
    console.error(`API request failed: ${error}`);
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
    const response = await apiClient('/users/me');
    
    if (!response) {
      console.error('No response received from API');
      return null;
    }
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const userData = await response.json();
    console.log('User data received:', userData);
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}; 
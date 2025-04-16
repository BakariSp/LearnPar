const AUTH_TOKEN_KEY = 'auth_token';
const API_BASE_URL = 'http://localhost:8000'; // Your backend URL

export interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed');
  }
  
  const data = await response.json();
  localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
  return data;
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
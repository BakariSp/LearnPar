function getAuthToken(): string | null {
  const AUTH_TOKEN_KEY = 'auth_token'; // Match the key used in services/auth.ts
  
  // If running in browser
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  } as Record<string, string>;
  
  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Create the request with proper headers
  const requestOptions: RequestInit = {
    ...options,
    headers,
    // Ensure credentials are included for CORS
    credentials: 'include',
    // Explicitly set mode to cors
    mode: 'cors',
  };
  
  console.log(`Making ${requestOptions.method || 'GET'} request to ${url}`);
  
  try {
    const response = await fetch(url, requestOptions);
    
    // Log detailed error information for debugging
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
    }
    
    return response;
  } catch (error) {
    console.error('Network error during API request:', error);
    throw error;
  }
}; 
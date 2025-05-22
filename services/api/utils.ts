// Import the getSupabaseToken function
import { getSupabaseToken } from '../supabase';

// Updated function to get auth token - now exclusively uses Supabase
async function getAuthTokenAsync(): Promise<string | null> {
  // Get the Supabase token
  try {
    const token = await getSupabaseToken();
    if (token) {
      console.log('🔍 DEBUG TOKEN - Retrieved token from Supabase');
      return token;
    } else {
      console.log('🔍 DEBUG TOKEN - No Supabase token available');
    }
  } catch (error) {
    console.error('🔍 DEBUG TOKEN - Error getting Supabase token:', error);
  }
  
  return null;
}

// Synchronous version that doesn't use await - for backward compatibility
// Now only checks Supabase token in localStorage, not legacy token
function getAuthToken(): string | null {
  // Get the token from localStorage only (can't use async in a sync function)
  if (typeof window !== 'undefined') {
    try {
      // Try to get token from Supabase key in localStorage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = 'sb-' + supabaseUrl.split('//')[1]?.split('.')[0];
      
      const supabaseData = localStorage.getItem(supabaseKey + '-auth-token');
      if (supabaseData) {
        try {
          const parsedData = JSON.parse(supabaseData);
          if (parsedData?.access_token) {
            console.log('🔍 DEBUG TOKEN - Found Supabase access token in localStorage');
            return parsedData.access_token;
          }
        } catch (e) {
          console.error('🔍 DEBUG TOKEN - Error parsing Supabase data:', e);
        }
      }
    } catch (e) {
      console.error('🔍 DEBUG TOKEN - Error getting auth token:', e);
    }
  }
  
  return null;
}

// Normalize headers for fetch requests
const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  
  // If it's already a plain object
  if (headers && typeof headers === 'object' && !Array.isArray(headers) && !(headers instanceof Headers)) {
    return headers as Record<string, string>;
  }
  
  // Convert Headers object or header entries to plain object
  const result: Record<string, string> = {};
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    // Handle [key, value][] format
    headers.forEach(([key, value]) => {
      if (typeof key === 'string' && typeof value === 'string') {
        result[key] = value;
      }
    });
  }
  
  return result;
};

// Utility to determine if an error is a CORS error (which has limited information)
const isCorsError = (error: any): boolean => {
  // CORS errors are typically TypeError with "Failed to fetch" or similar messages
  // but they don't have specific properties to identify them
  return (
    error instanceof TypeError &&
    (error.message.includes('Failed to fetch') ||
     error.message.includes('NetworkError') ||
     error.message.includes('Network request failed'))
  );
};

// Check if Authorization header exists in any case variation
const hasAuthorizationHeader = (headers?: HeadersInit): boolean => {
  if (!headers) return false;
  
  if (headers instanceof Headers) {
    return headers.has('Authorization') || headers.has('authorization');
  }
  
  if (Array.isArray(headers)) {
    return headers.some(([key]) => 
      typeof key === 'string' && (key.toLowerCase() === 'authorization'));
  }
  
  // Plain object headers
  return Object.keys(headers as Record<string, string>).some(
    key => key.toLowerCase() === 'authorization'
  );
};

// Get auth headers with Supabase JWT token
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getSupabaseToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    
    // Optionally include user data as X-Supabase-User if needed by backend
    try {
      if (typeof window !== 'undefined') {
        const supabaseAuthItem = localStorage.getItem('supabase.auth.token');
        if (supabaseAuthItem) {
          const parsedData = JSON.parse(supabaseAuthItem);
          if (parsedData?.currentSession?.user) {
            const userData = {
              id: parsedData.currentSession.user.id,
              email: parsedData.currentSession.user.email
            };
            headers['X-Supabase-User'] = JSON.stringify(userData);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing user data for X-Supabase-User header:', e);
    }
  }
  
  return headers;
};

// Fetch wrapper with retry, better error handling and CORS considerations
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> => {
  const fetchOptions: RequestInit = {
    ...options,
    // Set default mode and credentials
    mode: options.mode || 'cors',
    credentials: options.credentials || 'include',
  };
  
  // Add token authorization if not provided
  if (!hasAuthorizationHeader(options.headers)) {
    const authHeaders = await getAuthHeaders();
    const normalizedHeaders = normalizeHeaders(options.headers);
    fetchOptions.headers = {
      ...normalizedHeaders,
      ...authHeaders
    };
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add delay for retries
      if (attempt > 0) {
        const delay = 1000 * attempt;
        console.log(`🔄 Retry ${attempt}/${maxRetries} after ${delay}ms delay for ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`🔍 DEBUG API - Request to ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
      const response = await fetch(url, fetchOptions);
      
      // Log response details
      console.log(`🔍 DEBUG API - Response from ${url}: ${response.status} ${response.statusText}`);
      
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`🔴 Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      
      // Provide more detailed diagnostic info for CORS errors
      if (isCorsError(error)) {
        console.error(`
🚨 Possible CORS issue detected when calling ${url}:
- Check that the server is running and accessible
- Ensure the server has CORS headers properly configured:
  * Access-Control-Allow-Origin: ${window.location.origin}
  * Access-Control-Allow-Methods: including the method you're using
  * Access-Control-Allow-Headers: including Authorization, Content-Type
  * Access-Control-Allow-Credentials: true (if using credentials: 'include')
- Verify that your API URL is correct: ${process.env.NEXT_PUBLIC_API_URL}
        `);
      }
    }
  }
  
  // All retries failed
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
};

// Helper function to get the current user profile
export const getCurrentUserProfile = async () => {
  console.log('🔍 DEBUG API - Fetching user profile');
  
  // Try using fetch directly first
  try {
    const token = await getAuthTokenAsync();
    if (!token) {
      console.log('🔍 DEBUG API - No auth token available for direct profile fetch');
      return null;
    }
    
    const url = `/api/users/me`;
    
    // Use our fetch wrapper
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`🔍 DEBUG API - Failed to fetch user profile: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('🔍 DEBUG API - Error fetching user profile:', error);
    return null;
  }
};

// Fallback function using fetchWithRetry
async function fallbackProfileFetch() {
  console.log('🔍 DEBUG API - Falling back to fetchWithRetry for profile fetch');
  try {
    const url = `/api/users/me`;
    
    const response = await fetchWithRetry(url);
    
    if (!response || !response.ok) {
      console.error(`🔍 DEBUG API - Fallback profile fetch failed: ${response?.status || 'no response'}`);
      return null;
    }
    
    try {
      const responseText = await response.text();
      
      if (!responseText || !responseText.trim()) {
        console.error('🔍 DEBUG API - Empty response from fallback profile fetch');
        return null;
      }
      
      const userData = JSON.parse(responseText);
      console.log('🔍 DEBUG API - Fallback profile fetch successful:', 
        userData ? `ID: ${userData.id}, Email: ${userData.email}` : 'No user data');
      return userData;
    } catch (parseError) {
      console.error('🔍 DEBUG API - Error parsing fallback profile response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('🔍 DEBUG API - Error in fallback profile fetch:', error);
    return null;
  }
} 
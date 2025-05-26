const USER_ID_KEY = 'userId'; // Add a constant for the user ID key
// API_BASE_URL removed - using relative URLs for Next.js proxy

// Import cookie functions if you're using the 'cookies-next' package
// If not, these functions will rely on document.cookie APIs
import { setCookie, getCookie, deleteCookie } from 'cookies-next';
import { getCurrentLocale, getLocalizedUrl } from './utils'; // Import utility functions
// Import Supabase client
import { supabase, getSupabaseToken } from './supabase';

export interface LoginCredentials {
  username: string;
  password: string;
}

// Check if the user is a new user and needs setup
export const checkUserNeedsSetup = async () => {
  const user = await getCurrentUser();
  
  const isNewUser = user && (!user.username || !user.interests || user.interests.length === 0);
  
  if (isNewUser) {
    setNewUserStatus(true);
    setSetupCompleteStatus(false);
  } else if (user) {
    setNewUserStatus(false);
    setSetupCompleteStatus(true);
  }
  
  return isNewUser;
};

// Set user as new in cookies
export const setNewUserStatus = (isNew: boolean) => {
  if (typeof window !== 'undefined') {
    setCookie('new_user', isNew ? 'true' : 'false', { 
      maxAge: 7 * 24 * 60 * 60,
      path: '/' 
    });
  }
};

// Set setup complete status in cookies
export const setSetupCompleteStatus = (isComplete: boolean) => {
  if (typeof window !== 'undefined') {
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

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY); 
    deleteCookie('new_user');
    deleteCookie('setup_complete');
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
    return { ...input };
  }
}

export const apiClient = async (endpoint: string, options: RequestInit = {}): Promise<Response | null> => {
  const MAX_RETRIES = 2;
  
  let url;
  if (endpoint.startsWith('http')) {
    // Full URL provided
    url = endpoint;
  } else {
    // Determine if this should go to backend or stay as Next.js route
    const backendEndpoints = [
      '/api/learning-paths',
      '/api/tasks',
      '/api/users',
      '/api/subscription',
      '/api/recommendations',
      '/api/achievements',
      '/api/cards',
      '/api/courses',
      '/api/sections',
      '/api/learning-assistant',
      '/api/calendar',
      '/api/daily-usage'
    ];
    
    // Check if this endpoint should go to the backend
    const shouldGoToBackend = backendEndpoints.some(prefix => endpoint.startsWith(prefix));
    
    if (shouldGoToBackend) {
      // Call backend directly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      url = `${backendUrl}${endpoint}`;
    } else {
      // Keep as Next.js route (for things like /api/planner/dialogue)
      let cleanEndpoint = endpoint;
      if (!cleanEndpoint.startsWith('/api')) {
        cleanEndpoint = cleanEndpoint.startsWith('/') 
          ? `/api${cleanEndpoint}` 
          : `/api/${cleanEndpoint}`;
      }
      url = cleanEndpoint;
    }
  }
  
  console.log(`🔗 API request to: ${url}`);
  
  let token = null;
  try {
    token = await getSupabaseToken(); // Use Supabase token
    if (token) {
      console.log('Using Supabase token from getSupabaseToken()');
    }
  } catch (error) {
    console.error('Error getting Supabase token:', error);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    console.log('Authorization header set with token');
  } else {
    console.log('No auth token available for apiClient'); // Clarified log
  }
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...normalizeHeaders(options.headers),
    },
    credentials: 'include',
    mode: 'cors'
  };

  let retryCount = 0;
  let lastError = null;

  while (retryCount <= MAX_RETRIES) {
    try {
      if (retryCount > 0) {
        const delay = 1000 * retryCount;
        console.log(`Retry ${retryCount}/${MAX_RETRIES} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      console.log(`Sending ${requestOptions.method || 'GET'} request to ${url}`);
      const response = await fetch(url, requestOptions);
      console.log(`Received response status: ${response.status}`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`Request failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
      retryCount++;
    }
  }
  
  console.error(`Failed after ${MAX_RETRIES + 1} attempts:`, lastError?.message);
  return null;
};

export interface UserProfile {
  id: string; // Changed from number to string to match Supabase UUID
  email?: string; // Supabase provides email
  username?: string; // Typically from user_metadata in Supabase
  full_name?: string; // Typically from user_metadata
  profile_picture?: string; // Typically from user_metadata (avatar_url)
  is_active?: boolean; // Determine based on Supabase user status or your app logic
  oauth_provider?: string; // From Supabase app_metadata
  created_at?: string; // Supabase provides this
  interests?: string[]; // Typically from user_metadata or a separate profiles table
  is_superuser?: boolean; // Custom field, manage in your DB
  is_guest?: boolean; // Custom field, manage in your DB or app_metadata
  subscription_type?: 'free' | 'standard' | 'premium'; // Custom, manage in app_metadata or DB
  user_metadata?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    interests?: string[];
  };
  app_metadata?: {
    provider?: string;
    role?: string;
    is_guest?: boolean;
    subscription_type?: 'free' | 'standard' | 'premium';
  };
}

// Refactored getCurrentUser to primarily use Supabase
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    console.log('🔍 DEBUG USER - getCurrentUser (Supabase focused) called');
    
    const { data: { user: supabaseUser }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError) {
      console.error('🔍 DEBUG USER - Error getting Supabase session/user:', sessionError);
      return null;
    }

    if (!supabaseUser) {
      console.log('🔍 DEBUG USER - No active Supabase session found.');
      // Ensure local user ID is cleared if no Supabase session
      if (typeof window !== 'undefined') localStorage.removeItem(USER_ID_KEY);
      return null;
    }

    console.log('🔍 DEBUG USER - Retrieved user data from Supabase:', 
      `ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);

    // If you still need to fetch additional profile data from your own backend
    // using the Supabase token:
    const profileApiUrl = `/api/users/me`; // This will now go directly to backend via apiClient

    const supabaseToken = (await supabase.auth.getSession()).data.session?.access_token;

    if (!supabaseToken) {
        console.warn('🔍 DEBUG USER - Supabase user exists, but no access token found for profile API call.');
        // Return a partial profile based on Supabase data, or handle as error
        // For now, we'll proceed and let the API call fail if it needs a token.
    }
    
    console.log(`🔍 DEBUG USER - Attempting to fetch extended profile from: ${profileApiUrl}`);
    // Use apiClient instead of direct fetch to leverage the backend routing logic
    const response = await apiClient(profileApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
      }
    });

    let extendedProfileData = {};
    if (response && response.ok) {
      extendedProfileData = await response.json();
      console.log('🔍 DEBUG USER - Successfully retrieved extended user profile data.');
      if (extendedProfileData && (extendedProfileData as any).id) {
         if (typeof window !== 'undefined') localStorage.setItem(USER_ID_KEY, (extendedProfileData as any).id.toString());
      }
    } else {
      const statusText = response ? `Status: ${response.status}` : 'No response received';
      console.warn(`🔍 DEBUG USER - Failed to fetch extended profile. ${statusText}. Supabase user data will be primary.`);
      // If the /api/users/me call fails, we can decide if we want to clear USER_ID_KEY
      // or just proceed with Supabase data. For now, let's not clear it,
      // as it might hold a valid ID from a previous successful fetch.
    }

    // Combine Supabase auth data with your backend profile data
    const combinedUser: UserProfile = {
      id: (extendedProfileData as any)?.id || supabaseUser.id, // Prefer backend ID if available, else Supabase ID
      email: supabaseUser.email,
      username: (extendedProfileData as any)?.username || supabaseUser.user_metadata?.username,
      full_name: (extendedProfileData as any)?.full_name || supabaseUser.user_metadata?.full_name,
      profile_picture: (extendedProfileData as any)?.profile_picture || supabaseUser.user_metadata?.avatar_url,
      is_active: (extendedProfileData as any)?.is_active !== undefined ? (extendedProfileData as any).is_active : true, // Default to true if Supabase user exists
      oauth_provider: supabaseUser.app_metadata?.provider,
      created_at: supabaseUser.created_at,
      interests: (extendedProfileData as any)?.interests || supabaseUser.user_metadata?.interests || [],
      is_superuser: (extendedProfileData as any)?.is_superuser,
      is_guest: (extendedProfileData as any)?.is_guest !== undefined ? (extendedProfileData as any).is_guest : supabaseUser.app_metadata?.is_guest,
      subscription_type: (extendedProfileData as any)?.subscription_type || supabaseUser.app_metadata?.subscription_type,
      user_metadata: supabaseUser.user_metadata,
      app_metadata: supabaseUser.app_metadata,
      // Include other fields from extendedProfileData or supabaseUser.user_metadata as needed
    };
    
    return combinedUser;

  } catch (error) {
    console.error('🔍 DEBUG USER - Error in getCurrentUser (Supabase focused):', error);
    return null;
  }
};
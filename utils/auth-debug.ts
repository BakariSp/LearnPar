/**
 * Auth Debugging Utilities
 * This file contains functions for debugging authentication issues.
 */

/**
 * Logs the complete authentication state including localStorage, cookies, and user state
 * @param {Object} user - The user object from the AuthContext
 * @param {boolean} isLoading - The loading state from the AuthContext
 * @param {string} locationInfo - A string describing where this check is being made from
 */
export const logAuthState = (user: any | null, isLoading: boolean, locationInfo = 'Unknown') => {
  console.group(`[Auth Debug] Auth State at ${locationInfo}`);
  
  try {
    console.log('User state:', user ? 'Authenticated' : 'Not authenticated');
    console.log('Loading state:', isLoading ? 'Loading' : 'Not loading');
    
    if (user) {
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Username:', user.username);
      console.log('Interests:', user.interests);
    }
    
    if (typeof window !== 'undefined') {
      // Check localStorage
      console.group('LocalStorage tokens:');
      const authToken = localStorage.getItem('auth_token');
      console.log('auth_token:', authToken ? 'Present' : 'Missing');
      
      // Try to find Supabase tokens
      const supabaseAuthData = localStorage.getItem('supabase.auth.token');
      console.log('supabase.auth.token:', supabaseAuthData ? 'Present' : 'Missing');
      
      const sb = localStorage.getItem('sb-ecwdxlkvqiqyjffcovby-auth-token');
      console.log('sb-*-auth-token:', sb ? 'Present' : 'Missing');
      console.groupEnd();
      
      // Check cookies (basic non-HttpOnly cookies)
      console.group('Browser cookies:');
      console.log('All cookies:', document.cookie);
      console.groupEnd();
    }
  } catch (error) {
    console.error('Error in logAuthState:', error);
  }
  
  console.groupEnd();
};

/**
 * Verifies if authentication should be working correctly
 * @param {Object} user - The user object from the AuthContext
 * @returns {Object} - Assessment of the auth state with any identified issues
 */
export const validateAuthState = (user: any | null) => {
  const issues: string[] = [];
  const tokens = {
    hasAuthToken: false,
    hasSupabaseToken: false
  };
  
  if (typeof window !== 'undefined') {
    tokens.hasAuthToken = !!localStorage.getItem('auth_token');
    tokens.hasSupabaseToken = !!localStorage.getItem('supabase.auth.token') || 
                              !!localStorage.getItem('sb-ecwdxlkvqiqyjffcovby-auth-token');
  }
  
  if (!user && tokens.hasAuthToken) {
    issues.push('Auth token exists but user state is null');
  }
  
  if (!user && tokens.hasSupabaseToken) {
    issues.push('Supabase token exists but user state is null');
  }
  
  if (user && !tokens.hasSupabaseToken) {
    issues.push('User state exists but no Supabase token found');
  }
  
  if (!user && !tokens.hasAuthToken && !tokens.hasSupabaseToken) {
    issues.push('No authentication tokens found');
  }
  
  return { 
    isValid: issues.length === 0,
    issues,
    tokens
  };
};

export default {
  logAuthState,
  validateAuthState
}; 
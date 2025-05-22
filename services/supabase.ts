import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

// Create and export the Supabase client
export const supabase = createPagesBrowserClient();

// Directly export the key name that Supabase uses for localStorage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_KEY_NAME = 'sb-' + supabaseUrl.split('//')[1]?.split('.')[0];

// Function to get the Supabase token
export const getSupabaseToken = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.access_token) {
      return data.session.access_token;
    }
    return null;
  } catch (error) {
    console.error('Error getting Supabase token:', error);
    return null;
  }
};

// Auth functions
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing up:', error);
    throw error;
  }
  
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Error signing in:', error);
    throw error;
  }
  
  return data;
};

export const signInWithOAuth = async (provider: 'google') => {
  // Store the current URL to return to after auth
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('auth_redirect', window.location.pathname);
    } catch (e) {
      console.error('Failed to store redirect URL:', e);
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing in with OAuth:', error);
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting current session:', error);
    throw error;
  }
  
  return data.session;
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
  
  return data.user;
};

// Set up auth state change listener
export const setupAuthListener = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    callback(event, session);
  });
}; 
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithOAuth, 
  signOut, 
  getCurrentUser as getSupabaseUser, 
  getCurrentSession, 
  setupAuthListener,
  supabase
} from '../services/supabase';
import { getLocalizedUrl, getCurrentLocale } from '../services/utils'; // Keep utility functions

// Define user profile interface for Supabase user
interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  profile_picture?: string;
  interests?: string[];
  is_active?: boolean;
  oauth_provider?: string;
  created_at?: string;
  is_guest?: boolean;
  subscription_type?: 'free' | 'standard' | 'premium';
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

// Interface for login credentials
interface LoginCredentials {
  username: string; // This will be used as email
  password: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
  handleOAuthCallback: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing Supabase auth state');
      setIsLoading(true);

      try {
        // Check for an existing session
        const session = await getCurrentSession();
        console.log('AuthContext: Session check result:', !!session);
        
        // If we have a session but no user state, set the user from session data
        if (session) {
          console.log('AuthContext: Session found, fetching user data');
          const userData = await getSupabaseUser();
          
          if (userData) {
            console.log('AuthContext: User data received, setting state');
            setUser({
              id: userData.id,
              email: userData.email,
              username: userData.user_metadata?.username,
              full_name: userData.user_metadata?.full_name,
              profile_picture: userData.user_metadata?.avatar_url,
              interests: userData.user_metadata?.interests || [],
              is_active: true,
              oauth_provider: userData.app_metadata?.provider,
              is_guest: userData.app_metadata?.is_guest,
              subscription_type: userData.app_metadata?.subscription_type,
              created_at: userData.created_at,
              user_metadata: userData.user_metadata,
              app_metadata: userData.app_metadata
            });
          } else {
            // We have a session but couldn't get user data - this is an error state
            console.error('AuthContext: Session exists but user data fetch failed');
            setUser(null);
          }
        } else {
          console.log('AuthContext: No session found, user not authenticated');
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Error during auth initialization:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthReady(true);
        console.log('AuthContext: Auth initialization complete, ready:', true);
      }
    };

    // Set up auth state listener
    const { data: authListener } = setupAuthListener((event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username,
            full_name: session.user.user_metadata?.full_name,
            profile_picture: session.user.user_metadata?.avatar_url,
            interests: session.user.user_metadata?.interests || [],
            is_active: true,
            oauth_provider: session.user.app_metadata?.provider,
            is_guest: session.user.app_metadata?.is_guest,
            subscription_type: session.user.app_metadata?.subscription_type,
            created_at: session.user.created_at,
            user_metadata: session.user.user_metadata,
            app_metadata: session.user.app_metadata
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    initializeAuth();

    // Clean up the listener on unmount
    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Helper function to redirect based on auth state - moved up before it's used
  const redirectBasedOnAuth = useCallback((redirectPath = 'home') => {
    const locale = getCurrentLocale();
    console.log(`AuthContext: Redirecting to /${locale}/${redirectPath}`);
    
    // Use more reliable window.location.href for redirection
    window.location.href = `/${locale}/${redirectPath}`;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    console.log('AuthContext: Login started with email');
    
    try {
      const { user: authUser, session } = await signInWithEmail(credentials.username, credentials.password);
      
      if (!authUser) {
        throw new Error('Login failed: No user data returned');
      }
      
      console.log('AuthContext: Login successful, session established');
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: authUser.user_metadata?.username,
        full_name: authUser.user_metadata?.full_name,
        profile_picture: authUser.user_metadata?.avatar_url,
        interests: authUser.user_metadata?.interests || [],
        is_active: true,
        oauth_provider: authUser.app_metadata?.provider,
        is_guest: authUser.app_metadata?.is_guest,
        subscription_type: authUser.app_metadata?.subscription_type,
        created_at: authUser.created_at,
        user_metadata: authUser.user_metadata,
        app_metadata: authUser.app_metadata
      });
      
      // Redirect to dashboard directly if user has interests set up
      if (authUser.user_metadata?.interests && authUser.user_metadata.interests.length > 0) {
        console.log('AuthContext: User has interests, redirecting to dashboard');
        // Use our helper function for consistent redirection
        redirectBasedOnAuth('dashboard');
      } else {
        // Redirect to auth-redirect page which will handle setup flow if needed
        console.log('AuthContext: Redirecting to auth-redirect page');
        // Use our helper function for consistent redirection
        redirectBasedOnAuth('auth-redirect?target=home');
      }
    } catch (error) {
      console.error("AuthContext: Login failed:", error);
      setUser(null);
      throw error; // Re-throw for the login page to handle
    } finally {
      setIsLoading(false);
    }
  }, [redirectBasedOnAuth]);

  // Add Google login function
  const loginWithGoogle = useCallback(async () => {
    console.log('AuthContext: Initiating Google login');
    try {
      await signInWithOAuth('google');
      // No need to set user here as the auth state listener will handle it on callback
    } catch (error) {
      console.error('AuthContext: Google login failed:', error);
      throw error;
    }
  }, []);

  // Memoize logout function
  const logout = useCallback(async () => {
    console.log('AuthContext: Logging out user');
    try {
      await signOut();
      setUser(null);
      // Redirect to login page
      router.push(getLocalizedUrl('login'));
    } catch (error) {
      console.error('AuthContext: Error during logout:', error);
    }
  }, [router]);

  // Handle OAuth callback - simplified to rely on Supabase session
  const handleOAuthCallback = useCallback(async (token: string) => {
    console.log('AuthContext: Processing OAuth callback');
    
    try {
      // Check current session after OAuth callback
      const session = await getCurrentSession();
      
      if (session) {
        console.log('AuthContext: OAuth login successful, session found');
        const userData = await getSupabaseUser();
        
        if (userData) {
          console.log('AuthContext: OAuth user data received, setting state');
          setUser({
            id: userData.id,
            email: userData.email,
            username: userData.user_metadata?.username,
            full_name: userData.user_metadata?.full_name,
            profile_picture: userData.user_metadata?.avatar_url,
            interests: userData.user_metadata?.interests || [],
            is_active: true,
            oauth_provider: userData.app_metadata?.provider,
            is_guest: userData.app_metadata?.is_guest,
            subscription_type: userData.app_metadata?.subscription_type,
            created_at: userData.created_at,
            user_metadata: userData.user_metadata,
            app_metadata: userData.app_metadata
          });
          
          // Redirect to auth-redirect page after OAuth login
          console.log('AuthContext: OAuth successful, redirecting to auth-redirect');
          redirectBasedOnAuth('auth-redirect?target=home');
        }
      } else {
        console.error('AuthContext: OAuth callback - No session found');
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('AuthContext: OAuth callback error:', error);
      throw error;
    }
  }, [redirectBasedOnAuth]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    authReady,
    login,
    loginWithGoogle,
    logout,
    setUser,
    handleOAuthCallback
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { 
  getCurrentUser, 
  UserProfile, 
  getToken, 
  logout as authLogout, 
  login as authLogin, 
  LoginCredentials, 
  handleOAuthCallback as authHandleOAuthCallback,
  verifyAuthState
} from '../services/auth'; // Adjust path as needed
import { getLocalizedUrl, getCurrentLocale } from '../services/utils'; // Import utility functions
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  handleOAuthCallback: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false); 
  
  useEffect(() => {
    const validateTokenAndFetchUser = async () => {
      console.log('AuthContext: Initializing and validating auth state');
      setIsLoading(true);
      
      try {
        // First verify the auth state to fix any issues
        await verifyAuthState();
        
        const token = getToken();
        if (token) {
          console.log('AuthContext: Token found, fetching user data');
          try {
            const userData = await getCurrentUser();
            if (userData) {
              console.log('AuthContext: User data received, setting state');
              setUser(userData);
            } else {
              console.log('AuthContext: No user data received, clearing auth state');
              // Token might be invalid, clear it
              authLogout(); // Use the original logout to clear token etc.
              setUser(null);
            }
          } catch (error) {
            console.error("AuthContext: Failed to fetch user on initial load:", error);
            authLogout(); // Logout on error
            setUser(null);
          }
        } else {
          console.log('AuthContext: No token found, user not authenticated');
          setUser(null); // No token, not logged in
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
    
    validateTokenAndFetchUser();
  }, []); // Run only once on mount

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    console.log('AuthContext: Login started');
    
    try {
      const tokenData = await authLogin(credentials); // Original login handles token storage
      console.log('AuthContext: Login successful, token received');
      
      // Introduce a small delay to ensure token is properly stored
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('AuthContext: Fetching user data after login');
      const userData = await getCurrentUser(); // Fetch user data after login
      
      if (!userData) {
        console.error('AuthContext: Failed to fetch user data after successful login');
        throw new Error('Login succeeded but could not fetch user data');
      }
      
      console.log('AuthContext: User data received, setting user state');
      setUser(userData);
      
      // Use the window.location for redirect instead of router to ensure page reload
      // This helps establish a fresh state with the auth token
      console.log('AuthContext: Redirecting to dashboard');
      const dashboardUrl = getLocalizedUrl('dashboard');
      console.log('AuthContext: Dashboard URL:', dashboardUrl);
      
      window.location.href = dashboardUrl;
      // Don't use router.push here as it doesn't force a page refresh
      // router.push(getLocalizedUrl('dashboard'));
    } catch (error) {
      console.error("AuthContext: Login failed:", error);
      setUser(null);
      throw error; // Re-throw for the login page to handle
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setIsLoading]); // Removed router dependency since we're using window.location

  // Memoize logout function
  const logout = useCallback(() => {
    authLogout(); // Original logout handles token removal and redirect
    setUser(null);
    // No need to push router here if authLogout handles redirect
  }, []); // Dependencies: setUser (implicitly stable)

   // Memoize handleOAuthCallback function
   const handleOAuthCallback = useCallback(async (token: string) => {
     console.log("AuthContext: handleOAuthCallback started"); // Added log
     authHandleOAuthCallback(token); // Stores the token
     setIsLoading(true);
     
     // Track performance for debugging
     const startTime = performance.now();
     
     try {
       console.log("AuthContext: Calling getCurrentUser..."); // Added log
       const userData = await getCurrentUser(); // Fetch user after getting token
       
       const endTime = performance.now();
       console.log(`AuthContext: getCurrentUser completed in ${endTime - startTime}ms`);
       console.log("AuthContext: getCurrentUser returned:", userData); // Added log
       
       if (!userData) {
         throw new Error('Failed to fetch user data');
       }
       
       setUser(userData);
       
       // Check if user needs setup (no username or interests)
       const isNewUser = userData && (!userData.username || !userData.interests || userData.interests.length === 0);
       
       // Get locale using utility function
       const locale = getCurrentLocale();
       
       // Pre-emptively load any needed imports to reduce waiting time after redirect
       if (isNewUser && typeof window !== 'undefined') {
         // Start the dynamic import early but don't wait for it
         import('../services/auth').catch(e => console.error('Failed to preload auth module:', e));
       }
       
       if (isNewUser) {
         // Set cookies to indicate new user status (using our auth service functions)
         if (typeof window !== 'undefined') {
           try {
             const { setNewUserStatus, setSetupCompleteStatus } = await import('../services/auth');
             setNewUserStatus(true);
             setSetupCompleteStatus(false);
             
             // Redirect to setup page with locale
             console.log("AuthContext: New user detected, redirecting to setup...");
             router.push(getLocalizedUrl('setup'));
           } catch (error) {
             console.error("Failed to set new user status:", error);
             // Fallback to home if setup fails
             router.push(getLocalizedUrl('home'));
           }
         }
       } else {
         // Regular user - redirect to home with locale
         console.log("AuthContext: Redirecting to home...");
         router.push(getLocalizedUrl('home'));
       }
       
       console.log("AuthContext: Redirect initiated.");
     } catch (error) {
       console.error("AuthContext: Failed to fetch user after OAuth:", error); // Added log
       logout(); // Log out if fetching fails (logout is now memoized)
     } finally {
       console.log("AuthContext: handleOAuthCallback finally block"); // Added log
       setIsLoading(false);
     }
   }, [router, logout]); // Dependencies: router, logout (memoized version), setIsLoading, setUser (implicitly stable)


  const value = {
    user,
    isLoading,
    isAuthenticated: !!user, // User is authenticated if user object exists
    authReady,
    login, // Use memoized version
    logout, // Use memoized version
    handleOAuthCallback // Use memoized version
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
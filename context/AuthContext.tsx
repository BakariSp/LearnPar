'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { getCurrentUser, UserProfile, getToken, logout as authLogout, login as authLogin, LoginCredentials, handleOAuthCallback as authHandleOAuthCallback } from '../services/auth'; // Adjust path as needed
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
      setIsLoading(true);
      const token = getToken();
      if (token) {
        try {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
          } else {
            // Token might be invalid, clear it
            authLogout(); // Use the original logout to clear token etc.
            setUser(null);
            // Optionally redirect to login here if needed, though logout might handle it
          }
        } catch (error) {
          console.error("Failed to fetch user on initial load:", error);
          authLogout(); // Logout on error
          setUser(null);
        }
      } else {
        setUser(null); // No token, not logged in
      }
      setIsLoading(false);
      setAuthReady(true);
    };
    validateTokenAndFetchUser();
  }, []); // Run only once on mount

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      await authLogin(credentials); // Original login handles token storage
      const userData = await getCurrentUser(); // Fetch user data after login
      setUser(userData);
      
      // Use utility function to generate localized URL
      router.push(getLocalizedUrl('dashboard'));
    } catch (error) {
      setUser(null);
      // Don't set isLoading false here if error is thrown, let finally handle it if needed
      console.error("Login failed:", error);
      throw error; // Re-throw for the login page to handle
    } finally {
      // Setting loading false here might be okay after redirect starts or error is thrown
      setIsLoading(false);
    }
  }, [router]); // Dependencies: router, setIsLoading, setUser (implicitly stable from useState)

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
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getCurrentUser, UserProfile, getToken, logout as authLogout, login as authLogin, LoginCredentials, handleOAuthCallback as authHandleOAuthCallback } from '../services/auth'; // Adjust path as needed
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
    };
    validateTokenAndFetchUser();
  }, []); // Run only once on mount

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      await authLogin(credentials); // Original login handles token storage
      const userData = await getCurrentUser(); // Fetch user data after login
      setUser(userData);
      router.push('/'); // Redirect after successful login
    } catch (error) {
      setUser(null);
      setIsLoading(false);
      console.error("Login failed:", error);
      throw error; // Re-throw for the login page to handle
    } finally {
       // Set loading false only if login didn't throw (handled in catch)
       // setIsLoading(false); // Might cause flicker if redirect is immediate
    }
  };

  const logout = () => {
    authLogout(); // Original logout handles token removal and redirect
    setUser(null);
    // No need to push router here if authLogout handles redirect
  };

   const handleOAuthCallback = async (token: string) => {
     authHandleOAuthCallback(token); // Stores the token
     setIsLoading(true);
     try {
        const userData = await getCurrentUser(); // Fetch user after getting token
        setUser(userData);
        router.push('/dashboard'); // Redirect to dashboard
     } catch (error) {
        console.error("Failed to fetch user after OAuth:", error);
        logout(); // Log out if fetching fails
     } finally {
        setIsLoading(false);
     }
   };


  const value = {
    user,
    isLoading,
    isAuthenticated: !!user, // User is authenticated if user object exists
    login,
    logout,
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
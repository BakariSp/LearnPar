// components/GuestAndAuthInitializer.tsx
'use client';
import { useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase-browser';

export default function GuestAndAuthInitializer({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        // Create Supabase client
        const supabase = createClient();
        
        // Check for existing session
        const { data } = await supabase.auth.getSession();
        
        // If no session, we could potentially create a guest user here
        // or handle anonymous access

        // Mark as initialized
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        // Still mark as initialized to allow app to proceed
        setIsInitialized(true);
      }
    };
    
    initializeSupabase();
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>; // Or your loading spinner
  }

  return <>{children}</>;
}

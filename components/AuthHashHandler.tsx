'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/services/supabase';

/**
 * Component that handles authentication hash fragments in the URL
 * This is typically used after an OAuth redirect that includes tokens
 */
export default function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Check if the URL has a hash fragment
    if (window.location.hash) {
      const handleHashChange = async () => {
        try {
          // Parse the hash and update the session
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error processing auth response:', error);
            return;
          }

          // Clear the hash from the URL without triggering a reload
          if (window.history.replaceState) {
            // Get the current URL without the hash
            const cleanUrl = window.location.href.split('#')[0];
            window.history.replaceState(null, document.title, cleanUrl);
          }

          // Extract the current locale from the URL
          const pathParts = window.location.pathname.split('/');
          const locale = pathParts.length > 1 && ['en', 'zh'].includes(pathParts[1]) 
            ? pathParts[1] 
            : 'en';

          // If we detect a malformed URL with double locale (e.g., /en/en/dashboard)
          if (pathParts.length > 2 && pathParts[1] === pathParts[2]) {
            const correctPath = window.location.pathname.replace(/^\/([a-z]{2})\/\1\//, '/$1/');
            router.replace(correctPath);
          }
        } catch (err) {
          console.error('Failed to process auth callback:', err);
        }
      };

      // Process the hash
      handleHashChange();
    }
  }, [router]);

  // This component doesn't render anything
  return null;
} 
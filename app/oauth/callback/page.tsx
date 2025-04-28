'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

// New component to handle the logic depending on searchParams
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      handleOAuthCallback(token);
      // Optionally redirect after handling callback, e.g., to dashboard
      // router.push('/dashboard'); 
    } else {
      // Handle error case
      console.error('No token received from OAuth provider');
      router.push('/login?error=oauth_failed');
    }
    // Removed handleOAuthCallback from dependency array if it's stable
    // If handleOAuthCallback might change, ensure it's memoized with useCallback in AuthContext
  }, [searchParams, router, handleOAuthCallback]); 

  // This component doesn't need to return visible UI if the parent handles the loading state
  return null; 
}

export default function OAuthCallbackPage() {
  // The main page component now wraps the logic in Suspense
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Suspense fallback={<p>Processing your login... Please wait.</p>}>
        <OAuthCallbackContent />
      </Suspense>
    </div>
  );
} 
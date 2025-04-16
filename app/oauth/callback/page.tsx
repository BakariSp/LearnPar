'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleOAuthCallback } from '../../../services/auth';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      handleOAuthCallback(token);
      // Redirect to dashboard instead of home page
      router.push('/dashboard');
    } else {
      // Handle error case
      console.error('No token received from OAuth provider');
      router.push('/login?error=oauth_failed');
    }
  }, [router, searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <p>Processing your login... Please wait.</p>
    </div>
  );
} 
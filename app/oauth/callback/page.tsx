'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      handleOAuthCallback(token);
    } else {
      // Handle error case
      console.error('No token received from OAuth provider');
      router.push('/login?error=oauth_failed');
    }
  }, [searchParams, handleOAuthCallback]);

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
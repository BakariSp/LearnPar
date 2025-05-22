'use client';
import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getLocalizedUrl } from '../../../services/utils';

export default function AuthRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale as string || 'en';
  const { isAuthenticated, authReady } = useAuth();
  
  // Target page from query params or default to home
  const targetPage = searchParams?.get('target') || 'home';

  useEffect(() => {
    console.log('Auth Redirect: Page loaded, checking auth state');

    if (authReady) {
      if (isAuthenticated) {
        console.log(`Auth Redirect: User is authenticated, redirecting to ${targetPage}`);
        
        // Use direct window location change for maximum reliability
        window.location.href = `/${locale}/${targetPage}`;
      } else {
        console.log('Auth Redirect: User is not authenticated, redirecting to login');
        router.replace(`/${locale}/login`);
      }
    }
  }, [authReady, isAuthenticated, router, locale, targetPage]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p>Redirecting...</p>
    </div>
  );
} 
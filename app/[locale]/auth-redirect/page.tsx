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
  const { isAuthenticated, authReady, user } = useAuth();
  
  // Target page from query params or default to home
  const targetPage = searchParams?.get('target') || 'home';

  useEffect(() => {
    console.log('[Auth Redirect Debug] Page loaded, checking auth state');

    if (authReady) {
      if (isAuthenticated) {
        console.log(`[Auth Redirect Debug] User is authenticated, redirecting to ${targetPage}`);
        
        // 检查是否是游客账号
        const isGuest = user?.app_metadata?.is_guest || user?.user_metadata?.is_guest;
        
        if (isGuest) {
          console.log('[Auth Redirect Debug] Guest account detected, staying on current page');
          return;
        }
        
        // 检查用户是否完成设置
        const hasUsername = !!user?.username;
        const hasInterests = user?.interests && user.interests.length > 0;
        
        if (!hasUsername) {
          console.log('[Auth Redirect Debug] User needs setup, redirecting to setup page');
          window.location.href = `/${locale}/setup`;
        } else if (hasInterests) {
          console.log('[Auth Redirect Debug] User has interests, redirecting to dashboard');
          window.location.href = `/${locale}/dashboard`;
        } else {
          console.log('[Auth Redirect Debug] User needs to set interests, redirecting to home');
          window.location.href = `/${locale}/home`;
        }
      } else {
        console.log('[Auth Redirect Debug] User is not authenticated, redirecting to login');
        router.replace(`/${locale}/login`);
      }
    }
  }, [authReady, isAuthenticated, router, locale, targetPage, user]);

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
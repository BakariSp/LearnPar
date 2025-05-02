'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
// import { useTranslation } from 'react-i18next'; // Keep commented out for now

// Component that handles the actual OAuth callback logic
function OAuthCallbackHandler({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
      setError('Search parameters are not available');
      return;
    }
    
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      console.error('OAuth callback timeout - redirecting to login');
      setError('Authentication timeout. Please try logging in again.');
      setTimeout(() => {
        router.push(`/${locale}/login?error=timeout`);
      }, 2000);
    }, 15000); // 15 seconds timeout

    const processAuth = async () => {
      try {
        if (token) {
          await handleOAuthCallback(token);
          // Don't need to redirect here as AuthContext will handle it
        } else if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(`Authentication error: ${errorParam}`);
          setTimeout(() => {
            router.push(`/${locale}/login?error=${errorParam}&error_description=${encodeURIComponent(errorDescription || '')}`);
          }, 2000);
        } else {
          console.error('No token received from OAuth provider');
          setError('No authentication token received');
          setTimeout(() => {
            router.push(`/${locale}/login?error=oauth_failed`);
          }, 2000);
        }
      } catch (err) {
        console.error('Error during OAuth callback processing:', err);
        setError('Authentication process failed');
        setTimeout(() => {
          router.push(`/${locale}/login?error=process_failed`);
        }, 2000);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    processAuth();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, router, handleOAuthCallback, locale]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="mb-4 text-red-600">{error}</div>
        <div>Redirecting to login page...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center" style={{ backgroundColor: 'transparent' }}>
      <div className="mb-4">Processing your authentication...</div>
      <div className="relative w-16 h-16">
        <div className="absolute top-0 w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
      </div>
    </div>
  );
}

// Client component wrapper
export default function OAuthCallbackClient({ locale }: { locale: string }) {
  // const { t } = useTranslation('common');

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="p-8" style={{ backgroundColor: 'transparent' }}>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4">Loading authentication handler...</div>
            <div className="relative w-16 h-16">
              <div className="absolute top-0 w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
            </div>
          </div>
        }>
          <OAuthCallbackHandler locale={locale} />
        </Suspense>
      </div>
    </div>
  );
} 
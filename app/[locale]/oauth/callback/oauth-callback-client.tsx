'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useEffect } from 'react';
// import { useTranslation } from 'react-i18next'; // Keep commented out for now

// Component that handles the actual OAuth callback logic
function OAuthCallbackHandler({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (token) {
      handleOAuthCallback(token);
      router.push(`/${locale}/`);
    } else if (error) {
      console.error('OAuth error:', error, errorDescription);
      router.push(`/${locale}/login?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`);
    } else {
      console.error('No token received from OAuth provider');
      router.push(`/${locale}/login?error=oauth_failed`);
    }
  }, [searchParams, router, handleOAuthCallback, locale]);

  return null;
}

// Client component wrapper
export default function OAuthCallbackClient({ locale }: { locale: string }) {
  // const { t } = useTranslation('common');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      {/* <Suspense fallback={<p>{t('oauth.processing')}</p>}> */}
      <Suspense fallback={<p>Processing...</p>}>
        <OAuthCallbackHandler locale={locale} />
      </Suspense>
    </div>
  );
} 
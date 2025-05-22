'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams();

  // Try to automatically fix URL issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for double locale issues
      const path = window.location.pathname;
      const pathParts = path.split('/').filter(Boolean);
      
      if (pathParts.length >= 2 && pathParts[0] === pathParts[1]) {
        // Fix the URL by removing the duplicate locale
        const correctedPath = path.replace(/^\/([a-z]{2})\/\1\//, '/$1/');
        window.location.replace(correctedPath);
      }
      
      // Check if we have an access_token in the URL hash
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log('Found access_token in URL hash, handling authentication');
        // This might be a Supabase OAuth callback - process it
        import('@/services/supabase').then(({ supabase }) => {
          supabase.auth.getSession().then(({ data, error }) => {
            if (!error && data.session) {
              // Clean up the URL and redirect to dashboard
              const cleanUrl = window.location.pathname.split('#')[0];
              window.location.replace(`/${locale}/dashboard`);
            }
          });
        });
      }
    }
  }, [locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again or go back to the home page.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors mr-4"
          >
            Try again
          </button>
          
          <Link 
            href={`/${locale}`} 
            className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
} 
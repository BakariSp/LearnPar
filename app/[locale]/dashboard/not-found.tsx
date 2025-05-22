'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardNotFound() {
  const { locale } = useParams();
  const { isAuthenticated } = useAuth();

  // If we hit this page due to a bad redirect from OAuth flow,
  // let's try to automatically fix it by checking for URL issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Look for malformed URLs with double locales (like /en/en/dashboard)
      const path = window.location.pathname;
      const pathParts = path.split('/').filter(Boolean);
      
      if (pathParts.length >= 2 && pathParts[0] === pathParts[1]) {
        // Fix the URL by removing the duplicate locale
        const correctedPath = path.replace(/^\/([a-z]{2})\/\1\//, '/$1/');
        window.location.replace(correctedPath);
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The dashboard page you're looking for doesn't exist or you may not have access to it.
        </p>
        
        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              You are logged in. Let's get you back to a working page.
            </p>
            <Link 
              href={`/${locale}/dashboard`} 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              You might need to log in to access this page.
            </p>
            <Link 
              href={`/${locale}/login`} 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 
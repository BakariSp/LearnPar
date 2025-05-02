'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getSetupCompleteStatus } from '@/services/auth';

interface SetupLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default function SetupLayout({ children }: Omit<SetupLayoutProps, 'params'>) {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  // Check both the user object and the setup complete cookie status
  useEffect(() => {
    // Get the setup complete status from cookies
    const setupComplete = getSetupCompleteStatus();
    setIsSetupComplete(setupComplete);
  }, []);

  // If user has completed setup (either via user object or cookie), redirect them to home
  if (!isLoading && 
      ((user && user.username && user.interests && user.interests.length > 0) || isSetupComplete)) {
    redirect(`/${locale}/home`);
  }

  return (
    <div className="full-page-container">
      {children}
    </div>
  );
} 
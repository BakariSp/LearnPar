'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';

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

  // If user has completed setup, redirect them to home
  if (!isLoading && user && user.username && user.interests && user.interests.length > 0) {
    redirect(`/${locale}/home`);
  }

  return (
    <div className="full-page-container">
      {children}
    </div>
  );
} 
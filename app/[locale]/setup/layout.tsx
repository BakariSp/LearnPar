'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { redirect } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getSetupCompleteStatus, getCurrentUser } from '@/services/auth';

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
  
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        // 1. 检查 setup_complete cookie
        const setupComplete = getSetupCompleteStatus();
        if (setupComplete) {
          setIsSetupComplete(true);
          return;
        }

        // 2. 检查数据库中的用户信息
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.username) {
          // 如果用户已经设置了用户名，说明已经完成设置
          setIsSetupComplete(true);
          return;
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      }
    };

    checkSetupStatus();
  }, []);

  // 如果设置已完成，重定向到首页
  if (!isLoading && isSetupComplete) {
    redirect(`/${locale}/home`);
  }

  return (
    <div className="full-page-container">
      {children}
    </div>
  );
} 
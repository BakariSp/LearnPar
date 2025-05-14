'use client';

import '../i18n/client.ts';

import { useState, ReactNode, useEffect } from 'react';
import { Sidebar } from "./Sidebar/Sidebar";
import { LoginModal } from './LoginModal';
import { useAuth } from '../context/AuthContext';
import { useParams, usePathname } from 'next/navigation';

interface LayoutClientWrapperProps {
  children: ReactNode;
}

export function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';

  // Effect to automatically collapse sidebar on learning path detail pages or when screen is small
  useEffect(() => {
    // Check if the current page is a learning path detail page
    const isLearningPathDetailPage = pathname?.includes('/learning-paths/') && !pathname?.endsWith('/learning-paths/');
    
    // Check if the screen width is below the threshold (e.g., 1400px)
    const isSmallScreen = window.innerWidth < 1400;
    
    // Auto-collapse sidebar if on learning path detail page or screen is small
    if (isLearningPathDetailPage || isSmallScreen) {
      setIsSidebarCollapsed(true);
    }
    
    // Add window resize listener to collapse/expand based on screen size
    const handleResize = () => {
      if (window.innerWidth < 1400) {
        setIsSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [pathname]);

  const toggleSidebar = () => {
    console.log("Toggling sidebar, current state:", isSidebarCollapsed);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const getMarginLeft = () => {
    if (!user) return '0px';
    return isSidebarCollapsed ? '80px' : '250px';
  };

  // Dynamic padding calculation based on screen size
  const getContentPadding = () => {
    // For extra small screens (mobile)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'p-2';
    }
    // For medium screens
    else if (typeof window !== 'undefined' && window.innerWidth < 1200) {
      return 'p-3 md:p-4';
    }
    // For large screens
    return 'p-4 md:p-6';
  };

  return (
    <>
      {user && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} locale={locale as string} />}

      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: getMarginLeft(),
          backgroundColor: '#f5f5f5' 
        }}
      >
        <div className={`flex-1 overflow-y-auto ${getContentPadding()}`}>
          {children}
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

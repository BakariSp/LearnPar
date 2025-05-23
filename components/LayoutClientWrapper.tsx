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
  const [contentPadding, setContentPadding] = useState('p-4 md:p-6');
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
    
    // Check if the current path is /{locale}
    const isLocaleHomePage = pathname?.match(/^\/[a-z]{2}$/);
    
    // Auto-collapse sidebar if on learning path detail page, screen is small, or on locale home page
    if (isLearningPathDetailPage || isSmallScreen || isLocaleHomePage) {
      setIsSidebarCollapsed(true);
    }
    
    // Add window resize listener to collapse/expand based on screen size
    const handleResize = () => {
      if (window.innerWidth < 1400 || isLocaleHomePage) {
        setIsSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [pathname]);

     // Dynamic padding calculation based on screen size
  useEffect(() => {
    const width = window.innerWidth;
    if (width < 768) {
      setContentPadding('p-2');
    } else if (width < 1200) {
      setContentPadding('p-3 md:p-4');
    } else {
      setContentPadding('p-4 md:p-6');
    }
  }, []);

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



  return (
    <>
      {user && !pathname?.match(/^\/[a-z]{2}$/) && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} locale={locale as string} />}

      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: pathname?.match(/^\/[a-z]{2}$/) ? '0px' : getMarginLeft(),
          backgroundColor: '#f5f5f5' 
        }}
      >
        <div className={`flex-1 overflow-y-auto ${contentPadding}`}>
          {children}
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

'use client';

import '../i18n/client.ts';

import { useState, ReactNode } from 'react';
import { Sidebar } from "./Sidebar/Sidebar";
import { LoginModal } from './LoginModal';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'next/navigation';

interface LayoutClientWrapperProps {
  children: ReactNode;
}

export function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user } = useAuth();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;

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
      {user && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} locale={locale as string} />}

      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: getMarginLeft(),
          backgroundColor: '#f5f5f5' 
        }}
      >
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

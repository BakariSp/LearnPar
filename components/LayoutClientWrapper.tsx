'use client';

import { useState, ReactNode } from 'react';
import { Sidebar } from "./Sidebar/Sidebar"; // Adjust path if needed
import { LoginModal } from './LoginModal'; // Import the modal
import { useAuth } from '../context/AuthContext'; // Import useAuth
import Link from 'next/link';
// import styles from '../app/landing-page/landing-page.module.css'; // Removed unused import
import { TopNavBar } from './TopNavBar/top-nav-bar'; // Import the new TopNavBar component

interface LayoutClientWrapperProps {
  children: ReactNode;
}

export function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // State for login modal
  const { user, logout } = useAuth(); // Get user and logout function

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  // Adjust margin based on sidebar state *and* whether the user is logged in (sidebar shown)
  const getMarginLeft = () => {
    if (!user) return '0px'; // No sidebar, no margin
    return isSidebarCollapsed ? '80px' : '250px';
  };

  return (
    <>
      {/* Conditionally render Sidebar only if logged in */}
      {user && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />}

      {/* Main content area */}
      <div
        className="flex flex-1 flex-col overflow-hidden bg-[var(--background-color)] dark:bg-[var(--background)] transition-all duration-300 ease-in-out"
        style={{ marginLeft: getMarginLeft() }} // Use dynamic margin
      >
        {/* Use the new TopNavBar component */}
        <TopNavBar />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
} 
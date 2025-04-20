'use client';

import { useState, ReactNode } from 'react';
import { Sidebar } from "./Sidebar/Sidebar"; // Adjust path if needed

interface LayoutClientWrapperProps {
  children: ReactNode;
}

export function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Calculate margin value based on state
  const marginLeftValue = isSidebarCollapsed ? '80px' : '250px';

  return (
    <>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      {/* Apply margin using inline style */}
      <div
        className="flex flex-1 flex-col overflow-hidden bg-gray-50 transition-all duration-300 ease-in-out" // Removed ml-* classes
        style={{ marginLeft: marginLeftValue }} // Added inline style
      >
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </div>
    </>
  );
} 
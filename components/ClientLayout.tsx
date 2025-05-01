'use client'; // This component handles client-side logic

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext'; // Adjust path if needed
import { NotificationProvider } from '@/context/NotificationContext'; // Add NotificationProvider
import { LayoutClientWrapper } from '@/components/LayoutClientWrapper'; // Adjust path if needed

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // --- Theme Handling Logic ---
  // You might have more sophisticated logic here using a context or library
  useEffect(() => {
    // Example: Apply theme based on localStorage or system preference after mount
    const preferredTheme = localStorage.getItem('theme') || 'light'; // Or check system preference
    document.documentElement.setAttribute('data-theme', preferredTheme);
    document.documentElement.style.colorScheme = preferredTheme;
    // If you use a state variable for the theme, update it here as well
  }, []);

  return (
    // Apply layout structure styles here (previously on body)
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <AuthProvider>
        <NotificationProvider>
          <LayoutClientWrapper>
            {children}
          </LayoutClientWrapper>
        </NotificationProvider>
      </AuthProvider>
    </div>
  );
} 
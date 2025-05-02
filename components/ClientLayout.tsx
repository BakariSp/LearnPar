'use client'; // This component handles client-side logic

import { AuthProvider } from '@/context/AuthContext'; // Adjust path if needed
import { NotificationProvider } from '@/context/NotificationContext'; // Add NotificationProvider
import { LayoutClientWrapper } from '@/components/LayoutClientWrapper'; // Adjust path if needed

export function ClientLayout({ children }: { children: React.ReactNode }) {
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
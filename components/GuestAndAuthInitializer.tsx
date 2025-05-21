// components/GuestAndAuthInitializer.tsx
'use client';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';

export default function GuestAndAuthInitializer({ children }: { children: ReactNode }) {
  const isGuestReady = useGuestAuth(); // 会确保 token 写入 localStorage 并设置 axios

  if (!isGuestReady) {
    return <div>Loading...</div>; // 或者你的 loading spinner
  }

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

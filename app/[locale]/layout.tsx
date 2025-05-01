import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { AuthProvider } from '../../context/AuthContext';
import { LayoutClientWrapper } from '../../components/LayoutClientWrapper';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/context/ToastContext';
import I18nInitializer from '../../components/I18nInitializer';
export const metadata: Metadata = {
  title: "Learning Platform",
  description: "Your personalized learning journey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased flex h-screen overflow-hidden bg-gray-100`}
        suppressHydrationWarning
      >
        <I18nInitializer />
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <LayoutClientWrapper>
                {children}
              </LayoutClientWrapper>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

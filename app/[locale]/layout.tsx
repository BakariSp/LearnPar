import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { AuthProvider } from '../../context/AuthContext';
import { LayoutClientWrapper } from '../../components/LayoutClientWrapper';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/context/ToastContext';
import I18nInitializer from '../../components/I18nInitializer';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: "Zero AI",
  description: "Your personalized learning journey",
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Zero AI',
    description: 'Your personalized learning journey',
    type: 'website',
    images: [
      {
        url: '/logo.svg',
        width: 48,
        height: 48,
        alt: 'Zero AI Logo',
      }
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
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
        <Analytics />
      </body>
    </html>
  );
}

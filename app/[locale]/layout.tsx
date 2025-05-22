import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import "../../styles/responsive-fixes.css";
import { AuthProvider } from '../../context/AuthContext';
import { LayoutClientWrapper } from '../../components/LayoutClientWrapper';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import I18nInitializer from '../../components/I18nInitializer';
import { Analytics } from '@vercel/analytics/react';
import JsonLd from '@/components/JsonLd';
import GuestAndAuthInitializer from '@/components/GuestAndAuthInitializer';
import AuthHashHandler from '@/components/AuthHashHandler';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'),
  title: {
    default: "Zero AI - Your Personalized Learning Journey",
    template: "%s | Zero AI"
  },
  description: "Zero AI helps you create a personalized learning journey with AI-powered recommendations and interactive learning paths.",
  keywords: ["artificial intelligence", "learning platform", "personalized learning", "AI education", "online courses"],
  authors: [{ name: "Zero AI Team" }],
  category: "Education",
  creator: "Zero AI",
  publisher: "Zero AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
    other: {
      rel: 'apple-touch-icon',
      url: '/logo.svg',
    },
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['zh_CN'],
    title: 'Zero AI - Your Personalized Learning Journey',
    description: 'Zero AI helps you create a personalized learning journey with AI-powered recommendations and interactive learning paths.',
    siteName: 'Zero AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zero AI Platform Preview',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zero AI - Your Personalized Learning Journey',
    description: 'Zero AI helps you create a personalized learning journey with AI-powered recommendations and interactive learning paths.',
    images: ['/twitter-image.png'],
    creator: '@zeroaiplatform',
    site: '@zeroaiplatform',
  },
  verification: {
    google: 'google-site-verification-code', // Replace with actual code when available
  },
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
      'zh-CN': '/zh',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Await params before accessing its properties
  const resolvedParams = await params;
  const lang = resolvedParams?.locale || 'en';
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  return (
    <html lang={lang} className="h-full" suppressHydrationWarning>
      <head>
        <JsonLd 
          type="Organization" 
          data={{
            name: "Zero AI",
            url: baseUrl,
            logo: `${baseUrl}/logo.svg`,
            sameAs: [
              "https://twitter.com/zeroaiplatform",
              "https://www.linkedin.com/company/zeroai"
            ]
          }} 
        />
        <JsonLd 
          type="Website" 
          data={{
            name: "Zero AI Learning Platform",
            url: baseUrl,
            description: "Zero AI helps you create a personalized learning journey with AI-powered recommendations and interactive learning paths.",
            language: lang
          }} 
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased flex h-screen overflow-hidden bg-gray-100`}
        suppressHydrationWarning
      >
        <I18nInitializer />
        <ThemeProvider>
          <GuestAndAuthInitializer>
            <AuthProvider>
              <AuthHashHandler />
              <NotificationProvider>
                <ToastProvider>
                  <LayoutClientWrapper>
                    <main id="main-content">{children}</main>
                  </LayoutClientWrapper>
                </ToastProvider>
              </NotificationProvider>
            </AuthProvider>
          </GuestAndAuthInitializer>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { AuthProvider } from '../context/AuthContext';
import { LayoutClientWrapper } from '../components/LayoutClientWrapper';

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
    <html lang="en" className="h-full">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased flex h-screen overflow-hidden bg-gray-100`}
      >
        <AuthProvider>
          <LayoutClientWrapper>
            {children}
          </LayoutClientWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

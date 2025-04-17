import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { AuthProvider } from '../context/AuthContext';

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
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

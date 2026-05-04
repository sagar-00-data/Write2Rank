'use client';
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useState, useEffect } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Set initial state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Set initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isReady && pathname !== '/login' && pathname !== '/onboarding') {
    return <html lang="en"><body className={`${inter.variable}`}><div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div></body></html>;
  }

  const isAuthPage = pathname === '/login' || pathname === '/onboarding';

  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        {isAuthPage ? (
          children
        ) : (
          <div className={`app-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            {/* Mobile Overlay */}
            <div 
              className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
              onClick={() => setIsSidebarOpen(false)}
            />

            <main className="main-content">
              <Topbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
              <div className="page-content-wrapper">
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}

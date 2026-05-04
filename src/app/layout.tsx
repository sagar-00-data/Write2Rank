'use client';
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auth & Onboarding Logic
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('w2r_session') || 'null');
    const isAuthPage = pathname === '/login' || pathname === '/onboarding';

    if (!session && !isAuthPage) {
      router.push('/login');
    } else if (session?.isNew && pathname !== '/onboarding') {
      router.push('/onboarding');
    } else if (session && !session.isNew && pathname === '/login') {
      router.push('/');
    }
    
    setIsReady(true);
  }, [pathname, router]);

  // Set initial state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAuthPage = pathname === '/login' || pathname === '/onboarding';

  // Prevent flicker during auth check
  if (!isReady && !isAuthPage) {
    return (
      <html lang="en">
        <body className={inter.variable}>
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
            <div className="sidebar-logo animate-pulse">W2R</div>
          </div>
        </body>
      </html>
    );
  }

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

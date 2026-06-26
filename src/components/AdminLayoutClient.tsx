'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  TrendingUp, 
  Binary, 
  Database, 
  Cpu, 
  Heart, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Evaluations', href: '/admin/evaluations', icon: FileText },
    { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
    { name: 'OCR Details', href: '/admin/dashboard#ocr', icon: Binary },
    { name: 'RAG Knowledge', href: '/admin/dashboard#rag', icon: Database },
    { name: 'API Cost & Usage', href: '/admin/dashboard#api-usage', icon: Cpu },
    { name: 'System Health', href: '/admin/settings#health', icon: Heart },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch('/admin/api/logout', { method: 'POST' });
      if (res.ok) {
        router.refresh();
        router.push('/admin');
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 flex-shrink-0">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-800 bg-gray-900/50">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg text-white tracking-tight">Founder Admin</span>
          <span className="bg-indigo-900/60 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-mono">MVP</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href.includes('#') && pathname === '/admin/dashboard' && item.href.startsWith('/admin/dashboard#'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800 bg-gray-900/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-900/60 text-red-300 hover:text-red-200 text-sm font-semibold rounded-lg transition duration-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-gray-900 flex flex-col h-full shadow-2xl relative animate-in slide-in-from-left duration-250">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-white">Founder Admin</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-300 text-sm font-semibold rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header for Mobile */}
        <header className="lg:hidden h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-white">Founder Admin</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 bg-gray-800 text-gray-300 rounded-lg hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}

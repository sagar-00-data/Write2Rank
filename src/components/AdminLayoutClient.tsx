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
  Activity
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
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#0a0a0a] border-r border-white/5 flex-shrink-0 relative z-20">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/5">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shadow-inner">
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="font-semibold text-[15px] text-white tracking-tight">Founder Admin</span>
          <span className="ml-auto bg-white/5 border border-white/10 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">MVP</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href.includes('#') && pathname === '/admin/dashboard' && item.href.startsWith('/admin/dashboard#'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.05)]' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-500 hover:text-red-400 text-sm font-medium rounded-xl transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-[#050505]/80 backdrop-blur-md">
          <div className="w-[260px] bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full shadow-2xl relative animate-in slide-in-from-left duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Activity className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="font-semibold text-[15px] text-white">Founder</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 text-sm font-medium rounded-xl transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header for Mobile */}
        <header className="lg:hidden h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-30 flex-shrink-0 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Activity className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="font-semibold text-[15px] text-white">Founder</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 bg-white/5 border border-white/5 text-zinc-400 rounded-xl hover:text-white hover:bg-white/10 transition-all">
            <Menu className="h-4 w-4" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#050505] custom-scrollbar">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

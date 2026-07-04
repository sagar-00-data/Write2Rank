'use client';
import { useState, useEffect } from 'react';
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
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncTime, setSyncTime] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSyncTime(new Date().toLocaleTimeString());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const menuItems = [
    { name: 'Dashboard', href: '/founder/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/founder/users', icon: Users },
    { name: 'Evaluations', href: '/founder/evaluations', icon: FileText },
    { name: 'Analytics', href: '/founder/analytics', icon: TrendingUp },
    { name: 'OCR Details', href: '/founder/ocr', icon: Binary },
    { name: 'RAG Knowledge', href: '/founder/rag', icon: Database },
    { name: 'API Cost & Usage', href: '/founder/ai-cost', icon: Cpu },
    { name: 'System Health', href: '/founder/system-health', icon: Heart },
    { name: 'Settings', href: '/founder/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch('/founder/api/logout', { method: 'POST' });
      if (res.ok) {
        router.refresh();
        router.push('/founder');
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    // Reload active page data
    router.refresh();
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSyncTime(new Date().toLocaleTimeString());
    setSyncing(false);
  };

  const getHeaderMeta = () => {
    const defaultMeta = { title: 'Founder Console', desc: 'Secure operational command panel.' };
    if (!pathname) return defaultMeta;
    
    if (pathname.startsWith('/founder/dashboard')) {
      return { title: 'Dashboard', desc: 'Executive overview of the platform.' };
    } else if (pathname.startsWith('/founder/users')) {
      return { title: 'Users', desc: 'Manage platform users and subscriptions.' };
    } else if (pathname.startsWith('/founder/evaluations')) {
      return { title: 'Evaluations', desc: 'Monitor answer evaluations and AI performance.' };
    } else if (pathname.startsWith('/founder/analytics')) {
      return { title: 'Analytics', desc: 'Business intelligence and platform insights.' };
    } else if (pathname.startsWith('/founder/settings')) {
      return { title: 'Settings', desc: 'Platform configuration and preferences.' };
    } else if (pathname.startsWith('/founder/ocr')) {
      return { title: 'OCR Engine Analytics', desc: 'Monitor handwritten text recognition and limits.' };
    } else if (pathname.startsWith('/founder/rag')) {
      return { title: 'RAG Knowledge', desc: 'Explore vector embeddings and custom database reference docs.' };
    } else if (pathname.startsWith('/founder/ai-cost')) {
      return { title: 'API Cost & Usage', desc: 'Track token usage and estimated Gemini costs.' };
    } else if (pathname.startsWith('/founder/system-health')) {
      return { title: 'System Health & Diagnosis', desc: 'Run real-time API connection tests.' };
    }
    return defaultMeta;
  };

  const meta = getHeaderMeta();

  return (
    <div className="min-h-screen bg-[#06080c] text-zinc-100 flex font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <style>{GLOBAL_THEME_CSS}</style>

      {/* Sidebar for Desktop (Traditional sidebar on left) */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#090d16]/95 backdrop-blur-md border-r border-white/[0.04] flex-shrink-0 relative z-20">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/[0.04]">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shadow-inner">
            <Activity className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="font-semibold text-[14px] text-white tracking-tight">Founder Admin</span>
          <span className="ml-auto bg-white/5 border border-white/10 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">MVP</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href.includes('#') && pathname === '/founder/dashboard' && item.href.startsWith('/founder/dashboard#'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.03)]' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/[0.04]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-zinc-500 hover:text-red-400 text-xs font-semibold rounded-xl transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-[#06080c]/80 backdrop-blur-md">
          <div className="w-[260px] bg-[#090d16] border-r border-white/[0.04] flex flex-col h-full shadow-2xl relative animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Activity className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="font-semibold text-[14px] text-white">Founder</span>
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                      isActive 
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                        : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/[0.04]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 text-xs font-semibold rounded-xl transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Unified Top Navigation Bar (Shared across every page) */}
        <header className="h-16 bg-[#090d16]/75 backdrop-blur-md border-b border-white/[0.04] flex items-center justify-between px-6 lg:px-8 z-30 flex-shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="lg:hidden flex items-center gap-2">
              <button onClick={() => setMobileOpen(true)} className="p-1.5 bg-white/5 border border-white/5 text-zinc-400 rounded-lg hover:text-white hover:bg-white/10 transition-all">
                <Menu className="h-4 w-4" />
              </button>
            </div>
            
            {/* Desktop Brand Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs font-medium">
              <span className="text-zinc-500">Xaminix</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400 font-semibold">Founder Command Center</span>
            </div>
          </div>

          {/* Unified Right Top-Nav Controls */}
          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="hidden md:flex items-center gap-3">
              <span className="fd-status-pill green">
                <span className="fd-status-dot" />
                Production
              </span>
              <span className="fd-status-pill blue">
                <ShieldCheck className="h-3 w-3" />
                Secure Session
              </span>
            </div>

            {/* Logout on top header */}
            <button 
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-[#090d16] hover:bg-[#0d1220] border border-white/[0.05] rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto bg-[#06080c] custom-scrollbar">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
            
            {/* Unified Page Header Component */}
            <div className="fd-page-header flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/[0.04] pb-6 gap-4">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  {meta.title}
                </h1>
                <p className="text-zinc-400 text-xs mt-1.5 font-medium leading-relaxed">{meta.desc}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Sync status info */}
                <div className="flex flex-col items-end text-[10px] text-zinc-500 font-medium font-mono hidden sm:flex">
                  <span>LAST SYNC: {syncTime || 'FETCHING...'}</span>
                  <span>STATUS: SECURED</span>
                </div>

                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="fd-btn-secondary"
                  style={{ minWidth: 100 }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Actual Route Page Child Content */}
            <div className="route-content-container animate-fade-in">
              {children}
            </div>

            {/* Unified Operations Footer */}
            <footer className="pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-2 pb-8">
              <span className="text-[10px] text-zinc-500 font-medium">
                Xaminix Founder Command Center · Production Operations Console
              </span>
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-zinc-600" />
                SYSTEM SECURED AT {syncTime}
              </span>
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UNIFIED GLOBAL THEME DESIGN SYSTEM STYLES
// ─────────────────────────────────────────────────────────────
const GLOBAL_THEME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 99px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  /* Global components design alignment */
  .fd-card {
    background: linear-gradient(180deg, #090d16 0%, #070a10 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    padding: 24px;
    transition: border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fd-hover {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
  }
  .fd-hover:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
  }

  /* Status badging */
  .fd-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .fd-status-pill.green {
    color: #34d399;
    background: rgba(52, 211, 153, 0.06);
    border: 1px solid rgba(52, 211, 153, 0.15);
  }
  .fd-status-pill.blue {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.06);
    border: 1px solid rgba(96, 165, 250, 0.15);
  }
  .fd-status-pill.purple {
    color: #c084fc;
    background: rgba(192, 132, 252, 0.06);
    border: 1px solid rgba(192, 132, 252, 0.15);
  }
  .fd-status-pill.amber {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.15);
  }
  .fd-status-pill.red {
    color: #f87171;
    background: rgba(248, 113, 113, 0.06);
    border: 1px solid rgba(248, 113, 113, 0.15);
  }

  .fd-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: currentColor;
    display: inline-block;
  }

  /* Buttons */
  .fd-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    background: #4f46e5;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .fd-btn-primary:hover {
    background-color: #4338ca;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  }

  .fd-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #090d16;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background-color 0.2s;
  }
  .fd-btn-secondary:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    background-color: #0d1220;
  }
  .fd-btn-secondary:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* Tables styling consistency */
  .fd-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    background-color: rgba(9, 13, 22, 0.4);
  }
  .fd-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  .fd-table-header {
    background-color: rgba(255, 255, 255, 0.01);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .fd-table-header th {
    padding: 14px 20px;
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .fd-table-row {
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background-color 0.15s ease;
  }
  .fd-table-row:hover {
    background-color: rgba(255, 255, 255, 0.015) !important;
  }
  .fd-table-row td {
    padding: 16px 20px;
    font-size: 12px;
    color: #cbd5e1;
  }

  /* Forms and Inputs */
  .fd-input {
    width: 100%;
    background-color: #05070a;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    color: #f1f5f9;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .fd-input:focus {
    border-color: rgba(79, 70, 229, 0.4);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  /* Skeletons */
  .fd-skeleton {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 75%);
    background-size: 200% 100%;
    animation: fd-shimmer 1.8s ease-in-out infinite;
    border-radius: 12px;
  }
  @keyframes fd-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Page Entrance animations */
  .animate-fade-in {
    animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

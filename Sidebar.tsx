'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, HelpCircle, BarChart2, X, LogOut, Plus } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Evaluations', path: '/evaluations', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo">W2R</div>
          <div className="sidebar-title">Write2Rank</div>
        </div>
        <button className="mobile-close" onClick={() => setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-action">
        <Link href="/evaluations/new" onClick={() => window.innerWidth < 1024 && setIsOpen(false)}>
          <button className="btn sidebar-btn">
            <Plus size={18} />
            <span className="btn-text">New Evaluation</span>
          </button>
        </Link>
      </div>

      <div className="sidebar-nav">
        <div className="nav-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/');
            return (
              <Link 
                href={item.path} 
                key={item.path} 
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
              >
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={18} />
                  <span className="nav-text">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
        
        <button 
          onClick={() => {
            localStorage.removeItem('w2r_user');
            window.location.href = '/login';
          }}
          className="nav-item logout-btn"
        >
          <LogOut size={18} />
          <span className="nav-text">Logout</span>
        </button>
      </div>
    </aside>
  );
}

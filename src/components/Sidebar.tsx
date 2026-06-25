'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, HelpCircle, BarChart2, X, Plus } from 'lucide-react';
import Logo from './Logo';

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

  // Helper to close sidebar on mobile after clicking a link
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
          <div className="sidebar-title">Write2Rank</div>
        </div>
        <button className="mobile-close" onClick={() => setIsOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-action">
        <Link href="/evaluations/new" onClick={handleNavClick}>
          <button className="btn sidebar-btn">
            <Plus size={18} />
            <span>New Evaluation</span>
          </button>
        </Link>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/');
            return (
              <Link 
                href={item.path} 
                key={item.path} 
                onClick={handleNavClick}
              >
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}


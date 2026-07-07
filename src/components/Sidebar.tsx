'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, HelpCircle, BarChart2, X, Plus, MessageSquare } from 'lucide-react';
import Logo from './Logo';
import { trackAnalyticsEvent } from '@/lib/analytics';

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

  const handleFeedbackClick = () => {
    trackAnalyticsEvent('dashboard_feedback_clicked');
    window.open('https://forms.gle/rnpjFmw6dorfXAJc6', '_blank');
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
          <div className="sidebar-title">Xaminix</div>
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
        <div className="nav-group" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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

          <button 
            onClick={handleFeedbackClick}
            className="nav-item feedback-nav-item"
            style={{ 
              marginTop: 'auto', 
              color: '#ffffff',
              background: '#2563eb',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              transition: 'background-color 0.2s, box-shadow 0.2s',
              fontWeight: 600,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.15)';
            }}
          >
            <MessageSquare size={20} />
            <span>📝 Share Feedback</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}


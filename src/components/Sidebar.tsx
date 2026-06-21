'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, HelpCircle, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Evaluations', path: '/evaluations', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">W2R</div>
        <div style={{ fontWeight: 600, fontSize: '15px' }}>Write2Rank</div>
      </div>

      <div style={{ padding: '20px 16px 0 16px' }}>
        <Link href="/evaluations/new">
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>
            + New Evaluation
          </button>
        </Link>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/');
          return (
            <Link href={item.path} key={item.path}>
              <div className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span style={{ fontSize: '14px', fontWeight: isActive ? 500 : 400 }}>{item.name}</span>
              </div>
            </Link>
          );
        })}
        
        <div 
          onClick={() => {
            localStorage.removeItem('w2r_user');
            window.location.href = '/login';
          }}
          className="nav-item" 
          style={{ marginTop: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}
        >
          <Home size={18} style={{ transform: 'rotate(180deg)' }} />
          <span style={{ fontSize: '14px' }}>Logout</span>
        </div>
      </div>
    </aside>
  );
}

'use client';
import { Bell, Search, User, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface TopbarProps {
  toggleSidebar: () => void;
}

export default function Topbar({ toggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  
  const getBreadcrumb = () => {
    if (pathname === '/') return 'Dashboard';
    const path = pathname.split('/')[1];
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>
      
      <div className="breadcrumb">
        Workspace / <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getBreadcrumb()}</span>
      </div>
      
      <div className="topbar-actions">
        <Search size={18} className="action-icon" />
        <Bell size={18} className="action-icon" />
        <div className="user-avatar">
          <User size={16} />
        </div>
      </div>
    </header>
  );
}

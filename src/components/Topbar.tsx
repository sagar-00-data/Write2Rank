'use client';
import { Bell, Search, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Topbar() {
  const pathname = usePathname();
  
  const getBreadcrumb = () => {
    if (pathname === '/') return 'Dashboard';
    const path = pathname.split('/')[1];
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace / <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getBreadcrumb()}</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
        <Search size={20} style={{ cursor: 'pointer' }} />
        <Bell size={20} style={{ cursor: 'pointer' }} />
        <User size={20} style={{ cursor: 'pointer' }} />
      </div>
    </header>
  );
}

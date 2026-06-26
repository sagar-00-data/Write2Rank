import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Search, Bell, LogOut, User, LayoutDashboard, FileText, Settings, CreditCard, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TopbarProps {
  toggleSidebar: () => void;
}

export default function Topbar({ toggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const getBreadcrumb = () => {
    if (pathname === '/') return 'Dashboard';
    const path = pathname.split('/')[1];
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>
      
      <div className="breadcrumb">
        Workspace / <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getBreadcrumb()}</span>
      </div>
      
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Search size={18} className="action-icon" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
        <Bell size={18} className="action-icon" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)', position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <div style={{ textAlign: 'right', display: 'none' }} className="user-details">
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              </div>
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="User avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid transparent', transition: 'border-color 0.2s', ...(dropdownOpen ? { borderColor: 'var(--accent-color)' } : {}) }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="profile-dropdown animate-slide-up">
                <div className="dropdown-header">
                  <p className="user-name">{user.name}</p>
                  <p className="user-email">{user.email}</p>
                </div>
                <div className="dropdown-divider" />
                
                <div className="dropdown-group">
                  <Link href="/" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <LayoutDashboard size={16} /> Dashboard
                    </button>
                  </Link>
                  <Link href="/evaluations" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <FileText size={16} /> Evaluation History
                    </button>
                  </Link>
                  <Link href="/analytics" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Analytics
                    </button>
                  </Link>
                  <Link href="/profile" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <User size={16} /> My Profile
                    </button>
                  </Link>
                  <Link href="/settings" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <Settings size={16} /> Settings
                    </button>
                  </Link>
                </div>
                
                <div className="dropdown-divider" />
                
                <div className="dropdown-group">
                  <Link href="/subscription" onClick={() => setDropdownOpen(false)}>
                    <button className="dropdown-item">
                      <CreditCard size={16} /> Subscription <span className="badge-soon">Soon</span>
                    </button>
                  </Link>
                  <button className="dropdown-item">
                    <LifeBuoy size={16} /> Help & Support
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .user-details { display: block !important; }
        }
        
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 240px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
          z-index: 100;
          overflow: hidden;
        }

        .dropdown-header {
          padding: 16px;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        
        .user-email {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 4px 0;
        }

        .dropdown-group {
          padding: 4px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          text-align: left;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .dropdown-item:hover:not(.disabled) {
          background-color: var(--bg-tertiary);
        }

        .dropdown-item.text-danger {
          color: var(--danger-color);
        }

        .dropdown-item.text-danger:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }

        .dropdown-item.disabled {
          color: var(--text-secondary);
          cursor: default;
          opacity: 0.7;
        }

        .badge-soon {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        
        .animate-slide-up {
          animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}

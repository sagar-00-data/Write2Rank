'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Bell, Moon, Sun, Trash2, Mail, Lock, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);

  if (!user) return null;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="settings-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-desc" style={{ color: 'var(--text-secondary)' }}>Manage your account settings and preferences.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Profile Section */}
        <section className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Profile Information</h2>
          <div className="settings-row">
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Name</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.name}</div>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} disabled>Edit</button>
          </div>
          <div className="settings-row">
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Email</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.email}</div>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} disabled>Change</button>
          </div>
        </section>

        {/* Connected Accounts Section */}
        <section className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Connected Accounts</h2>
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Google Authentication</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Connected via Supabase Auth</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>Connected</span>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Preferences</h2>
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={18} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Theme Preference</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Choose your interface theme.</div>
              </div>
            </div>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '13px', background: 'var(--bg-primary)', cursor: 'pointer' }}
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode (Coming Soon)</option>
              <option value="system">System Default</option>
            </select>
          </div>
          
          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={18} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Email Notifications</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Receive evaluation alerts and updates.</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="settings-section">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Security & Privacy</h2>
          <div className="settings-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="var(--danger-color)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Delete Account</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5, maxWidth: '400px' }}>
                  Permanently delete your account and all evaluation history. This action cannot be undone. Please ensure you have backed up any necessary reports.
                </div>
              </div>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '13px', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '8px 16px', marginTop: '4px' }} onClick={() => alert('Account deletion requires contacting support during Beta.')}>
              Delete Account
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .settings-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
        }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .settings-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        /* Toggle Switch CSS */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border-color);
          transition: .3s;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
        }
        
        input:checked + .slider {
          background-color: var(--accent-color);
        }
        
        input:checked + .slider:before {
          transform: translateX(20px);
        }
        
        .slider.round {
          border-radius: 24px;
        }
        
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

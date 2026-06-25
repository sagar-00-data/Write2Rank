'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Calendar, FileText, Activity, ShieldCheck, Mail, LogOut, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const { user, signOut, isLoading } = useAuth();
  const [totalEvals, setTotalEvals] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const remainingEvals = 50 - (totalEvals % 50); // Assuming 50 per month based on beta limits.

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      setLoadingStats(true);
      
      try {
        const { count, error } = await supabase
          .from('evaluations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (error) {
          console.warn('Failed to fetch evaluation count', error);
          const localEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
          setTotalEvals(localEvals.length);
        } else {
          setTotalEvals(count || 0);
        }
      } catch (err) {
        const localEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setTotalEvals(localEvals.length);
      } finally {
        setLoadingStats(false);
      }
    }
    
    if (!isLoading && user) {
      loadStats();
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex-stack-mobile" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-desc" style={{ color: 'var(--text-secondary)' }}>View and manage your account details.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Profile Details Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{user.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                <Mail size={14} /> {user.email}
              </div>
            </div>
          </div>
          
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                <Calendar size={18} /> Account Created
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Just now'}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                <ShieldCheck size={18} /> Connected Account
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px' }}>
                Google <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} disabled>
              <Edit2 size={16} /> Edit Profile
            </button>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={signOut}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* Usage & Plan Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-color)" /> Usage & Plan
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            
            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Current Plan</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Free Beta</span>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-color)', borderRadius: '20px' }}>Active</span>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Evaluations</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {loadingStats ? '--' : totalEvals}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>completed</span>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Remaining Limit (Monthly)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {loadingStats ? '--' : remainingEvals}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>/ 50</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (remainingEvals / 50) * 100))}%`, background: remainingEvals > 10 ? 'var(--success-color)' : 'var(--danger-color)', borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

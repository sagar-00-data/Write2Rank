'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, RefreshCw, AlertTriangle, Mail, Calendar, 
  Activity, Shield, UserX, UserCheck, Settings, Info, Save, X, RotateCcw
} from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  profile_photo: string;
  created_at: string;
  last_login: string;
  plan: string;
  status: string;
  custom_eval_limit: number | null;
  custom_ocr_limit: number | null;
  evals_used_today: number;
  ocr_used_today: number;
  total_eval_count: number;
  total_ocr_count: number;
  admin_notes: string;
  clerk_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  lifetime_plan?: boolean;
  last_reset_date?: string | null;
}

interface PlanConfig {
  plan: string;
  default_daily_evals: number;
  default_daily_ocr_pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Details Panel State
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editEvalLimit, setEditEvalLimit] = useState<string>('');
  const [editOcrLimit, setEditOcrLimit] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');

  // Local/Custom styling colors
  const C = {
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    textDim: '#94a3b8',
    textMuted: '#64748b',
    borderLight: 'rgba(255,255,255,0.05)',
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        plan: planFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString(),
      });
      
      const res = await fetch(`/admin/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load user directory.');
      const data = await res.json();
      
      setUsers(data.users || []);
      setTotal(data.total || 0);
      if (data.planConfigs) {
        setPlanConfigs(data.planConfigs);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  // Handle slide-out select
  const selectUser = (user: UserDetail) => {
    setSelectedUser(user);
    setEditPlan(user.plan);
    setEditStatus(user.status);
    setEditEvalLimit(user.custom_eval_limit === null ? '' : user.custom_eval_limit.toString());
    setEditOcrLimit(user.custom_ocr_limit === null ? '' : user.custom_ocr_limit.toString());
    setEditNotes(user.admin_notes || '');
  };

  // Perform updates
  const handleQuickAction = async (action: string, extraBody = {}) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch('/admin/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          action,
          ...extraBody
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Action failed.');
      }
      
      const data = await res.json();
      if (data.success) {
        // Refresh users and update selected
        const updated = data.user;
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        setSelectedUser(updated);
        
        // sync input forms
        setEditPlan(updated.plan);
        setEditStatus(updated.status);
        setEditEvalLimit(updated.custom_eval_limit === null ? '' : updated.custom_eval_limit.toString());
        setEditOcrLimit(updated.custom_ocr_limit === null ? '' : updated.custom_ocr_limit.toString());
        setEditNotes(updated.admin_notes || '');
      }
    } catch (err: any) {
      alert(err.message || 'Quick action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const saveChanges = () => {
    handleQuickAction('save_changes', {
      plan: editPlan,
      status: editStatus,
      customEvalLimit: editEvalLimit === '' ? null : parseInt(editEvalLimit, 10),
      customOcrLimit: editOcrLimit === '' ? null : parseInt(editOcrLimit, 10),
      adminNotes: editNotes
    });
  };

  // Resolve plan default limits
  const getPlanDefaults = (planName: string) => {
    const config = planConfigs.find(c => c.plan === planName);
    if (config) {
      return { evals: config.default_daily_evals, ocr: config.default_daily_ocr_pages };
    }
    // Fallback defaults
    if (planName === 'Founder') return { evals: -1, ocr: -1 };
    if (planName === 'Premium') return { evals: -1, ocr: -1 };
    if (planName === 'Free') return { evals: 0, ocr: 0 };
    return { evals: 7, ocr: 14 }; // Beta Tester
  };

  // Render limit cell label
  const renderLimit = (customValue: number | null, planDefault: number) => {
    if (customValue !== null) {
      return (
        <span className="text-indigo-400 font-bold" title="Custom override active">
          {customValue === -1 ? 'Unlimited' : customValue} (custom)
        </span>
      );
    }
    return (
      <span className="text-zinc-500 font-medium">
        {planDefault === -1 ? 'Unlimited' : planDefault} (default)
      </span>
    );
  };

  // Calculations for Telemetry
  const totalUsersCount = total;
  const todayActiveCount = users.filter(u => u.evals_used_today > 0 || u.ocr_used_today > 0).length;
  const todayEvals = users.reduce((acc, u) => acc + (u.evals_used_today || 0), 0);
  const todayOcr = users.reduce((acc, u) => acc + (u.ocr_used_today || 0), 0);
  const avgEvalsPerUser = totalUsersCount > 0 ? (users.reduce((acc, u) => acc + u.total_eval_count, 0) / totalUsersCount).toFixed(1) : '0';
  const avgOcrPerUser = totalUsersCount > 0 ? (users.reduce((acc, u) => acc + u.total_ocr_count, 0) / totalUsersCount).toFixed(1) : '0';

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '40vh' }}>
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-4 opacity-85" />
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Loading User Settings Directory...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── ROW 1: PLATFORM USER ANALYTICS TELEMETRY ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Enrolled Users', value: totalUsersCount, icon: <Users size={18} />, color: C.indigo, desc: 'Registered beta accounts' },
          { label: "Today's Active Testers", value: todayActiveCount, icon: <Activity size={18} />, color: C.emerald, desc: 'Used system resources today' },
          { label: "Today's Evaluations", value: todayEvals, icon: <Shield size={18} />, color: C.amber, desc: 'AI checking responses run' },
          { label: "Today's OCR Pages", value: todayOcr, icon: <Info size={18} />, color: '#06b6d4', desc: 'Handwritten transcripts run' }
        ].map((item, index) => (
          <div key={index} className="fd-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</span>
              <div style={{ color: item.color }}>{item.icon}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: -8 }}>
        {[
          { label: 'Avg Evaluations / User', value: avgEvalsPerUser, desc: 'Platform usage density' },
          { label: 'Avg OCR Pages / User', value: avgOcrPerUser, desc: 'Transcription density' },
          { label: 'Plan Distribution', value: 'Beta & Admins', desc: 'Plans: Founder, Beta Tester' },
          { label: 'Platform Settings Status', value: 'Active', desc: 'Auto-resets enabled' }
        ].map((item, index) => (
          <div key={index} className="fd-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 9, color: C.textMuted }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: SEARCH & FILTER CONTROL BAR ───────────────────── */}
      <div className="fd-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by full name, email, user ID..."
              className="fd-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="fd-input"
            style={{ width: 140, cursor: 'pointer' }}
          >
            <option value="">All Plans</option>
            <option value="Founder">Founder</option>
            <option value="Beta Tester">Beta Tester</option>
            <option value="Free">Free</option>
            <option value="Premium">Premium</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="fd-input"
            style={{ width: 140, cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* Sort selection */}
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split(':');
              setSortBy(by);
              setSortOrder(order);
              setPage(1);
            }}
            className="fd-input"
            style={{ width: 180, cursor: 'pointer' }}
          >
            <option value="created_at:desc">Joined (Newest)</option>
            <option value="created_at:asc">Joined (Oldest)</option>
            <option value="last_login:desc">Recent Activity</option>
            <option value="total_eval_count:desc">Most Evaluations</option>
            <option value="total_ocr_count:desc">Most OCR Pages</option>
            <option value="name:asc">Name (A-Z)</option>
          </select>

          <button onClick={fetchUsers} className="fd-btn-secondary" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── ROW 3: USERS LIST TABLE & DETAILS PANEL ───────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        
        {/* User Directory Table Grid */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div className="fd-table-wrapper" style={{ margin: 0 }}>
            <table className="fd-table">
              <thead className="fd-table-header">
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Beta User Info</th>
                  <th>Auth Identity ID</th>
                  <th>Subscription</th>
                  <th style={{ textAlign: 'center' }}>Daily Evals</th>
                  <th style={{ textAlign: 'center' }}>Daily OCR</th>
                  <th style={{ textAlign: 'center' }}>Today Used</th>
                  <th style={{ textAlign: 'center' }}>Total Usage</th>
                  <th style={{ textAlign: 'right' }}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
                      No matching beta users found in directory registry database.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const defaults = getPlanDefaults(u.plan);
                    const isSuspended = u.status === 'Suspended';
                    const activeToday = u.evals_used_today > 0 || u.ocr_used_today > 0;
                    
                    return (
                      <tr 
                        key={u.id} 
                        onClick={() => selectUser(u)}
                        className="fd-table-row" 
                        style={{ 
                          cursor: 'pointer',
                          background: selectedUser?.id === u.id ? 'rgba(99,102,241,0.06)' : 'transparent',
                          opacity: isSuspended ? 0.65 : 1
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()} style={{ padding: '12px 6px 12px 14px' }}>
                          <img 
                            src={u.profile_photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop'} 
                            alt={u.name}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.borderLight}` }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop';
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {u.name}
                            {isSuspended && (
                              <span style={{ fontSize: 8, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Suspended
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Mail size={10} />
                            {u.email}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: C.textMuted }}>
                          {u.clerk_id || u.id.substring(0, 13) + '...'}
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5,
                            background: u.plan === 'Founder' ? 'rgba(99,102,241,0.08)' : u.plan === 'Premium' ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
                            color: u.plan === 'Founder' ? C.indigo : u.plan === 'Premium' ? '#a855f7' : C.textDim,
                            border: `1px solid ${u.plan === 'Founder' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)'}`
                          }}>
                            {u.plan}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>
                          {renderLimit(u.custom_eval_limit, defaults.evals)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>
                          {renderLimit(u.custom_ocr_limit, defaults.ocr)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>
                          <span style={{ color: activeToday ? '#ffffff' : C.textMuted, fontWeight: activeToday ? 700 : 400 }}>
                            {u.evals_used_today} evals / {u.ocr_used_today} ocr
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                            {u.total_eval_count} evals / {u.total_ocr_count} ocr
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 11, color: C.textDim, paddingRight: 14 }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>
                Showing {Math.min(total, (page - 1) * limit + 1)} - {Math.min(total, page * limit)} of {total} users
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="fd-btn-secondary" 
                  style={{ padding: '6px 12px' }}
                >
                  Previous
                </button>
                <button 
                  disabled={page * limit >= total} 
                  onClick={() => setPage(p => p + 1)}
                  className="fd-btn-secondary" 
                  style={{ padding: '6px 12px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── USER DETAILS SLIDE-OUT PANEL ────────────────────────── */}
        {selectedUser && (
          <div className="fd-card" style={{ width: 380, flexShrink: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Settings size={16} style={{ color: C.indigo }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>Beta User Control Center</span>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Brief */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: 12 }}>
              <img 
                src={selectedUser.profile_photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop'} 
                alt={selectedUser.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>{selectedUser.name}</div>
                <div style={{ fontSize: 10, color: C.textDim, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{selectedUser.email}</div>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: 'monospace', marginTop: 2 }}>{selectedUser.clerk_id || selectedUser.id}</div>
              </div>
            </div>

            {/* Editing Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Plan dropdown */}
              <div>
                <label style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Subscription Plan
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="fd-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="Founder">Founder (Unlimited)</option>
                  <option value="Beta Tester">Beta Tester (Standard Limit)</option>
                  <option value="Free">Free (Disabled)</option>
                  <option value="Premium">Premium (Unlimited)</option>
                </select>
              </div>

              {/* Status Select */}
              <div>
                <label style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="fd-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              {/* Limits overrides */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Custom Evals Limit
                  </label>
                  <input
                    type="number"
                    value={editEvalLimit}
                    onChange={(e) => setEditEvalLimit(e.target.value)}
                    placeholder="Plan default"
                    className="fd-input"
                  />
                  <span style={{ fontSize: 8, color: C.textMuted }}>Use -1 for unlimited</span>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Custom OCR Limit
                  </label>
                  <input
                    type="number"
                    value={editOcrLimit}
                    onChange={(e) => setEditOcrLimit(e.target.value)}
                    placeholder="Plan default"
                    className="fd-input"
                  />
                  <span style={{ fontSize: 8, color: C.textMuted }}>Pages count override</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Founder Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Private internal tester records..."
                  className="fd-input"
                  style={{ width: '100%', height: 60, resize: 'none', padding: '8px 10px', fontSize: 11 }}
                />
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                Quick Operations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  disabled={actionLoading}
                  onClick={() => handleQuickAction('reset_usage')}
                  className="fd-btn-secondary"
                  style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 10 }}
                >
                  <RotateCcw size={10} />
                  Reset Usage
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleQuickAction('grant_unlimited_today')}
                  className="fd-btn-secondary"
                  style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 10 }}
                >
                  <Shield size={10} />
                  Grant Unlimited
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleQuickAction(selectedUser.status === 'Active' ? 'suspend_user' : 'reactivate_user')}
                  className="fd-btn-secondary"
                  style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 10, color: selectedUser.status === 'Active' ? C.rose : C.emerald }}
                >
                  {selectedUser.status === 'Active' ? <UserX size={10} /> : <UserCheck size={10} />}
                  {selectedUser.status === 'Active' ? 'Suspend User' : 'Reactivate'}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={saveChanges}
                  className="fd-btn-primary"
                  style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', fontSize: 10 }}
                >
                  <Save size={10} />
                  Save Profile
                </button>
              </div>
            </div>

            {/* System Metadata */}
            <div style={{ fontSize: 9, color: C.textMuted, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.005)', padding: 8, borderRadius: 6, border: `1px solid ${C.borderLight}` }}>
              <div>• Evals Used Today: {selectedUser.evals_used_today} / Total: {selectedUser.total_eval_count}</div>
              <div>• OCR Pages Today: {selectedUser.ocr_used_today} / Total: {selectedUser.total_ocr_count}</div>
              <div>• Last Reset Date: {selectedUser.last_reset_date ? String(selectedUser.last_reset_date).split('T')[0] : 'Never'}</div>
              <div>• Last Active Time: {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleTimeString() : 'Never'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

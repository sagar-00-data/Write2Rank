'use client';
import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, AlertTriangle, Mail, Calendar, Activity } from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  profilePhoto: string;
  createdAt: string;
  lastLogin: string;
  totalEvals: number;
  successfulEvals: number;
  failedEvals: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/users');
      if (!res.ok) throw new Error('Failed to load user directory.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchUsers());
  }, []);

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '40vh' }}>
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-4 opacity-85" />
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Querying user registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fd-card flex flex-col items-center justify-center text-center p-12" style={{ maxWidth: 500, margin: '40px auto' }}>
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Directory Sync Failed</h3>
        <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{error}</p>
        <button onClick={fetchUsers} className="fd-btn-primary mt-6">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#090d16]/40 p-2 border border-white/[0.04] rounded-xl items-stretch">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or exact UUID..."
            className="fd-input pl-10"
          />
        </div>
        <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-lg px-4 text-xs font-mono font-bold text-zinc-400 whitespace-nowrap">
          {filteredUsers.length} RECORDS MATCHED
        </div>
      </div>

      {/* User Directory Table */}
      <div className="fd-table-wrapper">
        <table className="fd-table">
          <thead className="fd-table-header">
            <tr>
              <th>User Details</th>
              <th>UUID Reference</th>
              <th>Sign Up Date</th>
              <th>Last Active</th>
              <th style={{ textAlign: 'center' }}>Evaluations</th>
              <th style={{ textAlign: 'right' }}>Account Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="fd-table-row">
                <td>
                  <div className="flex items-center gap-3">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-[11px] shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-zinc-100 text-[13px]">{user.name}</div>
                      <div className="text-zinc-500 text-[10px] mt-0.5 flex items-center gap-1.5 font-medium">
                        <Mail className="h-3 w-3 opacity-70" /> {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="font-mono text-[10px] text-zinc-500">
                  <span className="bg-white/5 px-2 py-0.5 border border-white/5 rounded-md">{user.id}</span>
                </td>
                <td className="text-zinc-400 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </td>
                <td className="text-zinc-400 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Activity className="h-3.5 w-3.5 text-indigo-400" />
                    {new Date(user.lastLogin).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="inline-flex flex-col items-center">
                    <span className="font-semibold text-zinc-100 text-[13px]">{user.totalEvals}</span>
                    <span className="text-[9px] text-emerald-400 font-medium mt-0.5">{user.successfulEvals} OK • {user.failedEvals} Fail</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {user.totalEvals > 0 ? (
                    <span className="fd-status-pill green">
                      Active Client
                    </span>
                  ) : (
                    <span className="fd-status-pill grey" style={{ color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      Inactive
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-zinc-500 font-medium py-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-zinc-600 mb-2" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No Beta Users Found</span>
                    <span className="text-zinc-500 text-[11px] max-w-[280px]">No database users match the active search term query filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4 opacity-80" />
        <p className="text-zinc-500 text-sm font-medium tracking-wide">Querying user registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Directory Sync Failed</h3>
        <p className="text-zinc-500 text-sm max-w-md mt-2">{error}</p>
        <button onClick={fetchUsers} className="mt-8 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            Beta User Registry
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium">Closed beta user profiles, account creation dates, and activity statistics.</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2.5 bg-[#111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Registry
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#0a0a0a] p-2 border border-white/5 rounded-2xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or exact UUID..."
            className="w-full bg-transparent text-white rounded-xl py-3 pl-11 pr-4 outline-none text-sm placeholder-zinc-600 transition-colors focus:bg-white/[0.02]"
          />
        </div>
        <div className="flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-xl px-5 text-xs font-semibold text-zinc-400 whitespace-nowrap">
          {filteredUsers.length} active records
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#111] border-b border-white/5 text-zinc-500 uppercase tracking-widest text-[10px] font-semibold">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">UUID Reference</th>
                <th className="px-6 py-4">Sign Up Date</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-center">Evaluations</th>
                <th className="px-6 py-4 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full border border-white/10" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shadow-inner">
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
                  <td className="px-6 py-4 font-mono text-[10px] text-zinc-500 font-medium">
                    <span className="bg-white/5 px-2 py-1 rounded-md">{user.id}</span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      {new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      <Activity className="h-3.5 w-3.5 text-indigo-400" />
                      {new Date(user.lastLogin).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-semibold text-zinc-100 text-[13px]">{user.totalEvals}</span>
                      <span className="text-[9px] text-emerald-400 font-medium mt-0.5">{user.successfulEvals} OK • {user.failedEvals} Fail</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.totalEvals > 0 ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-widest shadow-sm">
                        Active Client
                      </span>
                    ) : (
                      <span className="bg-white/5 text-zinc-500 border border-white/10 text-[9px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-widest shadow-sm">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium text-sm">
                    No matching users found in registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

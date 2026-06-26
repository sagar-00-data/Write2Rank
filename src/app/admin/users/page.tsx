'use client';
import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, AlertTriangle, ShieldCheck, Mail, Calendar, Activity } from 'lucide-react';

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
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Retrieving active user records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold">User Ingestion Failed</h3>
        <p className="text-gray-400 text-sm max-w-md mt-2">{error}</p>
        <button onClick={fetchUsers} className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs transition">
          Retry Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" /> Beta User Registry
          </h1>
          <p className="text-gray-400 text-xs mt-1">Closed beta user profiles, account creation dates, and activity statistics.</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Registry
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-gray-900/30 p-4 border border-gray-800/60 rounded-xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or user UUID..."
            className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg py-2 pl-9 pr-4 outline-none text-xs placeholder-gray-600"
          />
        </div>
        <div className="flex items-center text-xs font-medium text-gray-400 px-2">
          Found {filteredUsers.length} active profiles
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="px-6 py-3.5">User Info</th>
                <th className="px-6 py-3.5">ID Reference</th>
                <th className="px-6 py-3.5">Sign Up Date</th>
                <th className="px-6 py-3.5">Last Active</th>
                <th className="px-6 py-3.5 text-center">Evaluations</th>
                <th className="px-6 py-3.5 text-right">Activity Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-900/50 hover:bg-gray-900/10">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full border border-gray-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-800/80 flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white text-sm">{user.name}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-500" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-[10px] text-gray-500">{user.id}</td>
                  <td className="px-6 py-3 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      {new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-indigo-500" />
                      {new Date(user.lastLogin).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-bold text-white text-sm">{user.totalEvals}</span>
                      <span className="text-[9px] text-emerald-400">{user.successfulEvals} OK • {user.failedEvals} Fail</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {user.totalEvals > 0 ? (
                      <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-[9px] px-2 py-0.5 rounded font-semibold uppercase">
                        Active Client
                      </span>
                    ) : (
                      <span className="bg-gray-950 text-gray-500 border border-gray-900 text-[9px] px-2 py-0.5 rounded font-semibold uppercase">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No matching users found in registry database.
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

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid password.');
      } else {
        router.refresh();
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-[100%] blur-[120px] opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-blue-600/10 rounded-[100%] blur-[100px] opacity-40 mix-blend-screen" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* Logo / Header area */}
        <div className="flex flex-col items-center text-center mb-10 space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl group-hover:bg-indigo-500/30 transition duration-500" />
            <div className="relative p-3.5 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center">
              <Activity className="h-7 w-7 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Founder Operations</h1>
            <p className="text-zinc-500 text-sm mt-1.5 font-medium">Internal Command Center</p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-8">
          
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-red-200/90 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest ml-1">
                Security Passkey
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full bg-[#111111] border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 text-white rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all text-sm font-mono placeholder-zinc-700 shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1a1a1a] disabled:text-zinc-500 disabled:border-white/5 border border-transparent disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 px-4 text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Authenticating...' : 'Secure Access'}
                {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
              </span>
            </button>
          </form>
        </div>

        <div className="mt-8 text-center flex justify-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium px-4 py-2 rounded-full hover:bg-white/5">
            ← Return to public platform
          </Link>
        </div>
      </div>
    </div>
  );
}

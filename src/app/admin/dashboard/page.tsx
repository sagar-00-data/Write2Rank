'use client';
import { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Activity, 
  Binary, 
  Cpu, 
  DollarSign, 
  Database, 
  Key, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  ShieldCheck,
  Zap,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

interface StatsData {
  platform: {
    totalEvaluations: number;
    evalsToday: number;
    evalsThisWeek: number;
    avgEvaluationTime: number;
    avgResponseTime: number;
    successfulEvaluations: number;
    failedEvaluations: number;
    totalUsers?: number;
    activeUsersToday?: number;
  };
  ocr: {
    geminiOcrRequestsToday: number;
    geminiOcrRequestsThisMonth: number;
    ocrSuccessRate: number;
    ocrFailureRate: number;
    avgOcrTime: number;
    ocrSpaceFallbackCount: number;
    mostCommonOcrErrors: Array<{ message: string; count: number }>;
    ocrQueueStatus: string;
  };
  apiKeys: {
    activeKeys: number;
    healthyKeys: number;
    exhaustedKeys: number;
    rotationStatus: string;
    keys: Array<{
      slot: string;
      masked: string;
      status: string;
      todayRequests: number;
      estimatedRemaining: number;
      isActive: boolean;
      lastUsedTime: string | null;
    }>;
  };
  freeTier: {
    ocrLimit: number;
    ocrUsedToday: number;
    ocrRemainingToday: number;
    estimatedMonthlyUsage: number;
    estimatedMonthlyRemaining: number;
  };
  cost: {
    todayGeminiCost: number;
    monthlyGeminiCost: number;
    avgCostPerEval: number;
    avgTokensPerEval: number;
    avgOcrCost: number;
  };
  systemHealth: {
    overall: string;
    supabase: string;
    gemini: string;
    ocr: string;
    rag: string;
    api: string;
  };
  errors: {
    recent: Array<{ message: string; count: number; lastOccurred: string; type: string }>;
    mostCommon: Array<{ message: string; count: number; lastOccurred: string; type: string }>;
    count429: number;
    ocrErrors: number;
    evalErrors: number;
    buildErrors: number;
  };
  performance: {
    avgEvaluationTime: number;
    avgOcrTime: number;
    fastestEvaluation: string;
    slowestEvaluation: string;
  };
  liveActivity: Array<{ id: string; time: string; event: string; type: string }>;
  chartData: Array<{
    date: string;
    evaluations: number;
    ocrRequests: number;
    apiCalls: number;
    avgLatency: number;
    errorsCount: number;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTelemetry = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/admin/api/stats');
      if (!res.ok) throw new Error('Operations stats API returned error.');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message || 'Connection failure.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchTelemetry());
    const interval = setInterval(() => fetchTelemetry(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white p-8 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/5 rounded-md animate-pulse" />
            <div className="h-8 w-64 bg-white/10 rounded-md animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 animate-pulse space-y-4">
              <div className="h-3 w-24 bg-white/10 rounded" />
              <div className="h-8 w-16 bg-white/10 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-[#0a0a0a] border border-white/5 rounded-2xl animate-pulse" />
          <div className="h-96 bg-[#0a0a0a] border border-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Telemetry Disconnected</h3>
        <p className="text-zinc-500 text-sm mt-2 max-w-sm">{error || 'Server error occurred during fetch.'}</p>
        <button onClick={() => fetchTelemetry()} className="mt-8 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all">
          Reconnect Console
        </button>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'green': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'yellow': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/5 text-zinc-400 border-white/10';
    }
  };

  const getHealthBadgeDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'green': return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
      case 'yellow': return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
      case 'red': return 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]';
      default: return 'bg-zinc-500';
    }
  };

  const maxEvals = Math.max(...data.chartData.map(d => d.evaluations), 5);
  const maxOcr = Math.max(...data.chartData.map(d => d.ocrRequests), 5);
  const maxLatency = Math.max(...data.chartData.map(d => d.avgLatency), 5);
  const maxCalls = Math.max(...data.chartData.map(d => d.apiCalls), 5);
  const maxErrors = Math.max(...data.chartData.map(d => d.errorsCount), 5);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-zinc-100 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.1)]">
              Operations Center
            </span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
              <Clock className="h-3 w-3" /> Auto-refreshes 30s
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-3 flex items-center gap-2">
            Pipeline Telemetry <Sparkles className="text-indigo-400 h-4 w-4 opacity-80" />
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Real-time metrics, model failovers, cost indexes, and system errors.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-[10px] text-zinc-500 font-medium">
            <div>Last Fetched</div>
            <div className="font-mono text-zinc-300 mt-0.5">{lastUpdated.toLocaleTimeString()}</div>
          </div>
          <button 
            onClick={() => fetchTelemetry(true)} 
            disabled={refreshing}
            className="px-4 py-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 transition-all flex items-center gap-2 shadow-sm hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            {refreshing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* Grid: Bento Platform statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors flex items-center justify-between group">
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">Total Evaluations</p>
            <h3 className="text-3xl font-semibold mt-1 text-white tracking-tight">{data.platform.totalEvaluations}</h3>
            <p className="text-zinc-500 text-[11px] mt-2 font-medium flex gap-2">
              Today: <span className="text-indigo-400">{data.platform.evalsToday}</span> 
              Week: <span className="text-indigo-400">{data.platform.evalsThisWeek}</span>
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors flex items-center justify-between group">
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">OCR Success Rate</p>
            <h3 className="text-3xl font-semibold mt-1 text-white tracking-tight">{data.ocr.ocrSuccessRate}%</h3>
            <p className="text-zinc-500 text-[11px] mt-2 font-medium">
              Fail Rate: <span className="text-red-400">{data.ocr.ocrFailureRate}%</span>
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/10 rounded-xl text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
            <Binary className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors flex items-center justify-between group">
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">Avg Latency Time</p>
            <h3 className="text-3xl font-semibold mt-1 text-white tracking-tight">{(data.platform.avgResponseTime / 1000).toFixed(2)}s</h3>
            <p className="text-zinc-500 text-[11px] mt-2 font-medium flex gap-2">
              AI: <span className="text-purple-400">{(data.platform.avgEvaluationTime / 1000).toFixed(2)}s</span>
              OCR: <span className="text-cyan-400">{(data.ocr.avgOcrTime / 1000).toFixed(2)}s</span>
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors flex items-center justify-between group">
          <div>
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">Monthly Est Cost</p>
            <h3 className="text-3xl font-semibold mt-1 text-emerald-400 tracking-tight">${data.cost.monthlyGeminiCost.toFixed(4)}</h3>
            <p className="text-zinc-500 text-[11px] mt-2 font-medium">
              Today: <span className="text-emerald-400">${data.cost.todayGeminiCost.toFixed(5)}</span> 
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/10 rounded-xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
              <Layers className="h-4 w-4 text-indigo-400" /> Platform Operations
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Successful</span>
                <span className="text-xl font-semibold text-white block mt-1">{data.platform.successfulEvaluations}</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Failed</span>
                <span className="text-xl font-semibold mt-1 text-red-400 block">{data.platform.failedEvaluations}</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Fastest Eval</span>
                <span className="text-xl font-semibold mt-1 text-emerald-400 block">{data.performance.fastestEvaluation}s</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Slowest Eval</span>
                <span className="text-xl font-semibold mt-1 text-amber-400 block">{data.performance.slowestEvaluation}s</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
              <Binary className="h-4 w-4 text-cyan-400" /> OCR Engine Telemetry
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Gemini (Today)</span>
                <span className="text-xl font-semibold text-white block mt-1">{data.ocr.geminiOcrRequestsToday}</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Gemini (Month)</span>
                <span className="text-xl font-semibold mt-1 text-white block">{data.ocr.geminiOcrRequestsThisMonth}</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Fallback Count</span>
                <span className="text-xl font-semibold mt-1 text-amber-400 block">{data.ocr.ocrSpaceFallbackCount}</span>
              </div>
              <div className="bg-[#111] p-4 border border-white/5 rounded-xl">
                <span className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Queue Status</span>
                <span className={`text-xl font-semibold mt-1 block ${data.ocr.ocrQueueStatus === 'Idle' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {data.ocr.ocrQueueStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
              <Key className="h-4 w-4 text-amber-400" /> Key Pool Registry
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#111]">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-white/5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Slot</th>
                    <th className="px-5 py-3.5">Masked ID</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Requests Today</th>
                    <th className="px-5 py-3.5 text-center">Remaining (Est)</th>
                    <th className="px-5 py-3.5 text-right">Active Used</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apiKeys.keys.map((key) => (
                    <tr 
                      key={key.slot} 
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${key.isActive ? 'bg-indigo-500/[0.02]' : ''}`}
                    >
                      <td className="px-5 py-3 font-semibold text-white">{key.slot}</td>
                      <td className="px-5 py-3 font-mono text-zinc-400">{key.masked}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${
                          key.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-mono font-medium">{key.todayRequests}</td>
                      <td className="px-5 py-3 text-center font-mono text-zinc-500">{key.estimatedRemaining}</td>
                      <td className="px-5 py-3 text-right">
                        {key.isActive ? (
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-semibold uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                            Current Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {key.lastUsedTime ? new Date(key.lastUsedTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Idle'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" /> Infrastructure Nodes
              </h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full inline-block ${getHealthBadgeDot(data.systemHealth.overall)}`} />
                <span className="text-[10px] font-semibold text-white uppercase tracking-wider">{data.systemHealth.overall} Status</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              {[
                { name: 'Supabase Database', status: data.systemHealth.supabase, desc: 'Logs & User collections online' },
                { name: 'Google Gemini Gateway', status: data.systemHealth.gemini, desc: 'API Key rotation client online' },
                { name: 'OCR Space Fallbacks', status: data.systemHealth.ocr, desc: 'Handwriting scan failover active' },
                { name: 'RAG Law Index', status: data.systemHealth.rag, desc: 'ICSI paragraph weights online' },
                { name: 'Operations APIs', status: data.systemHealth.api, desc: 'Telemetry aggregation active' }
              ].map((node) => (
                <div key={node.name} className="flex items-center justify-between bg-[#111] p-3 border border-white/5 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div>
                    <span className="font-semibold text-zinc-200 block">{node.name}</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{node.desc}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border ${getHealthColor(node.status)}`}>
                    {node.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
              <Zap className="h-4 w-4 text-amber-400" /> Free Tier Quota
            </h3>
            <div className="space-y-5 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-zinc-400">Daily OCR calls</span>
                  <span className="text-white">{data.freeTier.ocrUsedToday} / {data.freeTier.ocrLimit}</span>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(data.freeTier.ocrUsedToday / data.freeTier.ocrLimit) * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500 block">Remaining Today: {data.freeTier.ocrRemainingToday} requests</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-zinc-400">Monthly OCR scale</span>
                  <span className="text-white">{data.freeTier.estimatedMonthlyUsage} / 15,000</span>
                </div>
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(data.freeTier.estimatedMonthlyUsage / 15000) * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500 block">Remaining Month (Est): {data.freeTier.estimatedMonthlyRemaining} requests</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Cost Scaling
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between bg-[#111] p-3 border border-white/5 rounded-xl">
                <span className="text-zinc-400 font-medium">Avg Cost / Eval:</span>
                <span className="font-semibold text-white">${data.cost.avgCostPerEval.toFixed(5)}</span>
              </div>
              <div className="flex justify-between bg-[#111] p-3 border border-white/5 rounded-xl">
                <span className="text-zinc-400 font-medium">Avg Tokens / Eval:</span>
                <span className="font-semibold text-indigo-400">{data.cost.avgTokensPerEval.toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-[#111] p-3 border border-white/5 rounded-xl">
                <span className="text-zinc-400 font-medium">Avg OCR Cost:</span>
                <span className="font-semibold text-emerald-400">$0.00000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-6">
        <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
          <Activity className="h-4 w-4 text-indigo-400" /> Interactive Platform Coordinate Charts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#111] p-5 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200">Daily Evaluations & OCR Requests</span>
              <div className="flex gap-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" /> Evals</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]" /> OCR</span>
              </div>
            </div>
            <div className="h-48 relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <path
                  d={`M 0 100 ${data.chartData.map((d, idx) => `L ${(idx / 6) * 100} ${100 - (d.evaluations / maxEvals) * 80}`).join(' ')} L 100 100 Z`}
                  fill="url(#indigoGrad)" opacity="0.4"
                />
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.evaluations / maxEvals) * 80}`).join(' ')}
                  fill="none" stroke="#6366f1" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.4))' }}
                />
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.ocrRequests / maxOcr) * 80}`).join(' ')}
                  fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3" style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.4))' }}
                />
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-3 px-1">
                {data.chartData.map((d) => <span key={d.date}>{d.date}</span>)}
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-5 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200">Evaluation Latency (Seconds)</span>
              <span className="text-[10px] font-mono text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full">Peak: {maxLatency.toFixed(2)}s</span>
            </div>
            <div className="h-48 relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.avgLatency / maxLatency) * 80}`).join(' ')}
                  fill="none" stroke="#a855f7" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.4))' }}
                />
                {data.chartData.map((d, idx) => (
                  <circle key={idx} cx={(idx / 6) * 100} cy={100 - (d.avgLatency / maxLatency) * 80} r="1.5" fill="#a855f7" />
                ))}
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-3 px-1">
                {data.chartData.map((d) => <span key={d.date}>{d.date}</span>)}
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-5 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200">Google API Load Volumes</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">Health slots OK</span>
            </div>
            <div className="h-48 relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                {data.chartData.map((d, idx) => {
                  const x = (idx / 6) * 100 + 4;
                  const height = (d.apiCalls / maxCalls) * 70;
                  return (
                    <rect key={idx} x={`${x - 2.5}%`} y={`${100 - height}%`} width="5%" height={`${height}%`} fill="#10b981" rx="0.5" opacity="0.8" />
                  );
                })}
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-3 px-1">
                {data.chartData.map((d) => <span key={d.date}>{d.date}</span>)}
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-5 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200">Error Failure Log Over Time</span>
              <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">Total Failures: {data.platform.failedEvaluations}</span>
            </div>
            <div className="h-48 relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="0.5" />
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.errorsCount / maxErrors) * 80}`).join(' ')}
                  fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.4))' }}
                />
              </svg>
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-3 px-1">
                {data.chartData.map((d) => <span key={d.date}>{d.date}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Platform Error Monitor
            </h3>
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-2.5 py-0.5 rounded font-semibold uppercase tracking-widest">
              Failures Logged
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar text-xs">
            {data.errors.recent.map((err, idx) => (
              <div key={idx} className="bg-[#111] border border-white/5 p-3.5 rounded-xl flex items-start gap-4 justify-between hover:bg-white/[0.02] transition-colors">
                <div className="space-y-1.5">
                  <span className="font-semibold text-zinc-200 block">{err.message}</span>
                  <span className="text-[10px] text-zinc-500 block font-mono">
                    {new Date(err.lastOccurred).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest block shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                    {err.count} Hits
                  </span>
                </div>
              </div>
            ))}
            {data.errors.recent.length === 0 && (
              <div className="text-center py-16 text-zinc-600 text-sm font-medium">
                No error failures logged. System stable.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-[11px] font-semibold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" /> Action Timeline
            </h3>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-2.5 py-0.5 rounded font-semibold uppercase tracking-widest shadow-[0_0_10px_rgba(79,70,229,0.2)]">
              Live Feed
            </span>
          </div>

          <div className="space-y-5 max-h-80 overflow-y-auto pr-2 custom-scrollbar text-xs py-2">
            {data.liveActivity.map((act) => (
              <div key={act.id} className="relative pl-7 border-l border-white/10 pb-2 last:pb-0">
                <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${
                  act.type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 
                  act.type === 'error' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]' : 
                  'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                }`} />
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-medium text-zinc-300 leading-relaxed block">{act.event}</span>
                    <span className="text-[9px] text-zinc-500 font-mono flex-shrink-0 mt-0.5">{act.time}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.liveActivity.length === 0 && (
              <div className="text-center py-16 text-zinc-600 text-sm font-medium">
                No events currently flowing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

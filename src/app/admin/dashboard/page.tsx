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
    // Run in microtask tick to avoid synchronous setState triggers during mounting
    Promise.resolve().then(() => {
      fetchTelemetry();
    });

    // Auto polling refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center border-b border-gray-900 pb-6">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-900 rounded animate-pulse" />
            <div className="h-8 w-64 bg-gray-900 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-900 rounded animate-pulse" />
        </div>
        
        {/* Bento Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-900/50 border border-gray-900 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-3 w-20 bg-gray-900 rounded" />
              <div className="h-6 w-16 bg-gray-900 rounded" />
              <div className="h-3 w-32 bg-gray-900 rounded" />
            </div>
          ))}
        </div>

        {/* Major Columns Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-900/40 border border-gray-900 rounded-xl animate-pulse" />
          <div className="h-72 bg-gray-900/40 border border-gray-900 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold">Founder Telemetry Disconnect</h3>
        <p className="text-gray-400 text-xs mt-2 max-w-sm">{error || 'Server error occurred during fetch.'}</p>
        <button onClick={() => fetchTelemetry()} className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition">
          Reconnect Console
        </button>
      </div>
    );
  }

  // Cost and percentage colors helper
  const getHealthColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'green': return 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40';
      case 'yellow': return 'bg-amber-950/40 text-amber-400 border-amber-900/40';
      case 'red': return 'bg-red-950/40 text-red-400 border-red-900/40';
      default: return 'bg-gray-900 text-gray-400 border-gray-800';
    }
  };

  const getHealthBadgeDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Find max values for custom chart scaling
  const maxEvals = Math.max(...data.chartData.map(d => d.evaluations), 5);
  const maxOcr = Math.max(...data.chartData.map(d => d.ocrRequests), 5);
  const maxLatency = Math.max(...data.chartData.map(d => d.avgLatency), 5);
  const maxCalls = Math.max(...data.chartData.map(d => d.apiCalls), 5);
  const maxErrors = Math.max(...data.chartData.map(d => d.errorsCount), 5);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/80 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-800/80 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Founder Dashboard
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Auto-refreshes every 30s
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2.5">
            Write2Rank Premium Operations <Sparkles className="text-indigo-400 h-5 w-5 animate-pulse" />
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Real-time pipeline metrics, model failovers, cost indexes, and system errors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[10px] text-gray-500">
            <div>Last Telemetry Fetch:</div>
            <div className="font-mono text-gray-300 mt-0.5">{lastUpdated.toLocaleTimeString()}</div>
          </div>
          <button 
            onClick={() => fetchTelemetry(true)} 
            disabled={refreshing}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Polling...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Grid: Bento Platform statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Evaluations Card */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition duration-200 flex items-center justify-between shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Evaluations</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{data.platform.totalEvaluations}</h3>
            <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1.5">
              Today: <span className="text-indigo-400 font-semibold">{data.platform.evalsToday}</span> • Week: <span className="text-indigo-400 font-semibold">{data.platform.evalsThisWeek}</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 group-hover:scale-105 transition">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* OCR Success Rate */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition duration-200 flex items-center justify-between shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">OCR Success Rate</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{data.ocr.ocrSuccessRate}%</h3>
            <p className="text-gray-400 text-[10px] mt-1">
              Fail Rate: <span className="text-red-400 font-semibold">{data.ocr.ocrFailureRate}%</span>
            </p>
          </div>
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 group-hover:scale-105 transition">
            <Binary className="h-5 w-5" />
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition duration-200 flex items-center justify-between shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Avg Latency Time</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{(data.platform.avgResponseTime / 1000).toFixed(2)}s</h3>
            <p className="text-gray-400 text-[10px] mt-1">
              AI: <span className="text-purple-400 font-semibold">{(data.platform.avgEvaluationTime / 1000).toFixed(2)}s</span> • OCR: <span className="text-cyan-400 font-semibold">{(data.ocr.avgOcrTime / 1000).toFixed(2)}s</span>
            </p>
          </div>
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 group-hover:scale-105 transition">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Monthly Cost */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition duration-200 flex items-center justify-between shadow-lg backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Estimated Monthly Cost</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-400">${data.cost.monthlyGeminiCost.toFixed(4)}</h3>
            <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
              Today: <span className="text-emerald-400 font-semibold">${data.cost.todayGeminiCost.toFixed(5)}</span> 
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-105 transition">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Grid: Health Status & Operations Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Main Operations Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Platform Statistics */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
              <Layers className="h-4 w-4 text-indigo-400" /> Platform Operations Metrics
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Successful Evals</span>
                <span className="text-xl font-bold text-white block mt-1">{data.platform.successfulEvaluations}</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Failed Evals</span>
                <span className="text-xl font-bold mt-1 text-red-400 block">{data.platform.failedEvaluations}</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Fastest Evaluation</span>
                <span className="text-xl font-bold mt-1 text-emerald-400 block">{data.performance.fastestEvaluation}s</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Slowest Evaluation</span>
                <span className="text-xl font-bold mt-1 text-amber-400 block">{data.performance.slowestEvaluation}s</span>
              </div>
            </div>
          </div>

          {/* Section: OCR Monitor */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
              <Binary className="h-4 w-4 text-cyan-400" /> OCR Engine Telemetry
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Gemini OCR (Today)</span>
                <span className="text-xl font-bold text-white block mt-1">{data.ocr.geminiOcrRequestsToday}</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Gemini OCR (Month)</span>
                <span className="text-xl font-bold mt-1 text-white block">{data.ocr.geminiOcrRequestsThisMonth}</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Fallback Count</span>
                <span className="text-xl font-bold mt-1 text-amber-400 block">{data.ocr.ocrSpaceFallbackCount}</span>
              </div>
              <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg">
                <span className="text-gray-500 text-[9px] font-bold uppercase">Queue Status</span>
                <span className={`text-xl font-bold mt-1 block ${data.ocr.ocrQueueStatus === 'Idle' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {data.ocr.ocrQueueStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Google Gemini API keys pool */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
              <Key className="h-4 w-4 text-amber-400" /> Google Gemini API Pool Registry
            </h3>

            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-left text-xs text-gray-300">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-bold text-gray-400 uppercase">
                    <th className="px-4 py-3">Slot</th>
                    <th className="px-4 py-3">Masked ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Requests Today</th>
                    <th className="px-4 py-3 text-center">Remaining (Est)</th>
                    <th className="px-4 py-3 text-right">Active Used</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apiKeys.keys.map((key, idx) => (
                    <tr 
                      key={key.slot} 
                      className={`border-b border-gray-900/50 hover:bg-gray-900/10 ${key.isActive ? 'bg-indigo-950/20 border-indigo-900/30' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-white">{key.slot}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">{key.masked}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          key.status === 'Healthy' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-red-950/40 text-red-400 border-red-900/40'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold">{key.todayRequests}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-gray-400">{key.estimatedRemaining}</td>
                      <td className="px-4 py-2.5 text-right">
                        {key.isActive ? (
                          <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[8px] font-bold uppercase px-2 py-0.5 rounded animate-pulse">
                            Current Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500">
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

        {/* Right 1 Col: Health & Feed */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" /> Infrastructure Nodes
              </h3>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full inline-block ${getHealthBadgeDot(data.systemHealth.overall)}`} />
                <span className="text-[10px] font-bold text-white uppercase">{data.systemHealth.overall} Status</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Supabase Database', status: data.systemHealth.supabase, desc: 'Logs & User collections online' },
                { name: 'Google Gemini Gateway', status: data.systemHealth.gemini, desc: 'API Key rotation client online' },
                { name: 'OCR Space Fallbacks', status: data.systemHealth.ocr, desc: 'Handwriting scan failover active' },
                { name: 'RAG Law Index Vectors', status: data.systemHealth.rag, desc: 'ICSI paragraph weights online' },
                { name: 'Operations API routes', status: data.systemHealth.api, desc: 'Telemetry aggregation active' }
              ].map((node) => (
                <div key={node.name} className="flex items-center justify-between bg-gray-950/40 p-2.5 border border-gray-900 rounded-lg">
                  <div>
                    <span className="font-semibold text-white block">{node.name}</span>
                    <span className="text-[9px] text-gray-500 block mt-0.5">{node.desc}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getHealthColor(node.status)}`}>
                    {node.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Free Tier Limits */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
              <Zap className="h-4 w-4 text-amber-400" /> Free Tier Operations Quota
            </h3>

            <div className="space-y-4 text-xs">
              {/* Daily OCR Limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">Daily OCR calls</span>
                  <span className="text-white font-semibold">{data.freeTier.ocrUsedToday} / {data.freeTier.ocrLimit}</span>
                </div>
                <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(data.freeTier.ocrUsedToday / data.freeTier.ocrLimit) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-500 block">Remaining Today: {data.freeTier.ocrRemainingToday} requests</span>
              </div>

              {/* Monthly OCR Limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 font-medium">Monthly OCR limit scale</span>
                  <span className="text-white font-semibold">{data.freeTier.estimatedMonthlyUsage} / 15,000</span>
                </div>
                <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(data.freeTier.estimatedMonthlyUsage / 15000) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-500 block">Remaining Month (Est): {data.freeTier.estimatedMonthlyRemaining} requests</span>
              </div>
            </div>
          </div>

          {/* Cost Indicators */}
          <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" /> Cost Scaling Telemetry
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between bg-gray-950/40 p-2.5 border border-gray-900 rounded-lg">
                <span className="text-gray-400">Avg Cost per Evaluation:</span>
                <span className="font-bold text-white">${data.cost.avgCostPerEval.toFixed(5)}</span>
              </div>
              <div className="flex justify-between bg-gray-950/40 p-2.5 border border-gray-900 rounded-lg">
                <span className="text-gray-400">Avg Tokens per Evaluation:</span>
                <span className="font-bold text-indigo-400">{data.cost.avgTokensPerEval.toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-gray-950/40 p-2.5 border border-gray-900 rounded-lg">
                <span className="text-gray-400">Avg OCR Cost (OCR Space):</span>
                <span className="font-bold text-emerald-400">$0.00000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Custom SVG Charts panel */}
      <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-6">
        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
          <Activity className="h-4 w-4 text-indigo-400" /> Interactive Platform Coordinate Charts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Chart 1: Evaluations & OCR Requests today (Area Chart) */}
          <div className="bg-gray-950 p-4 border border-gray-900 rounded-xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Daily Evaluations & OCR Requests</span>
              <div className="flex gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" /> Evals</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" /> OCR</span>
              </div>
            </div>
            {/* Custom SVG Drawing */}
            <div className="h-44 relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#1f2937" strokeWidth="0.2" />
                {/* Draw Evaluations Area */}
                <path
                  d={`M 0 100 ${data.chartData.map((d, idx) => `L ${(idx / 6) * 100} ${100 - (d.evaluations / maxEvals) * 80}`).join(' ')} L 100 100 Z`}
                  fill="url(#indigoGrad)"
                  opacity="0.3"
                />
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.evaluations / maxEvals) * 80}`).join(' ')}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                />
                {/* Draw OCR Line */}
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.ocrRequests / maxOcr) * 80}`).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="2"
                />
                {/* Definitions */}
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              {/* X Axis Coordinates */}
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1 px-1">
                {data.chartData.map((d) => (
                  <span key={d.date}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Latency Trend (Line Chart) */}
          <div className="bg-gray-950 p-4 border border-gray-900 rounded-xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Evaluation Response Time (Seconds)</span>
              <span className="text-[10px] font-mono text-indigo-400">Peak: {maxLatency.toFixed(2)}s</span>
            </div>
            <div className="h-44 relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#1f2937" strokeWidth="0.2" />
                {/* Draw Latency Line */}
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.avgLatency / maxLatency) * 80}`).join(' ')}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.8"
                />
                {/* Dots on coordinate points */}
                {data.chartData.map((d, idx) => (
                  <circle
                    key={idx}
                    cx={(idx / 6) * 100}
                    cy={100 - (d.avgLatency / maxLatency) * 80}
                    r="1.5"
                    fill="#a855f7"
                  />
                ))}
              </svg>
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1 px-1">
                {data.chartData.map((d) => (
                  <span key={d.date}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: API Calls & Rotations Trend (Stacked Bar Chart) */}
          <div className="bg-gray-950 p-4 border border-gray-900 rounded-xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Google API call volumes</span>
              <span className="text-[10px] text-emerald-400 font-bold">Health check slots OK</span>
            </div>
            <div className="h-44 relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#1f2937" strokeWidth="0.2" />
                {/* Draw Stacked Bars */}
                {data.chartData.map((d, idx) => {
                  const x = (idx / 6) * 100 + 4;
                  const height = (d.apiCalls / maxCalls) * 70;
                  return (
                    <rect
                      key={idx}
                      x={`${x - 2.5}%`}
                      y={`${100 - height}%`}
                      width="5%"
                      height={`${height}%`}
                      fill="#10b981"
                      rx="0.5"
                    />
                  );
                })}
              </svg>
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1 px-1">
                {data.chartData.map((d) => (
                  <span key={d.date}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 4: Errors Registered Over Time (Line Chart) */}
          <div className="bg-gray-950 p-4 border border-gray-900 rounded-xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white">Errors registered over time</span>
              <span className="text-[10px] text-red-400 font-bold">Total Failures: {data.platform.failedEvaluations}</span>
            </div>
            <div className="h-44 relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="100" y2="25" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#1f2937" strokeWidth="0.2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#1f2937" strokeWidth="0.2" />
                {/* Draw Errors Path */}
                <path
                  d={data.chartData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / 6) * 100} ${100 - (d.errorsCount / maxErrors) * 80}`).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
              </svg>
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1 px-1">
                {data.chartData.map((d) => (
                  <span key={d.date}>{d.date}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Grid: Error aggregation logs & activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error monitor */}
        <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Platform Error Monitor
            </h3>
            <span className="bg-red-950/40 text-red-400 border border-red-900/40 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
              Failures Logged
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
            {data.errors.recent.map((err, idx) => (
              <div key={idx} className="bg-gray-950/60 border border-gray-900 p-3 rounded-lg flex items-start gap-3 justify-between">
                <div className="space-y-1">
                  <span className="font-semibold text-gray-200 block">{err.message}</span>
                  <span className="text-[10px] text-gray-500 block">
                    Last Seen: {new Date(err.lastOccurred).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="bg-red-950/20 text-red-400 border border-red-950 text-[9px] px-2 py-0.5 rounded font-bold uppercase block">
                    {err.count} Hits
                  </span>
                </div>
              </div>
            ))}
            {data.errors.recent.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-xs">
                No error failures logged in database.
              </div>
            )}
          </div>
        </div>

        {/* Live activities log feed */}
        <div className="bg-gray-900/20 border border-gray-800/50 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" /> Operations Action Log Timeline
            </h3>
            <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[9px] px-2 py-0.5 rounded font-bold uppercase animate-pulse">
              Live Feed
            </span>
          </div>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1 text-xs">
            {data.liveActivity.map((act) => (
              <div key={act.id} className="relative pl-6 border-l border-gray-800 pb-1 last:pb-0">
                {/* Dot */}
                <div className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-gray-950 ${
                  act.type === 'success' ? 'bg-emerald-400' : act.type === 'error' ? 'bg-red-400' : 'bg-indigo-400'
                }`} />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-200 leading-normal block">{act.event}</span>
                    <span className="text-[9px] text-gray-500 font-mono flex-shrink-0">{act.time}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.liveActivity.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-xs">
                No events currently flowing in operations logs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

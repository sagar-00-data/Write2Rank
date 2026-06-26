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
  Clock
} from 'lucide-react';

interface StatsData {
  platform: { totalUsers: number; activeUsersToday: number; totalEvaluations: number; evalsToday: number };
  ocr: { ocrRequestsToday: number; ocrSuccessRate: number; avgOcrTime: number; ocrFailures: number };
  ai: { geminiRequests: number; tokensUsed: number; avgEvaluationTime: number; failedEvaluations: number };
  cost: { todayGeminiCost: number; monthlyGeminiCost: number; ocrCost: number; estimatedMonthlyTotal: number };
  rag: { documentsIndexed: number; documentsList: string[]; chunks: number; embeddings: number; successfulRetrievals: number; failedRetrievals: number };
  apiKeys: { activeKeys: number; healthyKeys: number; exhaustedKeys: number; rotationStatus: string; keys: Array<{ masked: string; status: string }> };
  errors: { ocrErrors: Array<{ time: string; message: string }>; geminiErrors: Array<{ time: string; message: string }>; ragErrors: Array<{ time: string; message: string }>; buildErrors: Array<{ time: string; message: string }> };
  chartData: Array<{ date: string; evaluations: number; apiCalls: number; activeUsers: number }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/admin/api/stats');
      if (!res.ok) {
        throw new Error('Failed to load telemetry statistics.');
      }
      const json = await res.ok ? await res.json() : null;
      setData(json);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Aggregating telemetry records...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-white">Telemetry Access Failure</h3>
        <p className="text-gray-400 text-sm max-w-md mt-2">{error || 'Unable to retrieve stats.'}</p>
        <button onClick={() => fetchStats()} className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition">
          Retry Connection
        </button>
      </div>
    );
  }

  // Find max chart height to scale CSS bar charts
  const maxVal = Math.max(...data.chartData.map(d => Math.max(d.evaluations, d.apiCalls, d.activeUsers)), 10);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-6 gap-4">
        <div>
          <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-800/80 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Founder Console
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2">
            Write2Rank Platform Metrics <Activity className="text-emerald-500 h-5 w-5" />
          </h1>
          <p className="text-gray-400 text-xs mt-1">Real-time usage tracking, RAG, API keys health, and live telemetry.</p>
        </div>
        <button 
          onClick={() => fetchStats(true)} 
          disabled={refreshing}
          className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition flex items-center gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Grid: Overview Bento boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-gray-900/40 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Users</p>
            <h3 className="text-2xl font-bold mt-1.5 text-white">{data.platform.totalUsers}</h3>
            <p className="text-emerald-400 text-[10px] font-medium mt-1 flex items-center gap-1">
              Active Today: {data.platform.activeUsersToday}
            </p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Total Evaluations */}
        <div className="bg-gray-900/40 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Evaluations</p>
            <h3 className="text-2xl font-bold mt-1.5 text-white">{data.platform.totalEvaluations}</h3>
            <p className="text-gray-400 text-[10px] mt-1">
              Evaluations Today: <span className="text-indigo-400 font-semibold">{data.platform.evalsToday}</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* OCR Request Health */}
        <div className="bg-gray-900/40 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">OCR Success Rate</p>
            <h3 className="text-2xl font-bold mt-1.5 text-white">{data.ocr.ocrSuccessRate}%</h3>
            <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1.5">
              Avg Scan: <span className="text-indigo-400 font-semibold">{(data.ocr.avgOcrTime / 1000).toFixed(2)}s</span>
            </p>
          </div>
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Binary className="h-5 w-5" />
          </div>
        </div>

        {/* Accrued Cost */}
        <div className="bg-gray-900/40 border border-gray-800/60 rounded-xl p-5 hover:border-gray-700 transition flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Accrued API Cost</p>
            <h3 className="text-2xl font-bold mt-1.5 text-emerald-400">${data.cost.estimatedMonthlyTotal.toFixed(4)}</h3>
            <p className="text-gray-400 text-[10px] mt-1">
              Today's Gemini: <span className="text-emerald-400 font-semibold">${data.cost.todayGeminiCost.toFixed(5)}</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Charts & Key Usage Section */}
      <div id="api-usage" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custom CSS Chart Card */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" /> Platform Usage (Last 7 Days)
            </h3>
            <div className="flex gap-4 text-[10px] font-semibold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500 inline-block" /> Evals</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> API Calls</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500 inline-block" /> Active Users</span>
            </div>
          </div>

          {/* Simple Custom Bar Graph */}
          <div className="h-52 flex items-end justify-between gap-2 border-b border-gray-800/80 pb-2 pt-6">
            {data.chartData.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Evaluations Bar */}
                  <div 
                    title={`${day.evaluations} Evaluations`}
                    style={{ height: `${(day.evaluations / maxVal) * 100}%` }}
                    className="w-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all duration-300"
                  />
                  {/* API Calls Bar */}
                  <div 
                    title={`${day.apiCalls} API Calls`}
                    style={{ height: `${(day.apiCalls / maxVal) * 100}%` }}
                    className="w-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all duration-300"
                  />
                  {/* Active Users Bar */}
                  <div 
                    title={`${day.activeUsers} Active Users`}
                    style={{ height: `${(day.activeUsers / maxVal) * 100}%` }}
                    className="w-2.5 bg-amber-500 hover:bg-amber-400 rounded-t transition-all duration-300"
                  />
                </div>
                <span className="text-[9px] text-gray-500 font-semibold uppercase">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Cost Breakdowns */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" /> API Cost Projections
          </h3>
          <div className="space-y-3.5 text-xs">
            <div className="bg-gray-950/80 p-3.5 border border-gray-900 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Gemini Cost Today:</span>
                <span className="font-semibold text-gray-200">${data.cost.todayGeminiCost.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gemini Cost This Month:</span>
                <span className="font-semibold text-gray-200">${data.cost.monthlyGeminiCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                <span className="text-gray-400 font-medium">Est. Monthly Total:</span>
                <span className="font-bold text-emerald-400">${data.cost.estimatedMonthlyTotal.toFixed(3)}</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 leading-relaxed bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg">
              📈 Gemini cost based on Gemini 3.5 Flash Model: input tokens ($0.075 / 1M) and output tokens ($0.30 / 1M).
            </div>
          </div>
        </div>
      </div>

      {/* OCR and RAG details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR section */}
        <div id="ocr" className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Binary className="h-4 w-4 text-cyan-400" /> OCR Engine Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Requests Today</span>
              <span className="text-xl font-bold mt-1 text-white block">{data.ocr.ocrRequestsToday}</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Average Latency</span>
              <span className="text-xl font-bold mt-1 text-indigo-400 block">{(data.ocr.avgOcrTime / 1000).toFixed(2)}s</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Success Rate</span>
              <span className="text-xl font-bold mt-1 text-emerald-400 block">{data.ocr.ocrSuccessRate}%</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Total Failures</span>
              <span className="text-xl font-bold mt-1 text-red-400 block">{data.ocr.ocrFailures}</span>
            </div>
          </div>
        </div>

        {/* RAG section */}
        <div id="rag" className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-400" /> RAG Knowledge & Retrieval
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Documents Indexed</span>
              <span className="text-xl font-bold mt-1 text-white block">{data.rag.documentsIndexed}</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Total Chunks / Vectors</span>
              <span className="text-xl font-bold mt-1 text-indigo-400 block">{data.rag.chunks}</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Successful Retrievals</span>
              <span className="text-xl font-bold mt-1 text-emerald-400 block">{data.rag.successfulRetrievals}</span>
            </div>
            <div className="bg-gray-950 p-4 border border-gray-900 rounded-lg text-center">
              <span className="text-gray-400 text-[10px] font-semibold block uppercase">Failed Retrievals</span>
              <span className="text-xl font-bold mt-1 text-red-400 block">{data.rag.failedRetrievals}</span>
            </div>
          </div>
          {data.rag.documentsList.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="text-gray-400 block mb-1 font-semibold">Indexed Sources:</span>
              <div className="flex flex-wrap gap-1.5">
                {data.rag.documentsList.map((doc, idx) => (
                  <span key={idx} className="bg-gray-950 border border-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key Rotation Pool */}
      <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400" /> API Keys & Rotations
          </h3>
          <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">
            Rotation: {data.apiKeys.rotationStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-950 p-3.5 border border-gray-900 rounded-lg text-center">
            <span className="text-gray-400 text-[9px] font-semibold block uppercase">Active Pool</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{data.apiKeys.activeKeys}</span>
          </div>
          <div className="bg-gray-950 p-3.5 border border-gray-900 rounded-lg text-center">
            <span className="text-gray-400 text-[9px] font-semibold block uppercase">Healthy Pool</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{data.apiKeys.healthyKeys}</span>
          </div>
          <div className="bg-gray-950 p-3.5 border border-gray-900 rounded-lg text-center">
            <span className="text-gray-400 text-[9px] font-semibold block uppercase">Exhausted Keys</span>
            <span className="text-lg font-bold mt-0.5 block text-gray-400">{data.apiKeys.exhaustedKeys}</span>
          </div>
          <div className="bg-gray-950 p-3.5 border border-gray-900 rounded-lg text-center">
            <span className="text-gray-400 text-[9px] font-semibold block uppercase">Failover Status</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">Healthy</span>
          </div>
        </div>

        <div className="bg-gray-950 rounded-lg border border-gray-900 overflow-hidden text-xs">
          <div className="bg-gray-900/40 px-4 py-2 border-b border-gray-900 text-gray-400 font-semibold">
            Rotational Key Pool Registry
          </div>
          <table className="w-full text-left">
            <tbody>
              {data.apiKeys.keys.map((key, idx) => (
                <tr key={idx} className="border-b border-gray-900/50 hover:bg-gray-900/10">
                  <td className="px-4 py-2.5 font-medium text-gray-300">Key Slot {idx + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-500">{key.masked}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-[9px] px-2 py-0.5 rounded font-semibold uppercase">
                      {key.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.apiKeys.keys.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                    No keys found in environment variables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Logs / Failures */}
      <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" /> Recent Errors
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gemini Errors */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 block border-b border-gray-800 pb-1.5">
              Gemini & AI Failures ({data.errors.geminiErrors.length})
            </span>
            {data.errors.geminiErrors.length === 0 ? (
              <span className="text-[10px] text-gray-500 block">No failures registered.</span>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {data.errors.geminiErrors.map((err, idx) => (
                  <div key={idx} className="bg-red-950/20 border border-red-900/20 p-2.5 rounded text-[10px]">
                    <span className="text-gray-500 font-mono block mb-1">
                      {new Date(err.time).toLocaleString()}
                    </span>
                    <span className="text-red-300/90 leading-normal">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OCR Errors */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 block border-b border-gray-800 pb-1.5">
              OCR Engine Failures ({data.errors.ocrErrors.length})
            </span>
            {data.errors.ocrErrors.length === 0 ? (
              <span className="text-[10px] text-gray-500 block">No failures registered.</span>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {data.errors.ocrErrors.map((err, idx) => (
                  <div key={idx} className="bg-red-950/20 border border-red-900/20 p-2.5 rounded text-[10px]">
                    <span className="text-gray-500 font-mono block mb-1">
                      {new Date(err.time).toLocaleString()}
                    </span>
                    <span className="text-red-300/90 leading-normal">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RAG Retrieval Errors */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 block border-b border-gray-800 pb-1.5">
              RAG & Retrieval Failures ({data.errors.ragErrors.length})
            </span>
            {data.errors.ragErrors.length === 0 ? (
              <span className="text-[10px] text-gray-500 block">No failures registered.</span>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {data.errors.ragErrors.map((err, idx) => (
                  <div key={idx} className="bg-red-950/20 border border-red-900/20 p-2.5 rounded text-[10px]">
                    <span className="text-gray-500 font-mono block mb-1">
                      {new Date(err.time).toLocaleString()}
                    </span>
                    <span className="text-red-300/90 leading-normal">{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

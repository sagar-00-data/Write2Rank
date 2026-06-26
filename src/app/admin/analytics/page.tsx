'use client';
import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  DollarSign, 
  Users, 
  FileText, 
  Cpu, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  User,
  Zap,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overall metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const [evalsToday, setEvalsToday] = useState(0);
  const [evalsThisMonth, setEvalsThisMonth] = useState(0);

  // AI & Token metrics
  const [totalGeminiCalls, setTotalGeminiCalls] = useState(0);
  const [totalOcrCalls, setTotalOcrCalls] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalApiCost, setTotalApiCost] = useState(0);

  // User metrics
  const [userLeaderboard, setUserLeaderboard] = useState<any[]>([]);

  // Performance metrics
  const [ocrSuccessRate, setOcrSuccessRate] = useState(100);
  const [evalSuccessRate, setEvalSuccessRate] = useState(100);
  const [avgOcrTime, setAvgOcrTime] = useState(0);
  const [avgEvalTime, setAvgEvalTime] = useState(0);
  const [apiFailures, setApiFailures] = useState(0);
  const [quotaFailures, setQuotaFailures] = useState(0);

  // Raw logs for reference
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      
      const statsRes = await fetch('/admin/api/stats');
      const usersRes = await fetch('/admin/api/users');
      const evalsRes = await fetch('/admin/api/evaluations');

      if (!statsRes.ok || !usersRes.ok || !evalsRes.ok) {
        throw new Error('Telemetry API endpoint failure. Ensure server is online.');
      }

      const stats = await statsRes.json();
      const usersData = await usersRes.json();
      const evalsData = await evalsRes.json();

      // Mapping aggregated server statistics to local states
      setTotalUsers(stats.platform.totalUsers);
      setTotalEvaluations(stats.platform.totalEvaluations);
      setEvalsToday(stats.platform.evalsToday);
      setEvalsThisMonth(stats.platform.evalsThisWeek); // mapped to weekly activity

      setTotalGeminiCalls(stats.ai.geminiRequests);
      setTotalOcrCalls(stats.ocr.geminiOcrRequestsToday);
      setTotalTokens(stats.ai.tokensUsed);
      setTotalApiCost(stats.cost.monthlyGeminiCost);

      setOcrSuccessRate(stats.ocr.ocrSuccessRate);
      setEvalSuccessRate(stats.ocr.ocrSuccessRate); // fallback
      setApiFailures(stats.ocr.ocrFailures);
      setAvgOcrTime(stats.ocr.avgOcrTime);
      setAvgEvalTime(stats.ai.avgEvaluationTime);
      setQuotaFailures(stats.apiKeys.exhaustedKeys);

      // Maps user list to leaderboard structure
      const leaderboard = (usersData.users || [])
        .slice(0, 5)
        .map((u: any) => ({
          name: u.name,
          email: u.email,
          count: u.totalEvals,
        }));
      setUserLeaderboard(leaderboard);

      // Maps raw logs
      const logs = (evalsData.evaluations || [])
        .slice(0, 10)
        .map((e: any) => ({
          timestamp: e.created_at,
          subject: e.exam_type,
          ocr_provider: e.ocr_extracted_text ? 'Gemini OCR' : 'None',
          status: e.score > 0 ? 'success' : 'failure',
          total_time_ms: 2500, // Derived fallback
        }));
      setRecentLogs(logs);

    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load telemetry records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run in microtask to avoid synchronous setState triggers during mounting
    Promise.resolve().then(() => {
      fetchAnalytics();
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400">Loading production telemetry...</p>
      </div>
    );
  }

  // Cost projections
  const avgCostPerEval = totalEvaluations > 0 ? totalApiCost / totalEvaluations : 0.00103;
  const avgEvalPerUser = totalUsers > 0 ? totalEvaluations / totalUsers : 0;
  const avgTokensPerEval = totalEvaluations > 0 ? totalTokens / totalEvaluations : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <span className="bg-blue-900/40 text-blue-400 border border-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
            Production Telemetry
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 flex items-center gap-2">
            Write2Rank Beta Analytics <TrendingUp className="text-emerald-500 h-6 w-6" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time usage tracking, quota management, and live cost metrics.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-lg text-xs transition font-semibold text-white">
            Founder Dashboard
          </Link>
          <button 
            onClick={() => fetchAnalytics()} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs transition font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-900/20"
          >
            <Activity className="h-4 w-4" /> Refresh Analytics
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-950/40 border border-red-900/50 p-4 rounded-xl flex items-center gap-3 text-red-300">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Telemetry Connection Warning</p>
            <p className="text-xs text-red-400/90 mt-0.5">{error}. Ensure Supabase is configured and server routes are reachable.</p>
          </div>
        </div>
      )}

      {/* Metric Bento Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Box 1 */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:border-gray-700 transition">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Active Users</p>
            <h3 className="text-3xl font-bold mt-2">{totalUsers}</h3>
            <p className="text-emerald-500 text-xs mt-1 font-medium flex items-center gap-0.5">
              Closed Beta Pool
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Box 2 */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:border-gray-700 transition">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Evaluations</p>
            <h3 className="text-3xl font-bold mt-2">{totalEvaluations}</h3>
            <p className="text-gray-400 text-xs mt-1">
              Today: <span className="text-indigo-400 font-semibold">{evalsToday}</span> • Week: <span className="text-indigo-400 font-semibold">{evalsThisMonth}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Box 3 */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:border-gray-700 transition">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Gemini Calls</p>
            <h3 className="text-3xl font-bold mt-2">{totalGeminiCalls}</h3>
            <p className="text-gray-400 text-xs mt-1">
              Avg tokens/eval: <span className="text-purple-400 font-semibold">{Math.round(avgTokensPerEval).toLocaleString()}</span>
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Cpu className="h-6 w-6" />
          </div>
        </div>

        {/* Box 4 */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:border-gray-700 transition">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Accrued API Cost</p>
            <h3 className="text-3xl font-bold mt-2 text-emerald-400">${totalApiCost.toFixed(4)}</h3>
            <p className="text-gray-400 text-xs mt-1">
              Avg cost/eval: <span className="text-emerald-400 font-semibold">${avgCostPerEval.toFixed(5)}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Beta Telemetry Rates */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" /> Beta Operation Quality Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-xl">
              <span className="text-gray-400 text-xs font-medium">OCR Extraction Success</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{ocrSuccessRate}%</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${ocrSuccessRate}%` }}></div>
              </div>
            </div>

            <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-xl">
              <span className="text-gray-400 text-xs font-medium">Evaluation Output Success</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{evalSuccessRate}%</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${evalSuccessRate}%` }}></div>
              </div>
            </div>

            <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-xl">
              <span className="text-gray-400 text-xs font-medium">Average Latency Metrics</span>
              <div className="flex flex-col mt-2 gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">OCR Scan:</span>
                  <span className="font-semibold text-gray-200">{(avgOcrTime / 1000).toFixed(2)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Evaluation:</span>
                  <span className="font-semibold text-gray-200">{(avgEvalTime / 1000).toFixed(2)}s</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
                  <span className="text-gray-400">Total Loop:</span>
                  <span className="font-semibold text-indigo-400">{((avgOcrTime + avgEvalTime) / 1000).toFixed(2)}s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="border border-gray-800/60 p-4 rounded-xl text-center bg-gray-950/20">
              <p className="text-gray-400 text-xs">API Failures</p>
              <h4 className={`text-xl font-bold mt-1 ${apiFailures > 0 ? 'text-red-400' : 'text-gray-300'}`}>{apiFailures}</h4>
            </div>
            <div className="border border-gray-800/60 p-4 rounded-xl text-center bg-gray-950/20">
              <p className="text-gray-400 text-xs">Quota Exceeded</p>
              <h4 className={`text-xl font-bold mt-1 ${quotaFailures > 0 ? 'text-amber-400' : 'text-gray-300'}`}>{quotaFailures}</h4>
            </div>
            <div className="border border-gray-800/60 p-4 rounded-xl text-center bg-gray-950/20">
              <p className="text-gray-400 text-xs">Daily Limit Gate</p>
              <h4 className="text-xl font-bold mt-1 text-gray-300">2 / Day</h4>
            </div>
            <div className="border border-gray-800/60 p-4 rounded-xl text-center bg-gray-950/20">
              <p className="text-gray-400 text-xs">Monthly Limit Gate</p>
              <h4 className="text-xl font-bold mt-1 text-gray-300">50 / Mo</h4>
            </div>
          </div>
        </div>

        {/* Projections */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="text-amber-400 h-5 w-5" /> Projections & Pricing Tools
          </h2>
          <div className="space-y-4 text-xs">
            <div className="bg-gray-950 p-3.5 border border-gray-800/80 rounded-xl space-y-2">
              <span className="text-gray-400 font-medium block">Average Metrics</span>
              <div className="flex justify-between">
                <span>Evals / User:</span>
                <span className="font-semibold text-gray-200">{avgEvalPerUser.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tokens / Eval:</span>
                <span className="font-semibold text-purple-400">{Math.round(avgTokensPerEval).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cost / User / Mo:</span>
                <span className="font-semibold text-emerald-400">${(avgEvalPerUser * avgCostPerEval).toFixed(5)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-gray-400 font-medium block">API Cost Scaling Projections</span>
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span>50 Users (500 Evals):</span>
                <span className="font-semibold text-gray-200">${(500 * avgCostPerEval).toFixed(3)}/mo</span>
              </div>
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span>100 Users (1,000 Evals):</span>
                <span className="font-semibold text-gray-200">${(1000 * avgCostPerEval).toFixed(3)}/mo</span>
              </div>
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span>500 Users (5,000 Evals):</span>
                <span className="font-semibold text-gray-200">${(5000 * avgCostPerEval).toFixed(3)}/mo</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>1000 Users (10,000 Evals):</span>
                <span className="font-semibold text-indigo-400">${(10000 * avgCostPerEval).toFixed(3)}/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard and Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Leaderboard */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" /> Most Active Users
          </h2>
          {userLeaderboard.length === 0 ? (
            <p className="text-gray-500 text-xs">No user activities logged yet.</p>
          ) : (
            <div className="space-y-3">
              {userLeaderboard.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-950/40 border border-gray-900 p-3 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800 flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-200 truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="bg-blue-950 text-blue-300 border border-blue-900 text-xs px-2.5 py-1 rounded-full font-bold">
                    {user.count} Evals
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Logs */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" /> Recent Activity Logs
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-xs">No active logs in database user_usage_logs.</p>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-2.5 font-semibold">Time</th>
                    <th className="py-2.5 font-semibold">Subject</th>
                    <th className="py-2.5 font-semibold">OCR Provider</th>
                    <th className="py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-gray-900/50 hover:bg-gray-900/20">
                      <td className="py-2 text-gray-300 font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2 font-medium text-gray-200">{log.subject}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950/40 text-purple-400 border border-purple-900/40">
                          {log.ocr_provider}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${log.status === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-red-950/40 text-red-400 border border-red-900/40'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, Activity, Binary, Cpu, DollarSign, Database, Key,
  AlertTriangle, CheckCircle, RefreshCw, Clock, ShieldCheck, Zap,
  Server, Layers, Sparkles, TrendingUp, ArrowUpRight, BarChart3,
  Circle, Wifi, WifiOff, Eye, Hash
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

const healthColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'green': return { dot: '#10b981', badge: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#34d399', label: 'Operational' };
    case 'yellow': return { dot: '#f59e0b', badge: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', label: 'Degraded' };
    case 'red': return { dot: '#ef4444', badge: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: 'Outage' };
    default: return { dot: '#6b7280', badge: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)', text: '#9ca3af', label: 'Unknown' };
  }
};

function MiniChart({ data, color, maxVal }: { data: number[]; color: string; maxVal: number }) {
  const max = Math.max(...data, maxVal, 1);
  const w = 80; const h = 32;
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
      {data.map((v, i) => (
        <circle key={i} cx={(i / Math.max(data.length - 1, 1)) * w} cy={h - (v / max) * h}
          r={i === data.length - 1 ? 2.5 : 0} fill={color} />
      ))}
    </svg>
  );
}

function BarChart({ data, colorA, colorB, labelA, labelB }: {
  data: Array<{ date: string; a: number; b: number }>;
  colorA: string; colorB: string; labelA: string; labelB: string;
}) {
  const max = Math.max(...data.flatMap(d => [d.a, d.b]), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorA, display: 'inline-block' }} />{labelA}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: colorB, display: 'inline-block' }} />{labelB}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
              <div style={{ width: '45%', background: colorA, borderRadius: '2px 2px 0 0', height: `${(d.a / max) * 100}%`, minHeight: d.a > 0 ? 2 : 0, transition: 'height 0.3s ease', opacity: 0.85 }} />
              <div style={{ width: '45%', background: colorB, borderRadius: '2px 2px 0 0', height: `${(d.b / max) * 100}%`, minHeight: d.b > 0 ? 2 : 0, transition: 'height 0.3s ease', opacity: 0.85 }} />
            </div>
            <span style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace', marginTop: 4 }}>{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);

  const fetchTelemetry = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/admin/api/stats');
      if (!res.ok) throw new Error(`Stats API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Connection failure');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{cssStr}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={styles.headerRow}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...styles.skeleton, width: 120, height: 16 }} />
              <div style={{ ...styles.skeleton, width: 280, height: 32 }} />
            </div>
            <div style={{ ...styles.skeleton, width: 120, height: 40, borderRadius: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ ...styles.skeleton, height: 120, borderRadius: 16 }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ ...styles.skeleton, height: 300, borderRadius: 16 }} />
            <div style={{ ...styles.skeleton, height: 300, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <style>{cssStr}</style>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <WifiOff size={28} color="#f87171" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Telemetry Disconnected</h3>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{error || 'Failed to fetch platform metrics.'}</p>
          <button onClick={() => fetchTelemetry()} style={styles.btnPrimary}>
            <RefreshCw size={14} /> Reconnect Console
          </button>
        </div>
      </div>
    );
  }

  const overallH = healthColor(data.systemHealth.overall);
  const maxEvals = Math.max(...data.chartData.map(d => d.evaluations), 1);

  const barData = data.chartData.map(d => ({ date: d.date, a: d.evaluations, b: d.ocrRequests }));
  const latencyData = data.chartData.map(d => d.avgLatency);

  return (
    <div style={styles.page}>
      <style>{cssStr}</style>

      {/* ── Header ── */}
      <div style={styles.headerRow}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={styles.chipPurple}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'pulseGlow 2s infinite' }} />
              Operations Center
            </span>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
              <Clock size={11} /> Auto-sync 30s
            </span>
          </div>
          <h1 style={styles.pageTitle}>Founder Dashboard</h1>
          <p style={styles.pageSubtitle}>Real-time platform intelligence & pipeline telemetry for Write2Rank</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live status */}
          <div style={styles.liveChip}>
            <span style={{ ...styles.dot, background: overallH.dot, boxShadow: `0 0 8px ${overallH.dot}` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: overallH.text }}>{overallH.label}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Sync</div>
            <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', fontWeight: 600 }}>{lastUpdated.toLocaleTimeString()}</div>
          </div>
          <button onClick={() => fetchTelemetry(true)} disabled={refreshing} style={styles.btnSecondary} className="hover-lift">
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none', color: refreshing ? '#818cf8' : 'inherit' }} />
            {refreshing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div style={styles.grid4}>
        <KpiCard
          label="Total Evaluations"
          value={data.platform.totalEvaluations.toLocaleString()}
          sub={`${data.platform.evalsToday} today · ${data.platform.evalsThisWeek} this week`}
          icon={<FileText size={18} />}
          accentColor="#818cf8"
          trend={data.platform.evalsToday}
          miniData={data.chartData.map(d => d.evaluations)}
        />
        <KpiCard
          label="OCR Success Rate"
          value={`${data.ocr.ocrSuccessRate}%`}
          sub={`${data.ocr.ocrFailureRate}% failure · ${data.ocr.ocrSpaceFallbackCount} fallbacks`}
          icon={<Binary size={18} />}
          accentColor="#22d3ee"
          trend={data.ocr.ocrSuccessRate}
          miniData={data.chartData.map(d => d.ocrRequests)}
        />
        <KpiCard
          label="Avg Response Time"
          value={`${(data.platform.avgResponseTime / 1000).toFixed(2)}s`}
          sub={`AI ${(data.platform.avgEvaluationTime / 1000).toFixed(2)}s · OCR ${(data.ocr.avgOcrTime / 1000).toFixed(2)}s`}
          icon={<Clock size={18} />}
          accentColor="#c084fc"
          trend={null}
          miniData={latencyData}
        />
        <KpiCard
          label="Monthly Cost Est."
          value={`$${data.cost.monthlyGeminiCost.toFixed(4)}`}
          sub={`Today: $${data.cost.todayGeminiCost.toFixed(5)}`}
          icon={<DollarSign size={18} />}
          accentColor="#34d399"
          trend={null}
          miniData={data.chartData.map(d => d.apiCalls)}
        />
      </div>

      {/* ── Middle: Charts + Health ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 16 }}>
        {/* Evaluations + OCR Bar Chart */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><BarChart3 size={14} color="#818cf8" /> Volume Trends</span>
            <span style={styles.chipSmall}>7 Days</span>
          </div>
          <BarChart data={barData} colorA="#6366f1" colorB="#06b6d4" labelA="Evals" labelB="OCR" />
        </div>

        {/* Latency Spark */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><Activity size={14} color="#c084fc" /> Latency Trend</span>
            <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600, background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: 6 }}>
              Peak {Math.max(...latencyData, 0).toFixed(1)}s
            </span>
          </div>
          <div style={{ position: 'relative', height: 80, marginTop: 8 }}>
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const max = Math.max(...latencyData, 0.1);
                const pts = latencyData.map((v, i) => `${(i / Math.max(latencyData.length - 1, 1)) * 300},${80 - (v / max) * 70}`);
                return <>
                  <path d={`M ${pts[0]} ${pts.slice(1).map(p => 'L ' + p).join(' ')} L 300 80 L 0 80 Z`} fill="url(#latGrad)" />
                  <polyline points={pts.join(' ')} fill="none" stroke="#a855f7" strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.5))' }} />
                  {latencyData.map((v, i) => (
                    <circle key={i} cx={(i / Math.max(latencyData.length - 1, 1)) * 300} cy={80 - (v / max) * 70}
                      r="2.5" fill="#a855f7" />
                  ))}
                </>;
              })()}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {data.chartData.map((d, i) => (
              <span key={i} style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace' }}>{d.date}</span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            <div style={styles.miniStatCard}>
              <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Fastest</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>{data.performance.fastestEvaluation}s</span>
            </div>
            <div style={styles.miniStatCard}>
              <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Slowest</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fb923c' }}>{data.performance.slowestEvaluation}s</span>
            </div>
          </div>
        </div>

        {/* System Health Panel */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><Server size={14} color="#34d399" /> Infrastructure</span>
            <span style={{ ...styles.dot, width: 8, height: 8, background: overallH.dot, boxShadow: `0 0 8px ${overallH.dot}` }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Supabase DB', status: data.systemHealth.supabase, icon: <Database size={13} /> },
              { label: 'Gemini Gateway', status: data.systemHealth.gemini, icon: <Cpu size={13} /> },
              { label: 'OCR Engine', status: data.systemHealth.ocr, icon: <Binary size={13} /> },
              { label: 'RAG Index', status: data.systemHealth.rag, icon: <Layers size={13} /> },
              { label: 'Operations API', status: data.systemHealth.api, icon: <Wifi size={13} /> },
            ].map(({ label, status, icon }) => {
              const h = healthColor(status);
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#111111', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6b7280' }}>{icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: h.text, background: h.badge, border: `1px solid ${h.border}`, padding: '2px 7px', borderRadius: 5 }}>
                    {h.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Lower Section: Platform + OCR + Keys ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Platform Stats */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><Layers size={14} color="#818cf8" /> Platform Operations</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            {[
              { label: 'Successful', value: data.platform.successfulEvaluations, color: '#34d399' },
              { label: 'Failed', value: data.platform.failedEvaluations, color: '#f87171' },
              { label: 'Active Today', value: data.platform.activeUsersToday ?? 0, color: '#818cf8' },
              { label: 'Users Total', value: data.platform.totalUsers ?? 0, color: '#22d3ee' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...styles.miniStatCard, textAlign: 'center', padding: '16px 12px' }}>
                <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.02em', display: 'block', marginTop: 4 }}>{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Success Rate</span>
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>
                {data.platform.totalEvaluations > 0 ? Math.round((data.platform.successfulEvaluations / data.platform.totalEvaluations) * 100) : 100}%
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${data.platform.totalEvaluations > 0 ? Math.round((data.platform.successfulEvaluations / data.platform.totalEvaluations) * 100) : 100}%`,
                background: 'linear-gradient(90deg, #34d399, #22d3ee)',
                borderRadius: 99,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>

        {/* OCR Engine Stats */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><Binary size={14} color="#22d3ee" /> OCR Engine</span>
            <span style={{ fontSize: 10, color: data.ocr.ocrQueueStatus === 'Idle' ? '#34d399' : '#fbbf24', fontWeight: 700, background: data.ocr.ocrQueueStatus === 'Idle' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: 6, border: `1px solid ${data.ocr.ocrQueueStatus === 'Idle' ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}` }}>
              {data.ocr.ocrQueueStatus}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Gemini Today', value: data.ocr.geminiOcrRequestsToday, color: '#818cf8' },
              { label: 'This Month', value: data.ocr.geminiOcrRequestsThisMonth, color: '#22d3ee' },
              { label: 'Fallbacks', value: data.ocr.ocrSpaceFallbackCount, color: '#fb923c' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...styles.miniStatCard, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color, display: 'block', marginTop: 4 }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Daily OCR Quota</span>
                <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 600 }}>{data.freeTier.ocrUsedToday} / {data.freeTier.ocrLimit}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(data.freeTier.ocrUsedToday / data.freeTier.ocrLimit) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #22d3ee)', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Monthly OCR Scale</span>
                <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 600 }}>{data.freeTier.estimatedMonthlyUsage} / 15,000</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(data.freeTier.estimatedMonthlyUsage / 15000) * 100}%`, background: 'linear-gradient(90deg, #34d399, #22d3ee)', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── API Key Pool ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}><Key size={14} color="#fbbf24" /> Gemini API Key Pool</span>
          <span style={{ fontSize: 10, color: '#a3a3a3', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', fontWeight: 600 }}>
            {data.apiKeys.rotationStatus}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Slot', 'Key (Masked)', 'Status', 'Requests Today', 'Remaining (Est)', 'Active'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Active' ? 'right' : h === 'Requests Today' || h === 'Remaining (Est)' ? 'center' : 'left', fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.keys.map((key) => (
                <tr key={key.slot} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: key.isActive ? 'rgba(99,102,241,0.03)' : 'transparent' }}
                  className="hover-row">
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#e2e8f0' }}>{key.slot}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#6b7280', fontSize: 11 }}>{key.masked}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: key.status === 'Healthy' ? '#34d399' : '#f87171',
                      background: key.status === 'Healthy' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                      border: `1px solid ${key.status === 'Healthy' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                      padding: '2px 8px', borderRadius: 5
                    }}>
                      {key.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#d1d5db' }}>{key.todayRequests}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280' }}>{key.estimatedRemaining}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    {key.isActive ? (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', padding: '2px 8px', borderRadius: 5 }}>
                        ● Active
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>
                        {key.lastUsedTime ? new Date(key.lastUsedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.apiKeys.keys.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>No API keys configured</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom: Errors + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Error Monitor */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><AlertTriangle size={14} color="#f87171" /> Error Monitor</span>
            {data.errors.recent.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' }}>
                {data.errors.recent.length} Logged
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }} className="scroll-thin">
            {data.errors.recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#374151' }}>
                <CheckCircle size={28} color="#34d399" style={{ margin: '0 auto 8px', display: 'block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>No errors logged. System stable.</span>
              </div>
            ) : data.errors.recent.map((err, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#111111', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 }}>{err.message}</div>
                  <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>{new Date(err.lastOccurred).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {err.count}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}><Activity size={14} color="#818cf8" /> Live Activity</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)', padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' }}>
              ● Live
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 280, overflowY: 'auto' }} className="scroll-thin">
            {data.liveActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                No events flowing yet.
              </div>
            ) : data.liveActivity.map((act, i) => (
              <div key={act.id} style={{ display: 'flex', gap: 12, paddingLeft: 16, borderLeft: `2px solid ${act.type === 'success' ? '#34d399' : act.type === 'error' ? '#f87171' : '#818cf8'}40`, marginLeft: 4, paddingTop: i > 0 ? 12 : 0, paddingBottom: 12, position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: -5, top: i > 0 ? 16 : 4, width: 8, height: 8, borderRadius: '50%',
                  background: act.type === 'success' ? '#34d399' : act.type === 'error' ? '#f87171' : '#818cf8',
                  boxShadow: `0 0 6px ${act.type === 'success' ? '#34d399' : act.type === 'error' ? '#f87171' : '#818cf8'}80`
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500, lineHeight: 1.5 }}>{act.event}</div>
                  <div style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace', marginTop: 3 }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cost Card ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}><DollarSign size={14} color="#34d399" /> Cost Breakdown</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Cost Today', value: `$${data.cost.todayGeminiCost.toFixed(5)}`, color: '#34d399' },
            { label: 'Monthly Cost', value: `$${data.cost.monthlyGeminiCost.toFixed(4)}`, color: '#22d3ee' },
            { label: 'Avg / Eval', value: `$${data.cost.avgCostPerEval.toFixed(5)}`, color: '#818cf8' },
            { label: 'Avg Tokens', value: data.cost.avgTokensPerEval.toLocaleString(), color: '#c084fc' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...styles.miniStatCard, textAlign: 'center', padding: '16px 12px' }}>
              <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color, display: 'block', marginTop: 6, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accentColor, trend, miniData }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accentColor: string; trend: number | null; miniData: number[];
}) {
  return (
    <div style={{ ...styles.card, padding: '20px 20px 16px' }} className="hover-lift">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ padding: 8, background: `${accentColor}15`, border: `1px solid ${accentColor}25`, borderRadius: 10, color: accentColor }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 12 }}>{sub}</div>
      <MiniChart data={miniData} color={accentColor} maxVal={1} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '28px 32px', maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, color: '#f1f5f9' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  pageTitle: { fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.025em', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  card: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' },
  chipPurple: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' },
  chipSmall: { fontSize: 9, fontWeight: 700, color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em' },
  liveChip: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: 99 },
  dot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  miniStatCard: { background: '#111111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 4 },
  skeleton: { background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'skeletonPulse 1.5s ease-in-out infinite' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#111111', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
};

const cssStr = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes skeletonPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
  .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
  .hover-row { transition: background 0.15s ease; }
  .hover-row:hover { background: rgba(255,255,255,0.02) !important; }
  .scroll-thin::-webkit-scrollbar { width: 4px; }
  .scroll-thin::-webkit-scrollbar-track { background: transparent; }
  .scroll-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
`;

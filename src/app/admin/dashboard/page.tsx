'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface KeyData {
  slot: string; masked: string; status: string;
  todayRequests: number; estimatedRemaining: number;
  isActive: boolean; lastUsedTime: string | null;
  rotationCount: number; totalTokens: number;
}
interface ChartPoint {
  date: string; evaluations: number; ocrRequests: number;
  apiCalls: number; avgLatency: number; errorsCount: number; cost: number;
}
interface ErrorEntry {
  message: string; count: number; lastOccurred: string; type: string; module: string; severity: string;
}
interface ActivityEntry { id: string; time: string; event: string; type: string; module: string; }
interface Insight { text: string; type: 'info' | 'warning' | 'success' | 'critical'; }
interface StatsData {
  platform: { totalEvaluations: number; evalsToday: number; evalsYesterday: number; evalsThisWeek: number; avgEvaluationTime: number; avgResponseTime: number; successfulEvaluations: number; failedEvaluations: number; totalUsers: number; activeUsersToday: number; };
  ocr: { geminiOcrRequestsToday: number; geminiOcrRequestsThisMonth: number; ocrSuccessRate: number; ocrFailureRate: number; avgOcrTime: number; ocrSpaceFallbackCount: number; ocrQueueStatus: string; totalOcrRuns: number; };
  apiKeys: { activeKeys: number; healthyKeys: number; exhaustedKeys: number; rotationStatus: string; keys: KeyData[]; };
  freeTier: { ocrLimit: number; ocrUsedToday: number; ocrRemainingToday: number; estimatedMonthlyUsage: number; estimatedMonthlyRemaining: number; daysRemainingInMonth: number; };
  cost: { todayGeminiCost: number; monthlyGeminiCost: number; avgCostPerEval: number; avgTokensPerEval: number; totalCostAllTime: number; };
  systemHealth: { overall: string; supabase: string; gemini: string; ocr: string; rag: string; api: string; };
  errors: { recent: ErrorEntry[]; mostCommon: ErrorEntry[]; count429: number; ocrErrors: number; evalErrors: number; buildErrors: number; totalErrors: number; };
  performance: { avgEvaluationTime: number; avgOcrTime: number; fastestEvaluation: string; slowestEvaluation: string; };
  liveActivity: ActivityEntry[];
  chartData: ChartPoint[];
  insights: Insight[];
  rag: { chunksCount: number; documentsIndexed: string[]; };
  todaySummary: { evaluations: number; ocrRequests: number; successRate: number; apiCost: number; platformHealth: string; activeUsers: number; };
  meta: { generatedAt: string; hasServiceKey?: boolean; dataPoints: { userLogs: number; geminiLogs: number; }; };
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const C = {
  bg: '#06080c',
  card: '#090d16',
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.025)',
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#8b5cf6',
  emerald: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  cyan: '#0891b2',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
};

const healthPalette = (s: string) => {
  const map: Record<string, any> = {
    Green: { dot: C.emerald, text: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'Operational' },
    Yellow: { dot: C.amber, text: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: 'Degraded' },
    Red: { dot: C.red, text: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Outage' },
  };
  return map[s] || map.Green;
};

// ─────────────────────────────────────────────────────────────
// SPARKLINE CHART
// ─────────────────────────────────────────────────────────────
function Sparkline({ vals, color, h = 36, w = 100 }: { vals: number[]; color: string; h?: number; w?: number }) {
  if (!vals || vals.length < 2) return null;
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ');
  const areaPath = `M ${pts.split(' ')[0]} ${pts.split(' ').slice(1).map(p => 'L ' + p).join(' ')} L ${w},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`sg_${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg_${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
      {vals.map((v, i) => i === vals.length - 1 ? (
        <circle key={i} cx={(i / (vals.length - 1)) * w} cy={h - (v / max) * (h - 4)} r="3" fill={color} stroke={C.card} strokeWidth="1.5" />
      ) : null)}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// BAR CHART
// ─────────────────────────────────────────────────────────────
function BarGroup({ data, keys, colors }: { data: ChartPoint[]; keys: (keyof ChartPoint)[]; colors: string[] }) {
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => Number(d[k]) || 0)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {keys.map((k, i) => (
          <div key={String(k)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: 'capitalize' }}>{String(k)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100 }}>
        {data.map((d, di) => (
          <div key={di} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', flex: 1 }}>
              {keys.map((k, ki) => {
                const val = Number(d[k]) || 0;
                const pct = (val / maxVal) * 100;
                return (
                  <div key={String(k)} title={`${String(k)}: ${val}`} style={{
                    flex: 1, background: colors[ki], opacity: 0.8,
                    height: `${Math.max(pct, val > 0 ? 2 : 0)}%`,
                    borderRadius: '2px 2px 0 0',
                    minHeight: val > 0 ? 2 : 0,
                    transition: 'height 0.4s ease',
                    cursor: 'default',
                  }} />
                );
              })}
            </div>
            <span style={{ fontSize: 8, color: C.textDim, marginTop: 4, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, sparkData }: {
  label: string; value: string; sub: string; icon: string; accent: string; sparkData?: number[];
}) {
  return (
    <div className="fd-card fd-hover" style={{ padding: '20px 22px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 18, lineHeight: 1, padding: '7px', background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 10 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginBottom: sparkData ? 14 : 0 }}>{sub}</div>
      {sparkData && <Sparkline vals={sparkData} color={accent} h={36} w={120} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
function ProgressBar({ used, total, label, color = C.indigo }: { used: number; total: number; label: string; color?: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const statusColor = pct > 90 ? C.red : pct > 70 ? C.amber : color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, fontFamily: 'monospace' }}>{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${statusColor}CC, ${statusColor})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
function SectionHeader({ title, badge, icon }: { title: string; badge?: string; icon: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: `1px solid ${C.borderLight}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      {badge && (
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HEALTH BADGE
// ─────────────────────────────────────────────────────────────
function HealthBadge({ status }: { status: string }) {
  const h = healthPalette(status);
  return (
    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: h.text, background: h.bg, border: `1px solid ${h.border}`, padding: '2px 8px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: h.dot, display: 'inline-block' }} />
      {h.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT MINI BOX
// ─────────────────────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────
function Skeleton({ h = 120, r = 16, w }: { h?: number; r?: number; w?: string }) {
  return <div className="fd-skeleton" style={{ height: h, borderRadius: r, width: w || '100%' }} />;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function FounderOperationsCenter() {
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [tick, setTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/admin/api/stats', { cache: 'no-store' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastSync(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to connect to telemetry API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/admin/api/logout', { method: 'POST' });
      if (res.ok) {
        router.refresh();
        router.push('/admin');
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchData(true);
        setTick(t => t + 1);
      }, 30_000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    const clockInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(clockInterval);
    };
  }, [fetchData, autoRefresh]);

  const now = new Date();

  // ── LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
        <style>{CSS_STR}</style>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} h={140} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 16 }}>
          <Skeleton h={260} />
          <Skeleton h={260} />
          <Skeleton h={260} />
        </div>
      </div>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <style>{CSS_STR}</style>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Telemetry Disconnected</h3>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8, lineHeight: 1.7 }}>{error}</p>
          <button className="fd-btn-primary" onClick={() => fetchData()}>🔄 Reconnect</button>
        </div>
      </div>
    );
  }

  const overall = healthPalette(data.systemHealth.overall);
  const chartEvals = data.chartData.map(d => d.evaluations);
  const chartOcr = data.chartData.map(d => d.ocrRequests);
  const chartLatency = data.chartData.map(d => d.avgLatency);
  const chartCost = data.chartData.map(d => d.cost * 1000); // scale for visibility

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      <style>{CSS_STR}</style>

      {/* Auto Refresh & Controls Panel */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: -12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(9, 13, 22, 0.4)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Telemetry Polling</span>
          <label className="fd-switch" style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="fd-slider" />
          </label>
          <span style={{ fontSize: '10px', color: autoRefresh ? '#8b5cf6' : C.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {autoRefresh ? '30s' : 'Off'}
          </span>
        </div>
        <button
          className="fd-btn-secondary"
          disabled={refreshing}
          onClick={() => fetchData(true)}
          style={{ opacity: refreshing ? 0.7 : 1, padding: '6px 14px', borderRadius: '10px' }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'fd-spin 0.8s linear infinite' : 'none', marginRight: '4px' }}>⟳</span>
          Sync
        </button>
      </div>



        {/* 3. SECTION HEADER */}
        <div style={{ 
          marginTop: '8px',
          marginBottom: '-16px'
        }}>
          <h2 style={{ 
            fontSize: '14px', 
            fontWeight: 800, 
            color: C.textMuted, 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ width: '4px', height: '12px', background: C.indigo, display: 'inline-block', borderRadius: '2px' }} />
            Executive Summary
          </h2>
        </div>

        {/* ── DATA HEALTH WARNING ─────────────────────────── */}
      {!data.meta.hasServiceKey && (
        <div className="fd-card" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>Supabase Service Role Key is missing on the Server</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Please add <strong>SUPABASE_SERVICE_ROLE_KEY</strong> to your Vercel Environment Variables, then redeploy your Vercel project to apply the change. This key is required to bypass Row Level Security policies and fetch dashboard stats.
            </div>
          </div>
        </div>
      )}
      {data.meta.hasServiceKey && data.meta.dataPoints.userLogs === 0 && (
        <div className="fd-card" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 2 }}>No telemetry data recorded yet</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              The server connection is fully configured, but your database tables are empty. Run your first answer sheet evaluation through the application to generate telemetry metrics!
            </div>
          </div>
        </div>
      )}

      {/* ── INSIGHTS BAR ───────────────────────────────── */}
      {data.insights.length > 0 && (
        <div className="fd-card" style={{ padding: '16px 20px' }}>
          <SectionHeader title="AI Insights" icon="🧠" badge={`${data.insights.length} signals`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.insights.map((ins, i) => {
              const insColor = { info: C.blue, warning: C.amber, success: C.emerald, critical: C.red }[ins.type];
              const insIcon = { info: 'ℹ', warning: '⚡', success: '✓', critical: '🚨' }[ins.type];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: `${insColor}0d`, border: `1px solid ${insColor}20`, borderRadius: 10 }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{insIcon}</span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, lineHeight: 1.6 }}>{ins.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROW 1: KPI CARDS ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard
          label="Total Evaluations"
          value={data.platform.totalEvaluations.toLocaleString()}
          sub={`${data.platform.evalsToday} today · ${data.platform.evalsThisWeek} this week`}
          icon="📋"
          accent={C.indigo}
          sparkData={chartEvals}
        />
        <KpiCard
          label="OCR Success Rate"
          value={`${data.ocr.ocrSuccessRate}%`}
          sub={`${data.ocr.ocrSpaceFallbackCount} fallbacks · ${data.ocr.totalOcrRuns} total runs`}
          icon="🔍"
          accent={C.cyan}
          sparkData={chartOcr}
        />
        <KpiCard
          label="Avg Response Time"
          value={`${(data.platform.avgResponseTime / 1000).toFixed(2)}s`}
          sub={`AI ${(data.performance.avgEvaluationTime / 1000).toFixed(2)}s · OCR ${(data.performance.avgOcrTime / 1000).toFixed(2)}s`}
          icon="⚡"
          accent={C.purple}
          sparkData={chartLatency}
        />
        <KpiCard
          label="Monthly API Cost"
          value={`$${data.cost.monthlyGeminiCost.toFixed(4)}`}
          sub={`Today: $${data.cost.todayGeminiCost.toFixed(5)} · All time: $${data.cost.totalCostAllTime.toFixed(4)}`}
          icon="💰"
          accent={C.emerald}
          sparkData={chartCost}
        />
      </div>

      {/* ── ROW 2: PLATFORM OPS + CHART + HEALTH ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 280px', gap: 16 }}>

        {/* Platform Operations */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="Platform Operations" icon="🖥" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <StatBox label="Successful" value={data.platform.successfulEvaluations} color="#34d399" />
            <StatBox label="Failed" value={data.platform.failedEvaluations} color="#f87171" />
            <StatBox label="Users Total" value={data.platform.totalUsers} color={C.indigo} />
            <StatBox label="Active Today" value={data.platform.activeUsersToday} color={C.cyan} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Overall Success Rate</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                {data.platform.totalEvaluations > 0 ? Math.round((data.platform.successfulEvaluations / data.platform.totalEvaluations) * 100) : 100}%
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${data.platform.totalEvaluations > 0 ? Math.round((data.platform.successfulEvaluations / data.platform.totalEvaluations) * 100) : 100}%`, background: 'linear-gradient(90deg, #34d399, #06b6d4)', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fastest</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>{data.performance.fastestEvaluation}s</div>
              </div>
              <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Slowest</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fb923c', fontFamily: 'monospace' }}>{data.performance.slowestEvaluation}s</div>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Volume Chart */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="7-Day Volume Trends" icon="📊" badge="last 7 days" />
          <BarGroup
            data={data.chartData}
            keys={['evaluations', 'ocrRequests', 'apiCalls']}
            colors={[C.indigo, C.cyan, C.purple]}
          />
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Latency Trend (seconds)</div>
            <Sparkline vals={chartLatency} color={C.purple} h={44} w={700} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {data.chartData.map((d, i) => (
                <span key={i} style={{ fontSize: 8, color: C.textDim, fontFamily: 'monospace' }}>{d.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="Infrastructure" icon="🏗" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Supabase DB', s: data.systemHealth.supabase, icon: '🗄' },
              { label: 'Gemini Gateway', s: data.systemHealth.gemini, icon: '🤖' },
              { label: 'OCR Engine', s: data.systemHealth.ocr, icon: '🔍' },
              { label: 'RAG Index', s: data.systemHealth.rag, icon: '📚' },
              { label: 'API Layer', s: data.systemHealth.api, icon: '🔌' },
            ].map(({ label, s, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{icon}</span>{label}
                </span>
                <HealthBadge status={s} />
              </div>
            ))}
          </div>
          {/* RAG info */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.015)', borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
            <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>RAG Knowledge Base</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{data.rag.chunksCount.toLocaleString()} chunks</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{data.rag.documentsIndexed.length} document{data.rag.documentsIndexed.length !== 1 ? 's' : ''} indexed</div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: GEMINI API KEY CENTER ────────────────── */}
      <div className="fd-card" style={{ padding: '20px 24px' }}>
        <SectionHeader title="Google Gemini API Key Center" icon="🔑" badge={data.apiKeys.rotationStatus} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Slot', 'Key (Masked)', 'Status', 'Active', 'Requests Today', 'Remaining (Est)', 'Rotation #', 'Total Tokens', 'Last Used'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.keys.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '24px 14px', textAlign: 'center', color: C.textDim, fontSize: 12 }}>
                    No Gemini API keys detected. Add GEMINI_API_KEY or GEMINI_API_KEY_1 to .env.local
                  </td>
                </tr>
              ) : data.apiKeys.keys.map((key) => {
                const sColor = key.status === 'Healthy' ? '#34d399' : '#f87171';
                const sBg = key.status === 'Healthy' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)';
                const sBorder = key.status === 'Healthy' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)';
                return (
                  <tr key={key.slot} className="fd-table-row" style={{ borderBottom: `1px solid ${C.borderLight}`, background: key.isActive ? 'rgba(99,102,241,0.03)' : 'transparent' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: C.text }}>{key.slot}</td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: C.textMuted, fontSize: 11 }}>{key.masked}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sColor, background: sBg, border: `1px solid ${sBorder}`, padding: '2px 8px', borderRadius: 5 }}>
                        {key.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {key.isActive ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.indigo, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase' }}>
                          ● Active
                        </span>
                      ) : <span style={{ color: C.textDim, fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#d1d5db', textAlign: 'center' }}>{key.todayRequests}</td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: key.estimatedRemaining < 100 ? '#f87171' : C.textMuted, textAlign: 'center' }}>
                      {key.estimatedRemaining.toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: C.textMuted, textAlign: 'center' }}>{key.rotationCount}</td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: C.textDim, textAlign: 'center' }}>{key.totalTokens.toLocaleString()}</td>
                    <td style={{ padding: '11px 14px', color: C.textDim, fontSize: 11 }}>
                      {key.lastUsedTime ? new Date(key.lastUsedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROW 4: OCR + QUOTA ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* OCR Engine */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="OCR Engine Analytics" icon="📷" badge={data.ocr.ocrQueueStatus} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            <StatBox label="Gemini Today" value={data.ocr.geminiOcrRequestsToday} color={C.indigo} />
            <StatBox label="This Month" value={data.ocr.geminiOcrRequestsThisMonth} color={C.cyan} />
            <StatBox label="OCR.Space Fallbacks" value={data.ocr.ocrSpaceFallbackCount} color={C.amber} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ProgressBar used={data.ocr.geminiOcrRequestsToday} total={data.freeTier.ocrLimit} label="Daily OCR Quota" color={C.cyan} />
            <ProgressBar used={data.ocr.geminiOcrRequestsThisMonth} total={15000} label="Monthly OCR Scale" color={C.indigo} />
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Success Rate</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>{data.ocr.ocrSuccessRate}%</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Avg OCR Time</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.cyan }}>{(data.ocr.avgOcrTime / 1000).toFixed(2)}s</div>
            </div>
          </div>
        </div>

        {/* Quota + Cost */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="Quota & Cost Center" icon="💳" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            <ProgressBar used={data.freeTier.ocrUsedToday} total={data.freeTier.ocrLimit} label="Daily OCR Requests" color={C.cyan} />
            <ProgressBar used={data.freeTier.estimatedMonthlyUsage} total={15000} label="Monthly OCR Requests" color={C.indigo} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <StatBox label="Cost Today" value={`$${data.cost.todayGeminiCost.toFixed(5)}`} color="#34d399" />
            <StatBox label="Monthly Cost" value={`$${data.cost.monthlyGeminiCost.toFixed(4)}`} color={C.cyan} />
            <StatBox label="Avg / Eval" value={`$${data.cost.avgCostPerEval.toFixed(6)}`} color={C.purple} />
            <StatBox label="Avg Tokens" value={data.cost.avgTokensPerEval.toLocaleString()} color={C.amber} />
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.015)', borderRadius: 10, border: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Days remaining in month</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{data.freeTier.daysRemainingInMonth}</span>
          </div>
        </div>
      </div>

      {/* ── ROW 5: ERRORS + LIVE ACTIVITY ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Error Monitor */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="Error Monitor" icon="🚨" badge={data.errors.totalErrors > 0 ? `${data.errors.totalErrors} total` : 'Clean'} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <StatBox label="OCR Errors" value={data.errors.ocrErrors} color={data.errors.ocrErrors > 0 ? '#f87171' : '#34d399'} />
            <StatBox label="AI Errors" value={data.errors.evalErrors} color={data.errors.evalErrors > 0 ? '#f87171' : '#34d399'} />
            <StatBox label="429 Quota" value={data.errors.count429} color={data.errors.count429 > 0 ? C.amber : '#34d399'} />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }} className="fd-scroll">
            {data.errors.recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>No errors logged</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Platform is running cleanly</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                    {['Timestamp', 'Module', 'Count', 'Message'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.errors.recent.map((err, i) => (
                    <tr key={i} className="fd-table-row" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 10, color: C.textDim, whiteSpace: 'nowrap' }}>
                        {new Date(err.lastOccurred).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                          {err.module}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#f87171', textAlign: 'center' }}>{err.count}×</td>
                      <td style={{ padding: '8px 10px', color: C.textMuted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err.message}>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="fd-card" style={{ padding: '20px 22px' }}>
          <SectionHeader title="Live Activity Feed" icon="📡" badge="● Live" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 360, overflowY: 'auto' }} className="fd-scroll">
            {data.liveActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 13, fontWeight: 600 }}>
                No recent activity. Run an evaluation to see live events.
              </div>
            ) : data.liveActivity.map((act, i) => {
              const lineColor = { success: '#34d399', error: '#f87171', info: C.indigo, warning: C.amber }[act.type] || C.indigo;
              return (
                <div key={act.id} style={{ display: 'flex', gap: 12, paddingLeft: 18, borderLeft: `2px solid ${lineColor}30`, marginLeft: 4, paddingTop: i > 0 ? 12 : 0, paddingBottom: 12, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: -5, top: i > 0 ? 16 : 4, width: 8, height: 8, borderRadius: '50%', background: lineColor, boxShadow: `0 0 8px ${lineColor}60` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500, lineHeight: 1.5 }}>{act.event}</div>
                    <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginTop: 3, display: 'flex', gap: 10 }}>
                      <span>{act.time}</span>
                      <span style={{ color: lineColor, fontWeight: 600 }}>{act.module}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 6: TODAY'S SUMMARY ───────────────────────── */}
      <div className="fd-card" style={{ padding: '20px 24px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
        <SectionHeader title={`Today's Summary — ${now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`} icon="📅" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            { label: 'Evaluations', value: data.todaySummary.evaluations, color: C.indigo, icon: '📋' },
            { label: 'OCR Requests', value: data.todaySummary.ocrRequests, color: C.cyan, icon: '🔍' },
            { label: 'Success Rate', value: `${data.todaySummary.successRate}%`, color: '#34d399', icon: '✓' },
            { label: "Today's Cost", value: `$${data.todaySummary.apiCost.toFixed(5)}`, color: C.emerald, icon: '💰' },
            { label: 'Active Users', value: data.todaySummary.activeUsers, color: C.purple, icon: '👤' },
            { label: 'Platform Status', value: data.todaySummary.platformHealth, color: healthPalette(data.todaySummary.platformHealth).text, icon: '💚' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ textAlign: 'center', padding: '14px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${C.borderLight}` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER META ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.borderLight}`, paddingTop: 16 }}>
        <span style={{ fontSize: 10, color: C.textDim }}>
          Write2Rank Founder Operations Center · Data points: {data.meta.dataPoints.userLogs} usage logs, {data.meta.dataPoints.geminiLogs} Gemini calls
        </span>
        <span style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace' }}>
          Generated {new Date(data.meta.generatedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GLOBAL CSS
// ─────────────────────────────────────────────────────────────
const CSS_STR = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #06080c; color: #f8fafc; }

  .fd-card {
    background: linear-gradient(180deg, #090d16 0%, #070a10 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    transition: border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .fd-hover {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
  }
  .fd-hover:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
  }
  .fd-chip-purple {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    font-weight: 700;
    color: #c084fc;
    background: rgba(192, 132, 252, 0.08);
    border: 1px solid rgba(192, 132, 252, 0.2);
    padding: 3px 10px;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .fd-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c084fc;
    display: inline-block;
    animation: fd-pulse 2s infinite ease-in-out;
    box-shadow: 0 0 8px #c084fc;
  }
  .fd-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    background: #4f46e5;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .fd-btn-primary:hover {
    background-color: #4338ca;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  }
  .fd-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #090d16;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background-color 0.2s;
    font-family: inherit;
  }
  .fd-btn-secondary:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    background-color: #0d1220;
  }
  .fd-btn-secondary:disabled { cursor: not-allowed; opacity: 0.5; }
  .fd-skeleton {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 75%);
    background-size: 200% 100%;
    animation: fd-shimmer 1.8s ease-in-out infinite;
    border-radius: 14px;
  }
  .fd-table-row {
    transition: background-color 0.15s ease;
  }
  .fd-table-row:hover {
    background-color: rgba(255, 255, 255, 0.015) !important;
  }
  .fd-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .fd-scroll::-webkit-scrollbar-track { background: transparent; }
  .fd-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 99px; }
  .fd-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.12); }

  /* Premium Switch Toggle */
  .fd-switch input:checked + .fd-slider {
    background-color: #6366f1;
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
  }
  .fd-switch input:checked + .fd-slider:before {
    transform: translateX(14px);
    background-color: #ffffff;
  }
  .fd-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(255, 255, 255, 0.06);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 34px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .fd-slider:before {
    position: absolute;
    content: "";
    height: 12px; width: 12px;
    left: 2px; bottom: 2px;
    background-color: #94a3b8;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 50%;
  }
  .fd-nav-item:hover {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.05) !important;
  }

  @keyframes fd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fd-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.9); } }
  @keyframes fd-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

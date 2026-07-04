'use client';
import { useState, useEffect, useCallback } from 'react';
import { Binary, RefreshCw, AlertTriangle } from 'lucide-react';

interface StatsData {
  ocr: {
    geminiOcrRequestsToday: number;
    geminiOcrRequestsThisMonth: number;
    ocrSuccessRate: number;
    ocrFailureRate: number;
    avgOcrTime: number;
    ocrSpaceFallbackCount: number;
    ocrQueueStatus: string;
    totalOcrRuns: number;
  };
  freeTier: {
    ocrLimit: number;
    ocrUsedToday: number;
    ocrRemainingToday: number;
    estimatedMonthlyUsage: number;
    estimatedMonthlyRemaining: number;
  };
  performance: {
    avgOcrTime: number;
  };
  errors: {
    recent: Array<{ timestamp: string; message: string; type: string; module: string; count: number; lastOccurred: string }>;
    ocrErrors: number;
  };
}

export default function FounderOcrPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/founder/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to telemetry API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '40vh' }}>
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Loading OCR Engine Telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fd-card" style={{ padding: 24, textAlign: 'center' }}>
        <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Telemetry Connection Offline</h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{error || 'Could not fetch platform metrics.'}</p>
        <button onClick={() => { setLoading(true); fetchData(); }} className="fd-btn-secondary" style={{ marginTop: 16 }}>Retry Connection</button>
      </div>
    );
  }

  const ocrErrorsList = data.errors.recent.filter(err => err.module === 'OCR' || err.type === 'OCR');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Gemini Today', value: data.ocr.geminiOcrRequestsToday, desc: 'API calls processed today' },
          { label: 'Monthly Runs', value: data.ocr.geminiOcrRequestsThisMonth, desc: 'API calls processed this month' },
          { label: 'Success Rate', value: `${data.ocr.ocrSuccessRate}%`, desc: 'Overall health metric' },
          { label: 'Average Speed', value: `${(data.ocr.avgOcrTime / 1000).toFixed(2)}s`, desc: 'Latency per page' }
        ].map((item, i) => (
          <div key={i} className="fd-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="fd-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Binary size={16} className="text-indigo-400" />
            OCR Daily & Monthly Scale Limits
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Daily OCR Free-Tier Quota</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{data.ocr.geminiOcrRequestsToday} / {data.freeTier.ocrLimit} pages</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                <div style={{ height: '100%', background: '#0891b2', borderRadius: 99, width: `${Math.min((data.ocr.geminiOcrRequestsToday / (data.freeTier.ocrLimit || 1)) * 100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Monthly Scaling Quota Limit</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{data.ocr.geminiOcrRequestsThisMonth} / 15,000 pages</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                <div style={{ height: '100%', background: '#4f46e5', borderRadius: 99, width: `${Math.min((data.ocr.geminiOcrRequestsThisMonth / 15000) * 100, 100)}%` }} />
              </div>
            </div>

            <div style={{ padding: 12, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>OCR Queue Performance Status:</span>
              <span style={{ fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>{data.ocr.ocrQueueStatus}</span>
            </div>
          </div>
        </div>

        <div className="fd-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertTriangle size={16} className="text-red-400" />
            OCR Engine Error Logs
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {ocrErrorsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 12 }}>
                No OCR errors logged today. Platform running cleanly.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Count</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Diagnostic Message</th>
                  </tr>
                </thead>
                <tbody>
                  {ocrErrorsList.map((err, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(err.lastOccurred).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{err.count}×</td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

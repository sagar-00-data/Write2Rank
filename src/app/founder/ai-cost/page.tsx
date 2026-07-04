'use client';
import { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw, AlertTriangle } from 'lucide-react';

interface KeyData {
  slot: string; masked: string; status: string;
  todayRequests: number; estimatedRemaining: number;
  isActive: boolean; lastUsedTime: string | null;
  rotationCount: number; totalTokens: number;
}

interface StatsData {
  cost: {
    todayGeminiCost: number;
    monthlyGeminiCost: number;
    avgCostPerEval: number;
    avgTokensPerEval: number;
    totalCostAllTime: number;
  };
  apiKeys: {
    activeKeys: number;
    healthyKeys: number;
    exhaustedKeys: number;
    rotationStatus: string;
    keys: KeyData[];
  };
}

export default function FounderAiCostPage() {
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
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Loading API Cost Telemetry...</p>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cost metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Cost Today', value: `$${data.cost.todayGeminiCost.toFixed(5)}`, desc: 'Today Gemini usage cost' },
          { label: 'Monthly Cost', value: `$${data.cost.monthlyGeminiCost.toFixed(4)}`, desc: 'Estimated monthly cost' },
          { label: 'Avg / Evaluation', value: `$${data.cost.avgCostPerEval.toFixed(6)}`, desc: 'Mean evaluation call expense' },
          { label: 'Avg Tokens / Call', value: data.cost.avgTokensPerEval.toLocaleString(), desc: 'Input + output tokens' }
        ].map((item, i) => (
          <div key={i} className="fd-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Keys Rotation Pool */}
      <div className="fd-card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Cpu size={16} className="text-indigo-400" />
            Gemini API Key Rotation Pool
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
            {data.apiKeys.rotationStatus}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', textTransform: 'uppercase', fontSize: 9, fontWeight: 700 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Slot</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Masked Key</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Calls Today</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Tokens Used</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Est. Remaining</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.keys.map((k, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: k.isActive ? 'rgba(99,102,241,0.03)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: k.isActive ? '#818cf8' : '#ffffff' }}>
                    {k.slot} {k.isActive && '⚡'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#94a3b8' }}>{k.masked}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      color: k.status === 'Healthy' ? '#34d399' : '#f87171',
                      background: k.status === 'Healthy' ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
                      border: `1px solid ${k.status === 'Healthy' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`
                    }}>
                      {k.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{k.todayRequests}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#cbd5e1' }}>{k.totalTokens.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{k.estimatedRemaining}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                    {k.lastUsedTime ? new Date(k.lastUsedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';

interface StatsData {
  rag: {
    chunksCount: number;
    documentsIndexed: string[];
  };
}

export default function FounderRagPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '40vh' }}>
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Loading RAG Knowledge Telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fd-card" style={{ padding: 24, textAlign: 'center' }}>
        <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Telemetry Connection Offline</h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{error || 'Could not fetch platform metrics.'}</p>
        <button onClick={fetchData} className="fd-btn-secondary" style={{ marginTop: 16 }}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div className="fd-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ padding: 16, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '50%', marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', width: 64, height: 64 }}>
            <Database size={28} className="text-indigo-400" />
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Vector Embeddings</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', marginTop: 8, marginBottom: 8 }}>{data.rag.chunksCount.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Index segments stored in postgres database pgvector schema</div>
        </div>

        <div className="fd-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 20 }}>
            Indexed Reference Knowledge Files
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {data.rag.documentsIndexed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 12 }}>
                No external documents indexed in vector storage.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Index</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>File Reference Document Name</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rag.documentsIndexed.map((doc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', color: '#64748b', fontFamily: 'monospace' }}>#{idx + 1}</td>
                      <td style={{ padding: '8px', color: '#cbd5e1', fontWeight: 600 }}>{doc}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                          ONLINE
                        </span>
                      </td>
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

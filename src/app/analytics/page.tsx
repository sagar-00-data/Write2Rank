'use client';
import { useState } from 'react';
import { TrendingUp, BarChart3, Award, Target, Calendar } from 'lucide-react';
import { EvaluationRecord } from '@/app/page';

function loadEvals(): EvaluationRecord[] {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
  }
  return [];
}

export default function AnalyticsPage() {
  const [evals] = useState<EvaluationRecord[]>(loadEvals);

  const totalEvals = evals.length;
  const completedEvals = evals.filter((e) => e.status === 'completed').length;
  const avgScore = totalEvals > 0 ? Math.round(evals.reduce((sum, e) => sum + (e.score / e.maxScore) * 100, 0) / totalEvals) : 0;
  const highestScore = totalEvals > 0 ? Math.max(...evals.map((e) => Math.round((e.score / e.maxScore) * 100))) : 0;
  const lowestScore = totalEvals > 0 ? Math.min(...evals.map((e) => Math.round((e.score / e.maxScore) * 100))) : 0;
  const avgConfidence = totalEvals > 0 ? (evals.reduce((sum, e) => sum + e.confidence, 0) / totalEvals).toFixed(1) : '0.0';

  const scoreDistribution = [
    { range: '0-25%', count: evals.filter((e) => (e.score / e.maxScore) * 100 <= 25).length, color: '#ef4444' },
    { range: '26-50%', count: evals.filter((e) => { const p = (e.score / e.maxScore) * 100; return p > 25 && p <= 50; }).length, color: '#f97316' },
    { range: '51-75%', count: evals.filter((e) => { const p = (e.score / e.maxScore) * 100; return p > 50 && p <= 75; }).length, color: '#eab308' },
    { range: '76-100%', count: evals.filter((e) => (e.score / e.maxScore) * 100 > 75).length, color: '#10b981' },
  ];
  const maxCount = Math.max(...scoreDistribution.map((d) => d.count), 1);

  const recentTrend = evals.slice(0, 5).reverse().map((e) => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round((e.score / e.maxScore) * 100),
  }));

  const examBreakdown = evals.reduce<Record<string, { count: number; totalScore: number }>>((acc, e) => {
    const exam = e.exam || 'Other';
    if (!acc[exam]) acc[exam] = { count: 0, totalScore: 0 };
    acc[exam].count += 1;
    acc[exam].totalScore += (e.score / e.maxScore) * 100;
    return acc;
  }, {});

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title">Analytics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Track your performance and identify areas for improvement.</p>

      {totalEvals === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BarChart3 size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>No data yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Complete some evaluations to see your analytics.</p>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Evaluations</div>
              <div className="stat-value">{totalEvals}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{completedEvals} completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average Score</div>
              <div className="stat-value">{avgScore}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Highest Score</div>
              <div className="stat-value" style={{ color: 'var(--success-color)' }}>{highestScore}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">AI Confidence</div>
              <div className="stat-value">{avgConfidence}%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--accent-color)" />
                Score Distribution
              </h2>
              <div style={{ marginTop: '24px' }}>
                {scoreDistribution.map((d) => (
                  <div key={d.range} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{d.range}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.count} evals</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{ height: '100%', width: `${(d.count / maxCount) * 100}%`, backgroundColor: d.color, borderRadius: '4px', transition: 'width 0.5s ease-out' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="var(--accent-color)" />
                Recent Trend
              </h2>
              <div style={{ marginTop: '24px' }}>
                {recentTrend.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Not enough data.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
                    {recentTrend.map((t, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t.score}%</span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '48px',
                            height: `${t.score}%`,
                            backgroundColor: t.score >= 50 ? 'var(--accent-color)' : 'var(--danger-color)',
                            borderRadius: '6px 6px 0 0',
                            transition: 'height 0.5s ease-out',
                            minHeight: '4px',
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>{t.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
            <div className="card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--accent-color)" />
                Exam Breakdown
              </h2>
              <div style={{ marginTop: '16px' }}>
                {Object.entries(examBreakdown).map(([exam, data]) => (
                  <div key={exam} className="list-item">
                    <div>
                      <div className="font-medium">{exam}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.count} evaluation{data.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="font-medium" style={{ color: 'var(--accent-color)' }}>
                      {Math.round(data.totalScore / data.count)}% avg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="var(--accent-color)" />
                Performance Summary
              </h2>
              <div style={{ marginTop: '16px' }}>
                <div className="info-row">
                  <div className="info-content">
                    <label>Lowest Score</label>
                    <p style={{ color: 'var(--danger-color)' }}>{lowestScore}%</p>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-content">
                    <label>Highest Score</label>
                    <p style={{ color: 'var(--success-color)' }}>{highestScore}%</p>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-content">
                    <label>Score Range</label>
                    <p>{highestScore - lowestScore}% spread</p>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-content">
                    <label>Completion Rate</label>
                    <p>{totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .info-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .info-row:last-child { border-bottom: none; }
        .info-content label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 2px; }
        .info-content p { font-size: 15px; font-weight: 500; }

        @media (max-width: 768px) {
          > div > div[style*="grid"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

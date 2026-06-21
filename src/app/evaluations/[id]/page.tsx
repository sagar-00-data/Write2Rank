'use client';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, TrendingUp, Download, ArrowLeft } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EvaluationRecord } from '../../page';

export default function EvaluationDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('w2r_user');
      if (!user) {
        router.push('/login');
        return;
      }
      
      const savedEvals: EvaluationRecord[] = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
      const found = savedEvals.find((e) => e.id === id);
      if (found) {
        setTimeout(() => setEvaluation(found), 0);
      }
    }
  }, [id, router]);

  if (!evaluation) {
    return (
      <div className="page-container animate-fade-in" style={{ textAlign: 'center', padding: '60px' }}>
        <h2>Loading evaluation...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>If this takes too long, the evaluation may not exist.</p>
        <Link href="/">
          <button className="btn btn-outline" style={{ marginTop: '20px' }}>Back to Dashboard</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Evaluation Report</h1>
            <div className={`status ${evaluation.status}`}>{evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}</div>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>ID: {id} • {evaluation.exam || 'Professional Exam'}</div>
        </div>
        <button className="btn btn-outline" onClick={() => window.print()}>
          <Download size={16} />
          Export PDF
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{ borderTop: `4px solid ${evaluation.score >= (evaluation.maxScore * 0.5) ? 'var(--success-color)' : 'var(--danger-color)'}` }}>
          <div className="stat-label">Final Score</div>
          <div className="stat-value" style={{ color: evaluation.score >= (evaluation.maxScore * 0.5) ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {evaluation.score} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/ {evaluation.maxScore}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI Confidence</div>
          <div className="stat-value">{evaluation.confidence}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Evaluated By</div>
          <div className="stat-value" style={{ fontSize: '20px', marginTop: '12px' }}>Gemini 2.5 AI Engine</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--accent-color)" />
          Overall Feedback
        </h2>
        <div style={{ marginTop: '16px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '16px' }}>{evaluation.feedback?.overall || 'No overall feedback provided.'}</p>
          
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(50, 215, 75, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(50, 215, 75, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', fontWeight: 600, marginBottom: '8px' }}>
                <CheckCircle size={18} /> Strengths
              </div>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {evaluation.feedback?.strengths?.map((str: string, i: number) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{str}</li>
                )) || <li>None noted.</li>}
              </ul>
            </div>
            
            <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255, 69, 58, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)', fontWeight: 600, marginBottom: '8px' }}>
                <AlertTriangle size={18} /> Areas for Improvement
              </div>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {evaluation.feedback?.weaknesses?.map((wk: string, i: number) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{wk}</li>
                )) || <li>None noted.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '32px 0 16px 0' }}>Question-wise Breakdown</h2>
      
      {evaluation.breakdown && evaluation.breakdown.length > 0 ? evaluation.breakdown.map((item, i) => (
        <div key={i} className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{item.q || `Question ${i + 1}`}</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px' }}>{item.topic || 'General'}</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>{item.comments || 'No comments.'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: (item.awarded / item.max) >= 0.5 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {item.awarded} / {item.max}
              </div>
            </div>
          </div>
        </div>
      )) : (
        <div className="card">No question breakdown available.</div>
      )}

      <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '32px 0 16px 0' }}>Extracted Text (Original Answer)</h2>
      <div className="card" style={{ backgroundColor: 'var(--bg-primary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
        {evaluation.extractedText || "No text available."}
      </div>

    </div>
  );
}

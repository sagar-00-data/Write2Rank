'use client';
import Link from 'next/link';
import { Upload, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface EvaluationRecord {
  id: string;
  score: number;
  maxScore: number;
  confidence: number;
  status: 'completed' | 'pending';
  exam: string;
  date: string;
  extractedText?: string;
  feedback?: {
    overall: string;
    strengths: string[];
    weaknesses: string[];
  };
  breakdown?: Array<{
    q: string;
    topic: string;
    awarded: number;
    max: number;
    comments: string;
  }>;
}

export default function Dashboard() {
  const [evals, setEvals] = useState<EvaluationRecord[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
      setTimeout(() => setEvals(savedEvals), 0);
    }
  }, []);

  const totalEvals = evals.length;
  const avgScore = totalEvals > 0 ? Math.round(evals.reduce((sum, e) => sum + e.score, 0) / totalEvals) : 0;
  const avgAccuracy = totalEvals > 0 ? (evals.reduce((sum, e) => sum + e.confidence, 0) / totalEvals).toFixed(1) : "0.0";

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title stagger-1">Dashboard</h1>
      
      <div className="stat-grid stagger-2">
        <div className="stat-card">
          <div className="stat-label">Total Evaluations</div>
          <div className="stat-value">{totalEvals}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value">{avgScore}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI Accuracy Rate</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>{avgAccuracy}%</div>
        </div>
      </div>

      <div className="card stagger-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/evaluations/new" style={{ flex: 1 }}>
            <div className="upload-area">
              <Upload className="upload-icon" />
              <div className="font-medium" style={{ marginBottom: '4px' }}>New Evaluation</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload answer sheets (PDF/Image)</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="card stagger-4">
        <h2 className="card-title">Recent Evaluations</h2>
        <div className="card-desc">Your most recently processed answer sheets.</div>
        
        <div style={{ marginTop: '24px' }}>
          {evals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No evaluations yet. Start by uploading a new answer sheet!
            </div>
          ) : evals.map((item, i) => (
            <div className="list-item" key={item.id || i}>
              <div className="list-item-left">
                <div className="icon-box">
                  {item.status === 'completed' ? <CheckCircle size={20} color="var(--success-color)" /> : <Clock size={20} color="#ff9d00" />}
                </div>
                <div>
                  <div className="font-medium">{item.exam || 'Professional Exam'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.id} • {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div className="font-medium">{item.score}/{item.maxScore}</div>
                <div className={`status ${item.status}`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>
                <Link href={`/evaluations/${item.id}`}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }}>View</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

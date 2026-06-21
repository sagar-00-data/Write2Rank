'use client';
import Link from 'next/link';
import { Upload, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!isSupabaseConfigured) {
        const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setEvals(savedEvals);
        setIsLoading(false);
        return;
      }

      try {
        const targetUserId = '00000000-0000-0000-0000-000000000000';

        const { data: dbEvals, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error, falling back to localStorage:', error);
          const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
          setEvals(savedEvals);
        } else if (dbEvals && dbEvals.length > 0) {
          const transformed: EvaluationRecord[] = dbEvals.map((e) => ({
            id: e.id,
            score: e.score,
            maxScore: e.max_score,
            confidence: e.confidence,
            status: 'completed',
            exam: e.exam_type,
            date: e.created_at,
            extractedText: e.ocr_extracted_text,
            feedback: {
              overall: e.ai_feedback?.overall || '',
              strengths: e.ai_feedback?.strengths || [],
              weaknesses: e.ai_feedback?.weaknesses || []
            },
            breakdown: e.ai_feedback?.breakdown || []
          }));
          setEvals(transformed);
          localStorage.setItem('write2rank_evals', JSON.stringify(transformed));
        } else {
          const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
          setEvals(savedEvals);
        }
      } catch (err) {
        console.warn('Failed to connect to Supabase, falling back to localStorage:', err);
        const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setEvals(savedEvals);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
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
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '150px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)' }} />
                      <div style={{ width: '100px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)' }} />
                    </div>
                  </div>
                  <div style={{ width: '80px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }} />
                </div>
              ))}
            </div>
          ) : evals.length === 0 ? (
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
              <div className="list-item-right">
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

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { EvaluationRecord } from '@/app/page';

function loadEvals(): EvaluationRecord[] {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
  }
  return [];
}

export default function EvaluationsList() {
  const [evals, setEvals] = useState<EvaluationRecord[]>(loadEvals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this evaluation?')) return;
    const updated = evals.filter((e) => e.id !== id);
    setEvals(updated);
    localStorage.setItem('write2rank_evals', JSON.stringify(updated));
  };

  const filteredEvals = evals.filter((e) => {
    const matchesSearch =
      (e.exam || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || e.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Evaluations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View and manage all your past evaluations.</p>
        </div>
        <Link href="/evaluations/new">
          <button className="btn">
            <Plus size={18} />
            New Evaluation
          </button>
        </Link>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search evaluations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '42px', paddingRight: '16px', paddingBlock: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'pending')}
              style={{ paddingLeft: '42px', paddingRight: '32px', paddingBlock: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundColor: 'white' }}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {filteredEvals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            {evals.length === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                <h3 style={{ marginBottom: '8px' }}>No evaluations yet</h3>
                <p style={{ marginBottom: '24px' }}>Start by uploading your answer sheet for AI evaluation.</p>
                <Link href="/evaluations/new">
                  <button className="btn">
                    <Plus size={18} />
                    Create First Evaluation
                  </button>
                </Link>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '8px' }}>No matching results</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        ) : (
          filteredEvals.map((item) => (
            <div className="list-item" key={item.id}>
              <div className="list-item-left">
                <div className="icon-box">
                  {item.status === 'completed' ? <CheckCircle size={20} color="var(--success-color)" /> : <Clock size={20} color="#ff9d00" />}
                </div>
                <div>
                  <div className="font-medium">{item.exam || 'Professional Exam'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.id} • {new Date(item.date).toLocaleDateString()} • Score: {item.score}/{item.maxScore}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`status ${item.status}`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>
                <Link href={`/evaluations/${item.id}`}>
                  <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>View</button>
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                  title="Delete evaluation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

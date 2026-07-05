'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, CheckCircle, Trash2, Loader2,
  Pin, Sparkles, Download, Copy, Tag, Eye, ArrowUpDown, X, Check,
  AlertCircle, FileText, Info, BookOpen
} from 'lucide-react';
import { EvaluationRecord } from '@/app/page';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Custom tag map type
type CustomTags = Record<string, string[]>;

export default function EvaluationsList() {
  const [evals, setEvals] = useState<EvaluationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Interactive / Personalisation states
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('xaminix_pinned_evals') || '[]');
    }
    return [];
  });
  const [customTags, setCustomTags] = useState<CustomTags>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('xaminix_eval_tags') || '{}');
    }
    return {};
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterMarks, setFilterMarks] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Sort
  const [sortBy, setSortBy] = useState<string>('newest');

  // Tag creation modal state
  const [taggingEvalId, setTaggingEvalId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Soft Delete / Toast state
  const [deletedEval, setDeletedEval] = useState<EvaluationRecord | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Compare mode
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    async function loadData() {
      if (authLoading || !user) return;
      
      setIsLoading(true);
      const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!isSupabaseConfigured) {
        const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setEvals(savedEvals);
        setIsLoading(false);
        return;
      }

      try {
        const targetUserId = user.id;

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
          const transformed: EvaluationRecord[] = dbEvals.map((e: any) => ({
            id: e.id,
            score: e.score,
            maxScore: e.max_score,
            confidence: e.confidence,
            status: 'completed',
            exam: e.exam_type,
            date: e.created_at,
            extractedText: e.ocr_extracted_text,
            feedback: {
              overall: e.ai_feedback?.markdown || e.ai_feedback?.overall || '',
              strengths: e.ai_feedback?.strengths || [],
              weaknesses: e.ai_feedback?.weaknesses || []
            },
            breakdown: e.ai_feedback?.breakdown || []
          }));
          setEvals(transformed);
          localStorage.setItem('write2rank_evals', JSON.stringify(transformed));
        } else {
          setEvals([]);
        }
      } catch (err) {
        console.warn('Failed to load from Supabase:', err);
        const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setEvals(savedEvals);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, authLoading]);

  // ─── Pin actions ───────────────────────────────────────────────────────────
  const togglePin = (id: string) => {
    const nextPins = pinnedIds.includes(id) 
      ? pinnedIds.filter(p => p !== id) 
      : [...pinnedIds, id];
    setPinnedIds(nextPins);
    localStorage.setItem('xaminix_pinned_evals', JSON.stringify(nextPins));
  };

  // ─── Tag actions ───────────────────────────────────────────────────────────
  const addTagToEval = (id: string, tag: string) => {
    if (!tag.trim()) return;
    const currentTags = customTags[id] || [];
    if (currentTags.includes(tag.trim())) return;
    
    const nextTags = {
      ...customTags,
      [id]: [...currentTags, tag.trim()]
    };
    setCustomTags(nextTags);
    localStorage.setItem('xaminix_eval_tags', JSON.stringify(nextTags));
    setNewTagInput('');
  };

  const removeTagFromEval = (id: string, tagToRemove: string) => {
    const currentTags = customTags[id] || [];
    const nextTags = {
      ...customTags,
      [id]: currentTags.filter(t => t !== tagToRemove)
    };
    setCustomTags(nextTags);
    localStorage.setItem('xaminix_eval_tags', JSON.stringify(nextTags));
  };

  // ─── Duplicate/Restore actions ─────────────────────────────────────────────
  const duplicateEvaluation = async (item: EvaluationRecord) => {
    const newId = 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const newRecord: EvaluationRecord = {
      ...item,
      id: newId,
      date: new Date().toISOString()
    };

    // Insert payload
    const insertPayload = {
      id: newId,
      user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      question_text: '',
      answer_text: item.extractedText || '',
      ocr_extracted_text: item.extractedText || '',
      ai_feedback: {
        markdown: item.feedback?.overall || '',
        breakdown: item.breakdown || []
      },
      score: item.score,
      max_score: item.maxScore,
      confidence: item.confidence,
      exam_type: item.exam
    };

    try {
      await supabase.from('evaluations').insert(insertPayload);
    } catch (e) {
      console.warn('Local/offline copy instead of DB sync:', e);
    }

    const updated = [newRecord, ...evals];
    setEvals(updated);
    localStorage.setItem('write2rank_evals', JSON.stringify(updated));
  };

  // ─── Soft Delete & Undo ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const target = evals.find(e => e.id === id);
    if (!target) return;

    setDeletedEval(target);
    setShowUndoToast(true);

    const updated = evals.filter((e) => e.id !== id);
    setEvals(updated);
    localStorage.setItem('write2rank_evals', JSON.stringify(updated));

    // Async trigger server delete, allows brief interval to cancel
    setTimeout(async () => {
      // Check if user clicked restore in the meantime
      const currentPinned = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
      const isRestored = currentPinned.some((e: any) => e.id === id);
      if (!isRestored) {
        try {
          await supabase.from('evaluations').delete().eq('id', id);
        } catch (err) {
          console.error('Database deletion failed:', err);
        }
      }
    }, 5000);
  };

  const handleRestore = () => {
    if (!deletedEval) return;
    const restored = [deletedEval, ...evals];
    setEvals(restored);
    localStorage.setItem('write2rank_evals', JSON.stringify(restored));
    setShowUndoToast(false);
    setDeletedEval(null);
  };

  // ─── Compare actions ───────────────────────────────────────────────────────
  const toggleCompare = (id: string) => {
    if (compareList.includes(id)) {
      setCompareList(compareList.filter(item => item !== id));
    } else {
      if (compareList.length >= 2) {
        alert('You can compare a maximum of 2 evaluations side-by-side.');
        return;
      }
      setCompareList([...compareList, id]);
    }
  };

  // ─── Download Utility ──────────────────────────────────────────────────────
  const triggerDownload = (item: EvaluationRecord, format: 'md' | 'pdf') => {
    const filename = `${item.exam.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.${format}`;
    const reportText = `
# Xaminix Evaluation Report
**Exam:** ${item.exam}
**Evaluation ID:** ${item.id}
**Score:** ${item.score} / ${item.maxScore}
**Confidence:** ${item.confidence}%
**Date:** ${new Date(item.date).toLocaleDateString()}

---
## Breakdown Metrics
${item.breakdown?.map(b => `- **${b.q}**: ${b.awarded} / ${b.max} (${b.topic})\n  *Comments: ${b.comments}*`).join('\n') || 'No breakdown available.'}

---
## AI Feedback Summary
${item.feedback?.overall || 'No summary text available.'}
`;

    if (format === 'md') {
      const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF print window helper
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Xaminix - Report ${item.id}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.6; }
                h1 { color: #2563eb; }
                .metric { padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 8px; }
                pre { white-space: pre-wrap; word-wrap: break-word; background: #fafafa; padding: 16px; border-radius: 8px; border: 1px solid #eee; }
              </style>
            </head>
            <body>
              <h1>Xaminix AI Critique Report</h1>
              <p><strong>Subject:</strong> ${item.exam}</p>
              <p><strong>Date:</strong> ${new Date(item.date).toLocaleDateString()}</p>
              <p><strong>Overall Marks:</strong> ${item.score}/${item.maxScore}</p>
              <hr />
              <h2>Detailed Rubrics</h2>
              ${item.breakdown?.map(b => `
                <div class="metric">
                  <strong>${b.q} (${b.topic})</strong>: ${b.awarded}/${b.max} Marks<br/>
                  <em>Feedback: ${b.comments}</em>
                </div>
              `).join('') || ''}
              <h2>Critique & Model Outlines</h2>
              <pre>${item.feedback?.overall || ''}</pre>
              <script>window.onload = function() { window.print(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // ─── Analytics Calculations ─────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (evals.length === 0) return null;
    const scores = evals.map(e => e.score);
    const avgMarks = Math.round(scores.reduce((a, b) => a + b, 0) / evals.length);
    const highestMarks = Math.max(...scores);
    
    // Subjects counting
    const subjectsMap: Record<string, number> = {};
    evals.forEach(e => {
      subjectsMap[e.exam] = (subjectsMap[e.exam] || 0) + 1;
    });
    const favSubject = Object.entries(subjectsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Weakest topic identification based on rubric breakdowns
    const topicScores: Record<string, { awarded: number; max: number }> = {};
    evals.forEach(e => {
      e.breakdown?.forEach(b => {
        const topic = b.topic || 'General';
        if (!topicScores[topic]) topicScores[topic] = { awarded: 0, max: 0 };
        topicScores[topic].awarded += b.awarded;
        topicScores[topic].max += b.max;
      });
    });
    
    const weakestTopic = Object.entries(topicScores)
      .map(([topic, data]) => ({ topic, ratio: data.awarded / (data.max || 1) }))
      .sort((a, b) => a.ratio - b.ratio)[0]?.topic || 'N/A';

    return {
      total: evals.length,
      avg: avgMarks,
      highest: highestMarks,
      favSubject,
      weakestTopic,
      lastDate: evals[0]?.date ? new Date(evals[0].date).toLocaleDateString() : 'N/A'
    };
  }, [evals]);

  // Unique lists for filters
  const subjectsList = useMemo(() => {
    const set = new Set(evals.map(e => e.exam));
    return Array.from(set);
  }, [evals]);

  const allTagsList = useMemo(() => {
    const list = Object.values(customTags).flat();
    return Array.from(new Set(list));
  }, [customTags]);

  // ─── Filter & Search Implementation ────────────────────────────────────────
  const processedEvals = useMemo(() => {
    let result = [...evals];

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.exam.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.feedback?.overall || '').toLowerCase().includes(q) ||
        (e.extractedText || '').toLowerCase().includes(q) ||
        e.breakdown?.some(b => b.topic.toLowerCase().includes(q) || b.comments.toLowerCase().includes(q))
      );
    }

    // Filter by subject
    if (filterSubject !== 'all') {
      result = result.filter(e => e.exam === filterSubject);
    }

    // Filter by Custom Tag
    if (selectedTag !== 'all') {
      result = result.filter(e => customTags[e.id]?.includes(selectedTag));
    }

    // Filter by Marks Breakdown (Rubric score)
    if (filterMarks !== 'all') {
      result = result.filter(e => {
        const normalized = (e.score / e.maxScore) * 5; // normalize to 5.0 scale
        if (filterMarks === 'excellent') return normalized >= 4.0;
        if (filterMarks === 'good') return normalized >= 3.0 && normalized < 4.0;
        if (filterMarks === 'needs-improvement') return normalized < 3.0;
        return true;
      });
    }

    // Filter by date range
    if (filterDate !== 'all') {
      const today = new Date();
      result = result.filter(e => {
        const evalDate = new Date(e.date);
        const diffDays = Math.ceil(Math.abs(today.getTime() - evalDate.getTime()) / (1000 * 60 * 60 * 24));
        if (filterDate === 'today') return diffDays <= 1;
        if (filterDate === 'week') return diffDays <= 7;
        if (filterDate === 'month') return diffDays <= 30;
        return true;
      });
    }

    // Filter by Confidence
    if (filterConfidence !== 'all') {
      result = result.filter(e => {
        if (filterConfidence === 'high') return e.confidence >= 90;
        if (filterConfidence === 'medium') return e.confidence >= 70 && e.confidence < 90;
        if (filterConfidence === 'low') return e.confidence < 70;
        return true;
      });
    }

    // Order items: Pinned evaluations first, then apply sort
    result.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
      
      if (aPinned !== bPinned) {
        return bPinned - aPinned; // Pinned items go first
      }

      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'highest') return b.score - a.score;
      if (sortBy === 'lowest') return a.score - b.score;
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      return 0;
    });

    return result;
  }, [evals, searchQuery, filterSubject, selectedTag, filterMarks, filterDate, filterConfidence, pinnedIds, sortBy, customTags]);

  const compareData = useMemo(() => {
    if (compareList.length !== 2) return null;
    const a = evals.find(e => e.id === compareList[0]);
    const b = evals.find(e => e.id === compareList[1]);
    return { a, b };
  }, [compareList, evals]);

  // UI status helpers
  const getBadgeConfig = (score: number, maxScore: number) => {
    const pct = (score / maxScore) * 100;
    if (pct >= 75) return { text: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
    if (pct >= 50) return { text: 'Good', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' };
    return { text: 'Needs Work', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' };
  };

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: 80 }}>
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-stack-mobile" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Saved Evaluations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review metrics, track analytical progress, and compare past submissions.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {compareList.length === 2 && (
            <button 
              className="btn btn-outline"
              onClick={() => setIsCompareOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#3b82f6', color: '#3b82f6', background: 'rgba(59,130,246,0.04)' }}
            >
              <ArrowUpDown size={15} /> Compare Selected ({compareList.length})
            </button>
          )}
          <Link href="/evaluations/new">
            <button className="btn">
              <Plus size={18} /> New Evaluation
            </button>
          </Link>
        </div>
      </div>

      {/* ─── TOAST / UNDO BANNER ────────────────────────────────────────────── */}
      {showUndoToast && deletedEval && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 20px', borderRadius: 12,
          background: '#1e293b', color: '#fff',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} color="#f59e0b" />
            <span style={{ fontSize: 13.5 }}>Evaluation &apos;{deletedEval.exam}&apos; deleted.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleRestore} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
              Restore
            </button>
            <button onClick={() => { setShowUndoToast(false); setDeletedEval(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ─── ANALYTICS HEADER ───────────────────────────────────────────────── */}
      {analytics && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
          gap: 16, marginBottom: 32 
        }}>
          {[
            { label: 'Total Assessments', value: analytics.total, desc: `Latest: ${analytics.lastDate}`, icon: <FileText size={18} /> },
            { label: 'Average Score', value: `${analytics.avg}/100`, desc: 'Normalised score', icon: <Sparkles size={18} /> },
            { label: 'Highest Score', value: `${analytics.highest}/100`, desc: 'Personal record', icon: <CheckCircle size={18} /> },
            { label: 'Active Subject', value: analytics.favSubject, desc: 'Most evaluations', icon: <BookOpen size={18} /> },
            { label: 'Weakest Domain', value: analytics.weakestTopic, desc: 'Focus area', icon: <Info size={18} /> }
          ].map((card, i) => (
            <div key={i} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>{card.label}</span>
                <span style={{ color: '#94a3b8' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{card.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FILTERS & CONTROLS ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20, marginBottom: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          {/* Row 1: Search and Sort */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by legal sections, topic, subject or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 42, paddingRight: 16, paddingBlock: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: 'auto' }}>
              <ArrowUpDown size={16} style={{ color: '#64748b' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Marks</option>
                <option value="lowest">Lowest Marks</option>
                <option value="confidence">Highest Confidence</option>
              </select>
            </div>
          </div>

          {/* Row 2: Filtering pill selections */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
            {/* Subject Select */}
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              <option value="all">All Subjects</option>
              {subjectsList.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>

            {/* Performance Select */}
            <select
              value={filterMarks}
              onChange={(e) => setFilterMarks(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              <option value="all">All Score Tiers</option>
              <option value="excellent">Excellent (&ge; 75%)</option>
              <option value="good">Good (50% - 74%)</option>
              <option value="needs-improvement">Needs Work (&lt; 50%)</option>
            </select>

            {/* Date Select */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            {/* Confidence Select */}
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              <option value="all">Any Confidence</option>
              <option value="high">High (&ge; 90%)</option>
              <option value="medium">Medium (70% - 89%)</option>
              <option value="low">Low (&lt; 70%)</option>
            </select>

            {/* Tag Selection */}
            {allTagsList.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', backgroundColor: '#f8fafc' }}
              >
                <option value="all">All Tags</option>
                {allTagsList.map((tag, idx) => (
                  <option key={idx} value={tag}>{tag}</option>
                ))}
              </select>
            )}

            {/* Reset filters */}
            {(filterSubject !== 'all' || filterMarks !== 'all' || filterDate !== 'all' || filterConfidence !== 'all' || selectedTag !== 'all' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setFilterSubject('all');
                  setFilterMarks('all');
                  setFilterDate('all');
                  setFilterConfidence('all');
                  setSelectedTag('all');
                  setSearchQuery('');
                }}
                style={{
                  background: 'none', border: 'none', color: '#ef4444',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px'
                }}
              >
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── CARD LISTING / EMPTY STATE ─────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', gap: 16 }}>
          <Loader2 className="animate-spin" size={36} style={{ color: '#2563eb' }} />
          <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Loading Saved Evaluations...</span>
        </div>
      ) : processedEvals.length === 0 ? (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 72, filter: 'grayscale(0.2)' }}>🎓</div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {evals.length === 0 ? 'No evaluations yet' : 'No matches found'}
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
              {evals.length === 0
                ? 'Critiques and structural reports will automatically appear here once generated.'
                : 'Try adjusting your search query, sorting conditions, or tag filters.'}
            </p>
          </div>
          {evals.length === 0 && (
            <Link href="/evaluations/new">
              <button className="btn" style={{ padding: '12px 24px' }}>
                Evaluate Your First Answer
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {processedEvals.map((item) => {
            const isPinned = pinnedIds.includes(item.id);
            const badge = getBadgeConfig(item.score, item.maxScore);
            const tags = customTags[item.id] || [];

            // Attempt to derive preview sentence from critique output
            const previewLines = item.feedback?.overall
              ? item.feedback.overall.replace(/[#*`\-]/g, '').trim().substring(0, 140) + '...'
              : 'Detailed assessment report ready to read.';

            return (
              <div 
                className="card" 
                key={item.id}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: 24, border: `1px solid ${isPinned ? '#bfdbfe' : '#e2e8f0'}`,
                  background: isPinned ? 'rgba(59,130,246,0.01)' : '#fff',
                  boxShadow: '0 4px 15px -3px rgba(0,0,0,0.02)',
                  position: 'relative',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                {/* Pinned star */}
                <button
                  onClick={() => togglePin(item.id)}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isPinned ? '#2563eb' : '#cbd5e1'
                  }}
                  title={isPinned ? 'Unpin evaluation' : 'Pin evaluation'}
                >
                  <Pin size={18} fill={isPinned ? '#2563eb' : 'none'} style={{ transform: 'rotate(45deg)' }} />
                </button>

                {/* Card Main Info */}
                <div style={{ paddingRight: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.exam}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '6px 0 10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.feedback?.overall?.split('\n').filter(Boolean)[0]?.replace(/^#+\s*/, '') || `Evaluation — ${item.id}`}
                  </h3>
                </div>

                {/* Badges / Metrics Row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: badge.color, backgroundColor: badge.bg }}>
                    {badge.text}
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9' }}>
                    🤖 {item.confidence}% Match
                  </span>
                  {item.breakdown && item.breakdown.length > 0 && (
                    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9' }}>
                      📋 {item.breakdown.length} criteria
                    </span>
                  )}
                </div>

                {/* Score & Preview Gauge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>RAG Verified Score</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{item.score}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}> / {item.maxScore}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Created On</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Text preview */}
                <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, marginBottom: 16, flexGrow: 1 }}>
                  {previewLines}
                </p>

                {/* Tag Display List */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
                    {tags.map((t, idx) => (
                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', color: '#2563eb' }}>
                        <Tag size={10} /> {t}
                        <button onClick={() => removeTagFromEval(item.id, t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex' }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
                  <Link href={`/evaluations/${item.id}`} style={{ flexGrow: 1 }}>
                    <button className="btn btn-outline" style={{ width: '100%', padding: '7px 12px', fontSize: 12.5, display: 'inline-flex', gap: 4, justifyContent: 'center' }}>
                      <Eye size={13} /> Open Report
                    </button>
                  </Link>

                  {/* Tag adder button */}
                  <button
                    onClick={() => setTaggingEvalId(taggingEvalId === item.id ? null : item.id)}
                    style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b' }}
                    title="Add Custom Tag"
                  >
                    <Tag size={14} />
                  </button>

                  {/* Duplicate button */}
                  <button
                    onClick={() => duplicateEvaluation(item)}
                    style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b' }}
                    title="Duplicate Evaluation"
                  >
                    <Copy size={14} />
                  </button>

                  {/* Download selection */}
                  <button
                    onClick={() => triggerDownload(item, 'pdf')}
                    style={{ padding: 6, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b' }}
                    title="Download Report (PDF)"
                  >
                    <Download size={14} />
                  </button>

                  {/* Compare toggle */}
                  <button
                    onClick={() => toggleCompare(item.id)}
                    style={{
                      padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
                      background: compareList.includes(item.id) ? 'rgba(59,130,246,0.1)' : '#fff',
                      cursor: 'pointer', color: compareList.includes(item.id) ? '#2563eb' : '#64748b',
                      fontSize: 12, display: 'inline-flex', gap: 4, alignItems: 'center'
                    }}
                    title="Add to comparative view"
                  >
                    {compareList.includes(item.id) ? <Check size={13} /> : <Plus size={13} />} Compare
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: 6, border: '1px solid #fecaca', borderRadius: 8, background: 'rgba(239,68,68,0.02)', cursor: 'pointer', color: '#ef4444', marginLeft: 'auto' }}
                    title="Delete Evaluation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Inline tag editor toggle panel */}
                {taggingEvalId === item.id && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, padding: '10px 0 0', borderTop: '1px dashed #e2e8f0' }}>
                    <input
                      type="text"
                      placeholder="New tag name..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addTagToEval(item.id, newTagInput); }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      onClick={() => addTagToEval(item.id, newTagInput)}
                      style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── COMPARATIVE SIDE-BY-SIDE STUDY DIALOG ──────────────────────────── */}
      {isCompareOpen && compareData && compareData.a && compareData.b && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 1100,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Comparative Study Desk</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Analyze criteria breakdown, conceptual patterns, and rubrics side-by-side.</p>
              </div>
              <button 
                onClick={() => setIsCompareOpen(false)}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Side by side comparison panels */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#e2e8f0' }}>
              {/* Card A Panel */}
              <div style={{ background: '#fff', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Evaluation 1 — {compareData.a.exam}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>
                    {compareData.a.feedback?.overall?.split('\n').filter(Boolean)[0]?.replace(/^#+\s*/, '') || compareData.a.id}
                  </h3>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>
                    {compareData.a.score} <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>/ {compareData.a.maxScore} Marks</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Rubric Breakdown</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {compareData.a.breakdown?.map((b, idx) => (
                      <div key={idx} style={{ fontSize: 12.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{b.q}</span>
                          <span style={{ fontWeight: 700 }}>{b.awarded} / {b.max}</span>
                        </div>
                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(b.awarded / b.max) * 100}%`, height: '100%', background: '#2563eb' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{b.comments}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Original Student Answer Text</h4>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 12, maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#475569', border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                    {compareData.a.extractedText || 'No answer text extracted.'}
                  </div>
                </div>
              </div>

              {/* Card B Panel */}
              <div style={{ background: '#fff', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Evaluation 2 — {compareData.b.exam}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>
                    {compareData.b.feedback?.overall?.split('\n').filter(Boolean)[0]?.replace(/^#+\s*/, '') || compareData.b.id}
                  </h3>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>
                    {compareData.b.score} <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>/ {compareData.b.maxScore} Marks</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Rubric Breakdown</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {compareData.b.breakdown?.map((b, idx) => (
                      <div key={idx} style={{ fontSize: 12.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{b.q}</span>
                          <span style={{ fontWeight: 700 }}>{b.awarded} / {b.max}</span>
                        </div>
                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(b.awarded / b.max) * 100}%`, height: '100%', background: '#8b5cf6' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{b.comments}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Original Student Answer Text</h4>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 12, maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#475569', border: '1px solid #f1f5f9', lineHeight: 1.5 }}>
                    {compareData.b.extractedText || 'No answer text extracted.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Compare Actions Footer */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => { setCompareList([]); setIsCompareOpen(false); }}>
                Clear Selections
              </button>
              <button className="btn" onClick={() => setIsCompareOpen(false)}>
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { FileText, Search, RefreshCw, AlertTriangle, Eye, Calendar, Sparkles } from 'lucide-react';

interface EvaluationItem {
  id: string;
  user_id: string;
  score: number;
  max_score: number;
  confidence: number;
  exam_type: string;
  created_at: string;
  question_text: string;
  answer_text: string;
  users?: {
    name: string;
    email: string;
  };
}

export default function AdminEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEval, setSelectedEval] = useState<EvaluationItem | null>(null);

  const fetchEvaluations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/founder/api/evaluations');
      if (!res.ok) throw new Error('Failed to fetch evaluations database records.');
      const data = await res.json();
      setEvaluations(data.evaluations || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchEvaluations());
  }, []);

  const filteredEvals = evaluations.filter((e) => {
    const userString = e.users ? `${e.users.name} ${e.users.email}` : 'guest guest@xaminix.com';
    return (
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.exam_type.toLowerCase().includes(search.toLowerCase()) ||
      userString.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '40vh' }}>
        <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mb-4 opacity-85" />
        <p className="text-zinc-400 text-xs font-semibold font-mono tracking-wider uppercase">Querying evaluations registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fd-card flex flex-col items-center justify-center text-center p-12" style={{ maxWidth: 500, margin: '40px auto' }}>
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evaluations Query Failed</h3>
        <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{error}</p>
        <button onClick={fetchEvaluations} className="fd-btn-primary mt-6">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative bg-[#090d16]/40 p-2 border border-white/[0.04] rounded-xl">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by evaluation ID, exam type, student name, or email..."
          className="fd-input pl-10"
        />
      </div>

      {/* Grid: Table + Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Evaluations Table */}
        <div className="fd-table-wrapper xl:col-span-2">
          <table className="fd-table">
            <thead className="fd-table-header">
              <tr>
                <th>Submission Details</th>
                <th>Student Account</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th style={{ textAlign: 'center' }}>Confidence</th>
                <th style={{ textAlign: 'right' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvals.map((item) => (
                <tr 
                  key={item.id} 
                  className={`fd-table-row ${selectedEval?.id === item.id ? 'bg-indigo-500/[0.05]' : ''}`}
                  onClick={() => setSelectedEval(item)}
                >
                  <td>
                    <div className="font-semibold text-zinc-100 truncate max-w-[200px] text-[13px]">{item.exam_type}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3 w-3 opacity-70" />
                      {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div className="font-semibold text-zinc-200 text-[13px]">{item.users?.name || 'Guest User'}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">{item.users?.email || 'guest@xaminix.com'}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="fd-status-pill green">
                      {item.score} / {item.max_score}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="fd-status-pill blue">
                      {item.confidence}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEval(item);
                      }}
                      className="fd-btn-secondary"
                      style={{ padding: '6px 10px', borderRadius: '8px' }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEvals.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-zinc-500 font-medium py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-zinc-600 mb-2" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No Evaluations Logged</span>
                      <span className="text-zinc-500 text-[11px] max-w-[280px]">No grading records match the active search term query.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live Detail Inspector */}
        <div className="fd-card space-y-5 shadow-2xl sticky top-20 bg-[#090d16]/80 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Sparkles className="h-4 w-4 text-indigo-400 opacity-80" /> Evaluation Inspector
          </h3>

          {selectedEval ? (
            <div className="space-y-5 text-xs">
              <div>
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">Evaluation ID</span>
                <span className="font-mono text-zinc-400 select-all mt-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 inline-block">{selectedEval.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">Grading Score</span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    {selectedEval.score} / {selectedEval.max_score}
                  </span>
                </div>
                <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block">AI Confidence</span>
                  <span className="font-bold text-indigo-400 text-sm mt-1 block">
                    {selectedEval.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Student Question Text</span>
                <div className="bg-[#05070a] border border-white/[0.04] p-3.5 rounded-lg text-zinc-300 max-h-40 overflow-y-auto custom-scrollbar select-text leading-relaxed whitespace-pre-wrap text-[11px]">
                  {selectedEval.question_text || 'No question text provided.'}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] block mb-1">Student Answer Text</span>
                <div className="bg-[#05070a] border border-white/[0.04] p-3.5 rounded-lg text-zinc-300 max-h-64 overflow-y-auto custom-scrollbar select-text leading-relaxed whitespace-pre-wrap font-mono text-[11px] shadow-inner">
                  {selectedEval.answer_text}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Eye className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">No Row Selected</p>
              <p className="text-zinc-500 text-[11px] mt-1">Select an evaluation from the list to inspect input text.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      const res = await fetch('/admin/api/evaluations');
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
    const userString = e.users ? `${e.users.name} ${e.users.email}` : 'guest guest@write2rank.com';
    return (
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.exam_type.toLowerCase().includes(search.toLowerCase()) ||
      userString.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mb-4 opacity-80" />
        <p className="text-zinc-500 text-sm font-medium tracking-wide">Querying evaluations registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Evaluations Query Failed</h3>
        <p className="text-zinc-500 text-sm max-w-md mt-2">{error}</p>
        <button onClick={fetchEvaluations} className="mt-8 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-400" />
            </div>
            Evaluations Log
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium">Review student answer submissions, grading scores, and confidence level metrics.</p>
        </div>
        <button 
          onClick={fetchEvaluations}
          className="px-4 py-2.5 bg-[#111] hover:bg-[#1a1a1a] border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative bg-[#0a0a0a] p-2 border border-white/5 rounded-2xl">
        <div className="absolute inset-y-0 left-4 pl-2 flex items-center pointer-events-none text-zinc-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by evaluation ID, exam type, student name, or email..."
          className="w-full bg-transparent text-white rounded-xl py-3 pl-10 pr-4 outline-none text-sm placeholder-zinc-600 transition-colors focus:bg-white/[0.02]"
        />
      </div>

      {/* Grid: Table + Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Evaluations Table */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-lg xl:col-span-2">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111] border-b border-white/5 text-zinc-500 uppercase tracking-widest text-[10px] font-semibold">
                  <th className="px-6 py-4">Submission Details</th>
                  <th className="px-6 py-4">Student Account</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Confidence</th>
                  <th className="px-6 py-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {filteredEvals.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedEval?.id === item.id ? 'bg-indigo-500/[0.05] border-indigo-500/10' : ''}`}
                    onClick={() => setSelectedEval(item)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-100 truncate max-w-[200px] text-[13px]">{item.exam_type}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3 w-3 opacity-70" />
                        {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200 text-[13px]">{item.users?.name || 'Guest User'}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">{item.users?.email || 'guest@write2rank.com'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-md font-semibold tracking-wide">
                        {item.score} / {item.max_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2 py-1 rounded-md font-semibold">
                        {item.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEval(item);
                        }}
                        className={`p-1.5 rounded-lg transition-all ${selectedEval?.id === item.id ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium text-sm">
                      No evaluations registered in log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Detail Inspector */}
        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-5 shadow-2xl sticky top-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-4 tracking-tight">
            <Sparkles className="h-4 w-4 text-indigo-400 opacity-80" /> Evaluation Inspector
          </h3>

          {selectedEval ? (
            <div className="space-y-5 text-xs">
              <div>
                <span className="text-zinc-500 font-semibold uppercase tracking-widest text-[9px] block">Evaluation ID</span>
                <span className="font-mono text-zinc-400 select-all block mt-1 bg-white/5 px-2 py-1 rounded-md border border-white/5 inline-block">{selectedEval.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-zinc-500 font-semibold uppercase tracking-widest text-[9px] block">Grading Score</span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    {selectedEval.score} / {selectedEval.max_score}
                  </span>
                </div>
                <div className="bg-[#111] p-3 rounded-xl border border-white/5">
                  <span className="text-zinc-500 font-semibold uppercase tracking-widest text-[9px] block">AI Confidence</span>
                  <span className="font-bold text-indigo-400 text-sm mt-1 block">
                    {selectedEval.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold uppercase tracking-widest text-[9px] block mb-1">Student Question Text</span>
                <div className="bg-[#111] border border-white/5 p-3.5 rounded-xl text-zinc-300 max-h-40 overflow-y-auto custom-scrollbar select-text leading-relaxed whitespace-pre-wrap text-[11px]">
                  {selectedEval.question_text || 'No question text provided.'}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 font-semibold uppercase tracking-widest text-[9px] block mb-1">Student Answer Text</span>
                <div className="bg-[#050505] border border-white/5 p-3.5 rounded-xl text-zinc-300 max-h-64 overflow-y-auto custom-scrollbar select-text leading-relaxed whitespace-pre-wrap font-mono text-[11px] shadow-inner">
                  {selectedEval.answer_text}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Eye className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-xs font-medium">Select a row to inspect evaluation text.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

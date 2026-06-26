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
    fetchEvaluations();
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Querying evaluations registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold">Evaluations Query Failed</h3>
        <p className="text-gray-400 text-sm max-w-md mt-2">{error}</p>
        <button onClick={fetchEvaluations} className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs transition">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" /> Evaluations Log
          </h1>
          <p className="text-gray-400 text-xs mt-1">Review student answer submissions, grading scores, and confidence level metrics.</p>
        </div>
        <button 
          onClick={fetchEvaluations}
          className="px-4 py-2 bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative bg-gray-900/30 p-4 border border-gray-800/60 rounded-xl">
        <div className="absolute inset-y-0 left-4 pl-3 flex items-center pointer-events-none text-gray-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by evaluation ID, exam type, student name, or email..."
          className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg py-2.5 pl-10 pr-4 outline-none text-xs placeholder-gray-600"
        />
      </div>

      {/* Grid: Table + Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Evaluations Table */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl overflow-hidden shadow-lg xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-5 py-3.5">Submission Details</th>
                  <th className="px-5 py-3.5">Student Account</th>
                  <th className="px-5 py-3.5 text-center">Score</th>
                  <th className="px-5 py-3.5 text-center">Confidence</th>
                  <th className="px-5 py-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvals.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-900/50 hover:bg-gray-900/10 cursor-pointer ${selectedEval?.id === item.id ? 'bg-indigo-900/10 border-indigo-900/40' : ''}`}
                    onClick={() => setSelectedEval(item)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white truncate max-w-[200px]">{item.exam_type}</div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-300">{item.users?.name || 'Guest User'}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{item.users?.email || 'guest@write2rank.com'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-xs px-2 py-0.5 rounded font-bold">
                        {item.score} / {item.max_score}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 text-[10px] px-2 py-0.5 rounded font-semibold">
                        {item.confidence}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEval(item);
                        }}
                        className="p-1.5 bg-gray-950 border border-gray-800 hover:border-indigo-500 text-gray-400 hover:text-white rounded-lg transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                      No evaluations registered in database log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Detail Inspector */}
        <div className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-5 space-y-4 shadow-lg sticky top-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Evaluation Inspector
          </h3>

          {selectedEval ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[9px] block">Evaluation ID</span>
                <span className="font-mono text-gray-400 select-all block mt-0.5">{selectedEval.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 font-semibold uppercase text-[9px] block">Grading Score</span>
                  <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                    {selectedEval.score} / {selectedEval.max_score}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold uppercase text-[9px] block">AI Confidence</span>
                  <span className="font-bold text-indigo-400 text-sm mt-0.5 block">
                    {selectedEval.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[9px] block">Student Question Text</span>
                <div className="bg-gray-950 border border-gray-900 p-2.5 rounded-lg text-gray-300 max-h-32 overflow-y-auto mt-1 select-text leading-relaxed whitespace-pre-wrap">
                  {selectedEval.question_text || 'No question text provided.'}
                </div>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase text-[9px] block">Student Answer Text</span>
                <div className="bg-gray-950 border border-gray-900 p-2.5 rounded-lg text-gray-300 max-h-48 overflow-y-auto mt-1 select-text leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {selectedEval.answer_text}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-xs">
              Select an evaluation row to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

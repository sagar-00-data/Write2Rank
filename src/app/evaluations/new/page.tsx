'use client';
import { useState, useEffect } from 'react';
import {
  ArrowRight, Loader, Edit3, HelpCircle, Sparkles, Wand2,
  Info, BookOpen, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UploadManager, { PageItem } from '@/components/UploadManager';

// ─── Stream text parser (unchanged) ──────────────────────────────────────────

interface StreamData {
  provisions: string;
  analysis: string;
  conclusion: string;
  formatting: string;
  total: string;
  citationsAudit: string;
  strengthsDeficiencies: string;
  modelAnswer: string;
  generalMarkdown: string;
}

function parseStreamText(text: string): StreamData {
  let provisions = '';
  let analysis = '';
  let conclusion = '';
  let formatting = '';
  let total = '';
  let citationsAudit = '';
  let strengthsDeficiencies = '';
  let modelAnswer = '';
  let generalMarkdown = text;

  const metricsStartIdx = text.indexOf('---METRICS_START---');
  const metricsEndIdx = text.indexOf('---METRICS_END---');

  if (metricsStartIdx > -1) {
    let metricsContent = '';
    if (metricsEndIdx > -1) {
      metricsContent = text.substring(metricsStartIdx + '---METRICS_START---'.length, metricsEndIdx);
      generalMarkdown = text.substring(0, metricsStartIdx) + text.substring(metricsEndIdx + '---METRICS_END---'.length);
    } else {
      metricsContent = text.substring(metricsStartIdx + '---METRICS_START---'.length);
      generalMarkdown = text.substring(0, metricsStartIdx);
    }

    const provMatch = metricsContent.match(/Legal Provisions[^:]*:\s*(\d+)/i);
    const analMatch = metricsContent.match(/Analysis[^:]*:\s*(\d+)/i);
    const concMatch = metricsContent.match(/Conclusion[^:]*:\s*(\d+)/i);
    const formMatch = metricsContent.match(/Secretarial[^:]*:\s*(\d+)/i);
    const totMatch  = metricsContent.match(/Total[^:]*:\s*(\d+)/i);

    if (provMatch) provisions = provMatch[1];
    if (analMatch) analysis   = analMatch[1];
    if (concMatch) conclusion = concMatch[1];
    if (formMatch) formatting = formMatch[1];
    if (totMatch)  total      = totMatch[1];
  }

  generalMarkdown = generalMarkdown.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, '').trim();

  const auditHeaderIdx     = generalMarkdown.search(/(?:1\.\s*OVERALL|###\s*1\.\s*OVERALL)/i);
  const strengthsHeaderIdx = generalMarkdown.search(/(?:5\.\s*EXAMINER|###\s*5\.\s*EXAMINER)/i);
  const modelHeaderIdx     = generalMarkdown.search(/(?:9\.\s*PERFECT|###\s*9\.\s*PERFECT)/i);

  if (auditHeaderIdx > -1) {
    if (strengthsHeaderIdx > -1) {
      citationsAudit = generalMarkdown.substring(auditHeaderIdx, strengthsHeaderIdx).trim();
      if (modelHeaderIdx > -1) {
        strengthsDeficiencies = generalMarkdown.substring(strengthsHeaderIdx, modelHeaderIdx).trim();
        modelAnswer = generalMarkdown.substring(modelHeaderIdx).trim();
      } else {
        strengthsDeficiencies = generalMarkdown.substring(strengthsHeaderIdx).trim();
      }
    } else {
      citationsAudit = generalMarkdown.substring(auditHeaderIdx).trim();
    }
  }

  return { provisions, analysis, conclusion, formatting, total, citationsAudit, strengthsDeficiencies, modelAnswer, generalMarkdown };
}

// ─── OCR helpers ──────────────────────────────────────────────────────────────

async function callOcrApi(file: File): Promise<{ text: string; notice?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/ocr', { method: 'POST', body: formData });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorMsg = 'OCR API failed';
    if (isJson) {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } else {
      const text = await response.text();
      errorMsg = text.substring(0, 150) || `Server error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  if (isJson) {
    const data = await response.json();
    return { text: data.extractedText, notice: data.notice };
  }
  throw new Error('OCR API returned invalid non-JSON response.');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewEvaluation() {
  const [questionPages, setQuestionPages] = useState<PageItem[]>([]);
  const [answerPages,   setAnswerPages]   = useState<PageItem[]>([]);

  const [isExtracting,  setIsExtracting]  = useState(false);
  const [isEvaluating,  setIsEvaluating]  = useState(false);
  const [isImproving,   setIsImproving]   = useState(false);
  const [extractedQuestion, setExtractedQuestion] = useState('');
  const [extractedAnswer,   setExtractedAnswer]   = useState('');
  const [examType, setExamType] = useState('CS Executive - Company Law');
  const [step, setStep] = useState(1);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [loadingStatus,    setLoadingStatus]    = useState('');

  // kept for backward compatibility with evaluate-icsi-law (sends first page image)
  const [answerImageBase64, setAnswerImageBase64] = useState('');
  const [answerImageMime,   setAnswerImageMime]   = useState('image/jpeg');

  const [streamingResult, setStreamingResult] = useState('');
  const [isStreaming,     setIsStreaming]     = useState(false);
  const [finalEvalId,     setFinalEvalId]     = useState('');

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!isStreaming && finalEvalId) {
      router.push(`/evaluations/${finalEvalId}`);
    }
  }, [isStreaming, finalEvalId, router]);

  // ── OCR: sequential per-page, merge ────────────────────────────────────────

  const handleExtractOCR = async () => {
    if (answerPages.length === 0) return;
    setIsExtracting(true);
    setExtractionStatus('📄 Initialising forensic scan…');

    // Helper: set status on a page
    const setPageStatus = (
      list: PageItem[],
      id: string,
      status: PageItem['status'],
      err?: string
    ): PageItem[] =>
      list.map((p) => (p.id === id ? { ...p, status, error: err } : p));

    try {
      // ── Answer pages ─────────────────────────────────────────────────────

      let answerPagesState = [...answerPages];
      const answerTexts: string[] = [];

      for (let i = 0; i < answerPagesState.length; i++) {
        const page = answerPagesState[i];
        setExtractionStatus(`⚡ OCR: Answer sheet page ${i + 1} / ${answerPagesState.length}…`);
        answerPagesState = setPageStatus(answerPagesState, page.id, 'processing');
        setAnswerPages([...answerPagesState]);

        try {
          const result = await callOcrApi(page.file);
          answerTexts.push(result.text);
          if (result.notice) console.warn('OCR notice:', result.notice);
          answerPagesState = setPageStatus(answerPagesState, page.id, 'done');
        } catch (err: any) {
          answerPagesState = setPageStatus(answerPagesState, page.id, 'error', err.message || 'OCR failed');
          console.error(`Page ${i + 1} OCR error:`, err);
          // continue — don't abort entire flow
        }
        setAnswerPages([...answerPagesState]);
      }

      const mergedAnswer = answerTexts.join('\n\n---\n\n').trim();
      setExtractedAnswer(mergedAnswer);

      // Store first page base64 for evaluate-icsi-law (original behaviour)
      try {
        const firstPage = answerPagesState.find((p) => p.status === 'done') ?? answerPagesState[0];
        const getBase64 = (file: File): Promise<string> =>
          new Promise((res, rej) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload  = () => res(reader.result as string);
            reader.onerror = rej;
          });
        const b64 = await getBase64(firstPage.file);
        setAnswerImageBase64(b64);
        setAnswerImageMime(firstPage.file.type || 'image/jpeg');
      } catch (e) {
        console.error('base64 conversion failed:', e);
      }

      // ── Question pages ────────────────────────────────────────────────────

      if (questionPages.length > 0) {
        let qPagesState = [...questionPages];
        const qTexts: string[] = [];
        setExtractionStatus('📄 OCR: Question paper…');

        for (let i = 0; i < qPagesState.length; i++) {
          const page = qPagesState[i];
          setExtractionStatus(`⚡ OCR: Question paper page ${i + 1} / ${qPagesState.length}…`);
          qPagesState = setPageStatus(qPagesState, page.id, 'processing');
          setQuestionPages([...qPagesState]);

          try {
            const result = await callOcrApi(page.file);
            qTexts.push(result.text);
            qPagesState = setPageStatus(qPagesState, page.id, 'done');
          } catch (err: any) {
            qPagesState = setPageStatus(qPagesState, page.id, 'error', err.message || 'OCR failed');
          }
          setQuestionPages([...qPagesState]);
        }

        setExtractedQuestion(qTexts.join('\n\n---\n\n').trim());
      }

      setStep(2);
    } catch (error) {
      console.error('Extraction Error:', error);
      alert(error instanceof Error ? error.message : 'OCR Extraction failed. Please try again.');
    } finally {
      setIsExtracting(false);
      setExtractionStatus('');
    }
  };

  // ── Improve text (unchanged) ─────────────────────────────────────────────

  const handleImproveText = async () => {
    if (!extractedAnswer) return;
    setIsImproving(true);
    try {
      const response = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedAnswer }),
      });
      const ct = response.headers.get('content-type');
      const isJson = ct?.includes('application/json');
      if (response.ok && isJson) {
        const data = await response.json();
        setExtractedAnswer(data.improvedText);
      } else {
        let msg = 'Failed to improve text.';
        if (isJson) { const d = await response.json(); msg = d.error || msg; }
        else { const t = await response.text(); msg = t.substring(0, 150) || `Server error (${response.status})`; }
        alert(msg);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred during text improvement.');
    } finally {
      setIsImproving(false);
    }
  };

  // ── Evaluate (unchanged logic) ────────────────────────────────────────────

  const handleEvaluate = async () => {
    if (!extractedAnswer) return;

    if (examType !== 'CS Executive - Company Law') {
      setIsEvaluating(true);
      try {
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';
        const response = await fetch('/api/evaluate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerText: extractedAnswer, questionText: extractedQuestion, examType, userId }),
        });

        const ct = response.headers.get('content-type');
        const isJson = ct?.includes('application/json');

        if (!response.ok) {
          let msg = 'Failed to evaluate the text.';
          if (isJson) { const d = await response.json(); msg = d.error || msg; }
          else { const t = await response.text(); msg = t.substring(0, 150) || `Server error (${response.status})`; }
          alert(msg); return;
        }

        if (isJson) {
          const data = await response.json();
          if (typeof window !== 'undefined') {
            const existing = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
            existing.unshift({ ...data, exam: examType, date: new Date().toISOString() });
            localStorage.setItem('write2rank_evals', JSON.stringify(existing));
          }
          router.push(`/evaluations/${data.id}`);
        } else {
          alert('Server returned invalid non-JSON evaluation response.');
        }
      } catch (error) {
        console.error(error);
        alert('An error occurred during evaluation.');
      } finally {
        setIsEvaluating(false);
      }
      return;
    }

    // CS Executive streaming path (unchanged)
    setIsEvaluating(true);
    setIsStreaming(true);
    setStreamingResult('');
    setFinalEvalId('');
    setLoadingStatus('⚖️ Initialising ICSI Council Examiner Engine…');

    const t1 = setTimeout(() => setLoadingStatus('🔍 Fetching Companies Act references (RAG Database)…'), 1500);
    const t2 = setTimeout(() => setLoadingStatus('🔑 Balancing API load & preparing AI generation…'), 3500);

    try {
      const response = await fetch('/api/evaluate-icsi-law', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerText: extractedAnswer,
          questionText: extractedQuestion,
          base64Image: answerImageBase64,
          mimeType: answerImageMime,
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
        }),
      });

      clearTimeout(t1); clearTimeout(t2);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start evaluation stream: ${errorText || response.statusText}`);
      }

      setLoadingStatus('📝 Decoding examiner critique stream…');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';
      let detectedEvalId = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          accumulatedText += chunkStr;

          if (!detectedEvalId) {
            const match = accumulatedText.match(/---EVAL_ID:(eval_[a-z0-9_]+)---/);
            if (match) { detectedEvalId = match[1]; setFinalEvalId(detectedEvalId); }
          }

          setStreamingResult(accumulatedText.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, ''));
        }
      }

      // Local-storage fallback save (unchanged)
      if (detectedEvalId && typeof window !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        const provM = accumulatedText.match(/Legal Provisions & Citations:\s*(\d+)/i);
        const analM = accumulatedText.match(/Analysis & Application:\s*(\d+)/i);
        const concM = accumulatedText.match(/Conclusion:\s*(\d+)/i);
        const formM = accumulatedText.match(/Secretarial Formatting:\s*(\d+)/i);
        const totM  = accumulatedText.match(/Total Score:\s*(\d+)/i);
        const sp = provM ? parseInt(provM[1], 10) : 0;
        const sa = analM ? parseInt(analM[1], 10) : 0;
        const sc = concM ? parseInt(concM[1], 10) : 0;
        const sf = formM ? parseInt(formM[1], 10) : 0;
        const ts = totM  ? parseInt(totM[1],  10) : sp + sa + sc + sf;
        const cleanMd = accumulatedText.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, '');
        existing.unshift({
          id: detectedEvalId, score: ts, maxScore: 100, confidence: 95, status: 'completed',
          exam: examType, date: new Date().toISOString(), extractedText: extractedAnswer,
          feedback: { overall: cleanMd, strengths: ['Citations and legal provisions included'], weaknesses: ['Structure formatting check complete'] },
          breakdown: [
            { q: 'Legal Provisions', topic: 'Companies Act & Case Laws', awarded: sp, max: 35, comments: 'Verification of cited sections' },
            { q: 'Analysis & Application', topic: 'Facts Parsing', awarded: sa, max: 35, comments: 'Application of law to facts' },
            { q: 'Conclusion', topic: 'Legal Stance', awarded: sc, max: 15, comments: 'Definitive conclusion review' },
            { q: 'Secretarial Formatting', topic: 'Professional Structure', awarded: sf, max: 15, comments: 'Provisions → Analysis → Conclusion formatting' },
          ],
        });
        localStorage.setItem('write2rank_evals', JSON.stringify(existing));
      }
    } catch (error) {
      clearTimeout(t1); clearTimeout(t2);
      console.error(error);
      alert('An error occurred during evaluation streaming.');
    } finally {
      setIsEvaluating(false);
      setIsStreaming(false);
      setLoadingStatus('');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="responsive-wrapper animate-fade-in">
      {/* Header */}
      <div className="flex-stack-mobile" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="page-title responsive-title" style={{ marginBottom: 8 }}>New Evaluation</h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>Powered by Gemini Vision · supports multi-page PDFs & images.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ padding: '8px 16px', borderRadius: 20, backgroundColor: step === 1 ? '#2563eb' : '#f1f5f9', color: step === 1 ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0' }}>1. UPLOAD</div>
          <div style={{ padding: '8px 16px', borderRadius: 20, backgroundColor: step === 2 ? '#2563eb' : '#f1f5f9', color: step === 2 ? 'white' : '#64748b', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0' }}>2. REVIEW & EDIT</div>
          <button
            onClick={() => window.location.reload()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px', boxShadow: '0 2px 10px rgba(37,99,235,0.25)', transition: 'background-color 0.2s, transform 0.1s' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={13} /> New Evaluation
          </button>
        </div>
      </div>

      {/* ── STEP 1: Upload ─────────────────────────────────────────────────── */}
      {step === 1 ? (
        <div className="card" style={{ padding: '40px 32px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, boxShadow: '0 10px 30px -10px rgba(15,23,42,0.08)' }}>
          {/* Exam selector */}
          <div className="flex-stack-mobile" style={{ marginBottom: 36 }}>
            <h2 className="card-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Step 1: Upload Documents</h2>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500, outline: 'none', cursor: 'pointer', maxWidth: '100%' }}
            >
              <optgroup label="Chartered Accountant (CA)">
                <option>CA Final - Financial Reporting</option>
                <option>CA Final - Strategic Financial Management</option>
                <option>CA Final - Advanced Auditing</option>
                <option>CA Final - Direct Tax Laws</option>
                <option>CA Final - Indirect Tax Laws</option>
                <option>CA Inter - Corporate Law</option>
                <option>CA Inter - Accounting</option>
                <option>CA Inter - Cost & Management Accounting</option>
                <option>CA Inter - Taxation</option>
                <option>CA Foundation - Principles of Accounting</option>
              </optgroup>
              <optgroup label="Company Secretary (CS)">
                <option>CS Executive - Company Law</option>
                <option>CS Executive - JIGL</option>
                <option>CS Executive - Tax Laws</option>
                <option>CS Professional - Governance & Sustainability</option>
                <option>CS Professional - Drafting & Appearances</option>
              </optgroup>
              <optgroup label="Cost & Management Accountant (CMA)">
                <option>CMA Final - Strategic Financial Management</option>
                <option>CMA Final - Strategic Cost Management</option>
                <option>CMA Inter - Financial Accounting</option>
                <option>CMA Inter - Laws & Ethics</option>
              </optgroup>
              <optgroup label="Other Professional Exams">
                <option>ICSI - Professional Programme</option>
                <option>ICAI - CPT</option>
                <option>MBA - Finance</option>
                <option>LLB - Corporate Law</option>
              </optgroup>
            </select>
          </div>

          {/* Upload panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginBottom: 40 }}>
            {/* Question Paper */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <HelpCircle size={18} color="#64748b" />
                <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Question Paper <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 400 }}>(optional)</span></span>
              </div>
              <UploadManager
                label="Question Paper"
                accent="#0ea5e9"
                accentLight="rgba(14,165,233,0.07)"
                pages={questionPages}
                onPagesChange={setQuestionPages}
                disabled={isExtracting}
              />
            </div>

            {/* Answer Sheet */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Edit3 size={18} color="#2563eb" />
                <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Answer Sheet <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>*required</span></span>
              </div>
              <UploadManager
                label="Answer Sheet"
                accent="#2563eb"
                accentLight="rgba(37,99,235,0.07)"
                pages={answerPages}
                onPagesChange={setAnswerPages}
                disabled={isExtracting}
              />
            </div>
          </div>

          {/* Extraction progress */}
          {isExtracting && (
            <div className="animate-fade-in" style={{ marginBottom: 32, padding: 24, borderRadius: 16, backgroundColor: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                <Sparkles size={24} color="#2563eb" className="animate-pulse" />
                <span style={{ fontSize: 17, fontWeight: 700, color: '#2563eb' }}>{extractionStatus || 'Gemini Vision is reading your handwriting…'}</span>
              </div>
              <div style={{ width: '100%', height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: '100%', height: '100%', backgroundColor: '#2563eb' }} />
              </div>
              <p style={{ fontSize: 13, color: '#64748b' }}>Processing pages sequentially. This may take 10–30 s depending on page count.</p>
            </div>
          )}

          {/* CTA */}
          <button
            className="btn"
            style={{ width: '100%', padding: 18, borderRadius: 12, fontSize: 17, justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.15)', opacity: answerPages.length === 0 ? 0.5 : 1 }}
            onClick={handleExtractOCR}
            disabled={answerPages.length === 0 || isExtracting}
          >
            {isExtracting ? (
              <><Loader size={20} className="animate-spin" style={{ marginRight: 10 }} />Extracting Text…</>
            ) : (
              <>Start Extraction <ArrowRight size={20} style={{ marginLeft: 10 }} /></>
            )}
          </button>
        </div>
      ) : (
        /* ── STEP 2: Review & Evaluate ──────────────────────────────────── */
        <div className="card animate-fade-in" style={{ padding: '40px 32px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, boxShadow: '0 10px 30px -10px rgba(15,23,42,0.08)' }}>
          <div className="flex-stack-mobile" style={{ marginBottom: 32 }}>
            <h2 className="card-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Step 2: Review Extraction</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline"
                style={{ padding: '10px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, borderColor: '#e2e8f0', color: '#2563eb', backgroundColor: '#ffffff' }}
                onClick={handleImproveText}
                disabled={isImproving || isEvaluating}
              >
                {isImproving ? <Loader size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Improve Text
              </button>
              <button className="btn btn-outline" style={{ padding: '10px 20px', borderRadius: 8, color: '#334155', borderColor: '#e2e8f0', backgroundColor: '#ffffff' }} onClick={() => setStep(1)}>Back</button>
            </div>
          </div>

          {/* OCR summary banner */}
          {(answerPages.length > 0 || questionPages.length > 0) && (
            <div style={{ marginBottom: 24, padding: '10px 16px', borderRadius: 10, background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)', fontSize: 13, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {answerPages.length > 0 && <span>📝 Answer: <strong>{answerPages.length} page{answerPages.length !== 1 ? 's' : ''}</strong> merged</span>}
              {questionPages.length > 0 && <span>❓ Question: <strong>{questionPages.length} page{questionPages.length !== 1 ? 's' : ''}</strong> merged</span>}
              <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Order preserved</span>
            </div>
          )}

          <div className="grid-2-cols" style={{ marginBottom: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Question Text</label>
              <textarea
                value={extractedQuestion}
                onChange={(e) => setExtractedQuestion(e.target.value)}
                placeholder="Question text (optional)…"
                style={{ width: '100%', height: 380, padding: 20, borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', fontSize: 14, lineHeight: '1.6', resize: 'none', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answer Text</label>
              <textarea
                value={extractedAnswer}
                onChange={(e) => setExtractedAnswer(e.target.value)}
                placeholder="Extracted answer text…"
                style={{ width: '100%', height: 380, padding: 20, borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', fontSize: 14, lineHeight: '1.6', resize: 'none', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>

          <button
            className="btn"
            style={{ width: '100%', padding: 18, borderRadius: 12, fontSize: 17, justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.15)' }}
            onClick={handleEvaluate}
            disabled={isEvaluating || isImproving}
          >
            {isEvaluating ? (
              <><Loader size={20} className="animate-spin" style={{ marginRight: 10 }} />{isStreaming ? 'Streaming AI Critique…' : 'Running AI Evaluation…'}</>
            ) : (
              <>Evaluate Answer <ArrowRight size={20} style={{ marginLeft: 10 }} /></>
            )}
          </button>

          {isEvaluating && loadingStatus && (
            <div className="animate-pulse" style={{ marginTop: 16, textAlign: 'center', fontSize: 14.5, color: '#2563eb', fontWeight: 600 }}>{loadingStatus}</div>
          )}

          {/* Streaming results — identical to original */}
          {(() => {
            if (!streamingResult) return null;
            const parsed = parseStreamText(streamingResult);
            const showBento = !!(parsed.total || parsed.provisions || parsed.citationsAudit || parsed.strengthsDeficiencies || parsed.modelAnswer);

            return (
              <div className="animate-fade-in" style={{ marginTop: 36 }}>
                {!isStreaming && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <button
                      onClick={() => window.location.reload()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.30)', transition: 'background-color 0.2s, transform 0.15s, box-shadow 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.35)'; }}
                      onMouseOut={(e)  => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.30)'; }}
                    >
                      <Plus size={16} /> New Evaluation
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="#2563eb" className={isStreaming ? 'animate-pulse' : ''} />
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
                      {isStreaming ? 'AI Examiner is grading (Streaming)…' : 'ICSI Council Examiner Grading Complete'}
                    </span>
                  </div>
                  {!isStreaming && finalEvalId && (
                    <button className="btn" style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8, boxShadow: '0 2px 8px rgba(37,99,235,0.15)' }} onClick={() => router.push(`/evaluations/${finalEvalId}`)}>
                      View Detailed Report & Analytics
                    </button>
                  )}
                </div>

                {showBento ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                      {/* Marks Gauge */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.04)', minHeight: 200 }}>
                        <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#64748b', marginBottom: 16, marginTop: 0 }}>Marks Gauge</h4>
                        {parsed.total ? (
                          <>
                            <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 8px 16px -4px rgba(37,99,235,0.08)' }}>
                              <svg style={{ transform: 'rotate(-90deg)', width: 90, height: 90 }}>
                                <circle cx="45" cy="45" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                                <circle cx="45" cy="45" r="38" fill="transparent" stroke={parseInt(parsed.total) >= 40 ? '#10b981' : '#ef4444'} strokeWidth="6"
                                  strokeDasharray={`${2 * Math.PI * 38}`}
                                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - parseInt(parsed.total) / 100)}`}
                                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }}
                                />
                              </svg>
                              <div style={{ position: 'absolute', textAlign: 'center' }}>
                                <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{parsed.total}</span>
                                <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginTop: -4 }}>/100</span>
                              </div>
                            </div>
                            <div style={{ marginTop: 12, padding: '3px 10px', borderRadius: 9999, backgroundColor: parseInt(parsed.total) >= 40 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: parseInt(parsed.total) >= 40 ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: 700 }}>
                              {parseInt(parsed.total) >= 40 ? 'PASSED' : 'FAILED'}
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b' }}><Loader className="animate-spin" size={20} style={{ margin: '0 auto 12px' }} /><span style={{ fontSize: 12 }}>Calculating total…</span></div>
                        )}
                      </div>

                      {/* Parameters */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.04)', minHeight: 200 }}>
                        <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#64748b', marginBottom: 12, marginTop: 0 }}>Parameters</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexGrow: 1, justifyContent: 'center' }}>
                          {[
                            { label: 'Status', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: isStreaming ? '#2563eb' : '#10b981' }}><span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isStreaming ? '#2563eb' : '#10b981' }} className={isStreaming ? 'animate-pulse' : ''} />{isStreaming ? 'Streaming' : 'Completed'}</span> },
                            { label: 'Verify Level', value: <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>95% Match</span> },
                            { label: 'Exam', value: <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 110 }} title={examType}>{examType}</span> },
                          ].map(({ label, value }, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 2 ? '1px solid #f1f5f9' : undefined, paddingBottom: i < 2 ? 6 : 0 }}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>{value}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pillars */}
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.04)', minHeight: 200 }}>
                        <h4 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#64748b', marginBottom: 12, marginTop: 0 }}>Pillars</h4>
                        {parsed.provisions || parsed.analysis || parsed.conclusion || parsed.formatting ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                              { name: 'Provisions', val: parsed.provisions, max: 35, color: '#2563eb' },
                              { name: 'Analysis',   val: parsed.analysis,   max: 35, color: '#8b5cf6' },
                              { name: 'Conclusion', val: parsed.conclusion, max: 15, color: '#10b981' },
                              { name: 'Formatting', val: parsed.formatting, max: 15, color: '#f59e0b' },
                            ].map((pillar, idx) => {
                              const score = parseInt(pillar.val) || 0;
                              const pct   = Math.round((score / pillar.max) * 100);
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1, fontSize: 10.5 }}>
                                    <span style={{ fontWeight: 600, color: '#475569' }}>{pillar.name}</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{pillar.val || 0}<span style={{ color: '#94a3b8', fontWeight: 500 }}>/{pillar.max}</span></span>
                                  </div>
                                  <div style={{ width: '100%', height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pillar.color, borderRadius: 2 }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b', padding: '10px 0' }}><Loader className="animate-spin" size={18} style={{ margin: '0 auto 8px' }} /><span style={{ fontSize: 11 }}>Waiting for scores…</span></div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {parsed.citationsAudit && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px -2px rgba(15,23,42,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}><Info size={16} color="#2563eb" /><h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>Citations Audit</h4></div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5, lineHeight: '1.6', color: '#334155', margin: 0 }}>{parsed.citationsAudit}</pre>
                        </div>
                      )}
                      {parsed.strengthsDeficiencies && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px -2px rgba(15,23,42,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}><Sparkles size={16} color="#8b5cf6" /><h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>Strengths & Deficiencies</h4></div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5, lineHeight: '1.6', color: '#334155', margin: 0 }}>{parsed.strengthsDeficiencies}</pre>
                        </div>
                      )}
                      {parsed.modelAnswer && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px -2px rgba(15,23,42,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}><BookOpen size={16} color="#10b981" /><h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>Perfect Model Answer Outline</h4></div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5, lineHeight: '1.6', color: '#334155', margin: 0 }}>{parsed.modelAnswer}</pre>
                        </div>
                      )}
                      <details style={{ marginTop: 10, cursor: 'pointer' }}>
                        <summary style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Show Raw Markdown Output</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: '1.6', overflowY: 'auto', maxHeight: 300, padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', marginTop: 10, cursor: 'auto' }}>{streamingResult}</pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: '1.7', overflowY: 'auto', maxHeight: 420, padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#334155' }}>{streamingResult}</pre>
                )}
              </div>
            );
          })()}

          <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}><Info size={20} color="#64748b" /></div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>Having trouble with OCR accuracy?</p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: '1.6' }}>
                Try extracting text using <strong>Google Docs</strong> (Upload image → Right click → Open with Google Docs) and paste it here for the most accurate results.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .progress-fill { animation: loading 2s infinite ease-in-out; transform-origin: 0% 50%; }
        @keyframes loading { 0% { transform: scaleX(0); } 50% { transform: scaleX(1); } 100% { transform: scaleX(0); transform-origin: 100% 50%; } }
      `}</style>
    </div>
  );
}

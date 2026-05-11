'use client';
import { useState } from 'react';
import { Upload, File, X, ArrowRight, Loader, Edit3, HelpCircle, Sparkles, Wand2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewEvaluation() {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [extractedQuestion, setExtractedQuestion] = useState<string>('');
  const [extractedAnswer, setExtractedAnswer] = useState<string>('');
  const [examType, setExamType] = useState<string>('CS Executive - Company Law');
  const [step, setStep] = useState(1); // 1: Upload, 2: Review/Edit

  const router = useRouter();

  const callOcrApi = async (file: File): Promise<{ text: string, notice?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'OCR API failed');
    }

    return { text: data.extractedText, notice: data.notice };
  };

  const handleExtractOCR = async () => {
    if (!answerFile) return;
    setIsExtracting(true);

    try {
      // Extract Answer Sheet (Required)
      const answer = await callOcrApi(answerFile);
      setExtractedAnswer(answer.text);
      if (answer.notice) alert(answer.notice);

      // Extract Question Paper (Optional)
      if (questionFile) {
        const question = await callOcrApi(questionFile);
        setExtractedQuestion(question.text);
      }

      setStep(2);
    } catch (error) {
      console.error('Extraction Error:', error);
      alert(error instanceof Error ? error.message : "OCR Extraction failed. Please try again or use manual extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImproveText = async () => {
    if (!extractedAnswer) return;
    setIsImproving(true);

    try {
      const response = await fetch('/api/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedAnswer }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedAnswer(data.improvedText);
      } else {
        alert("Failed to improve text.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during text improvement.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleEvaluate = async () => {
    if (!extractedAnswer) return;
    setIsEvaluating(true);

    try {
      const response = await fetch('/api/evaluate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerText: extractedAnswer,
          questionText: extractedQuestion,
          examType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (typeof window !== 'undefined') {
          const existingEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
          const newEval = {
            ...data,
            exam: examType,
            date: new Date().toISOString()
          };
          existingEvals.unshift(newEval);
          localStorage.setItem('write2rank_evals', JSON.stringify(existingEvals));
        }

        router.push(`/evaluations/${data.id}`);
      } else {
        alert(data.error || "Failed to evaluate the text.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during evaluation.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '8px' }}>New Evaluation</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Powered by Gemini Vision for High-Accuracy Handwriting Recognition.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step === 1 ? 'var(--accent-color)' : 'var(--bg-tertiary)', color: step === 1 ? 'white' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>1. UPLOAD</div>
          <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step === 2 ? 'var(--accent-color)' : 'var(--bg-tertiary)', color: step === 2 ? 'white' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>2. REVIEW & EDIT</div>
        </div>
      </div>

      {step === 1 ? (
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Step 1: Upload Documents</h2>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 500 }}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            {/* Question Paper (Optional) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <HelpCircle size={18} color="var(--text-secondary)" />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Question Paper (Optional)</span>
              </div>
              {!questionFile ? (
                <label
                  className="upload-area"
                  style={{ height: '240px', borderStyle: 'dashed', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setQuestionFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Click to upload questions
                  </span>
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div style={{ height: '240px', padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={40} color="var(--accent-color)" />
                  <div className="text-sm font-medium" style={{ marginTop: '16px', textAlign: 'center' }}>{questionFile.name}</div>
                  <button onClick={() => setQuestionFile(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="var(--text-secondary)" />
                  </button>
                </div>
              )}
            </div>

            {/* Answer Sheet (Required) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Edit3 size={18} color="var(--text-secondary)" />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Answer Sheet (Required)</span>
              </div>
              {!answerFile ? (
                <label
                  className="upload-area"
                  style={{ height: '240px', borderStyle: 'dashed', borderColor: 'var(--accent-color)', backgroundColor: 'rgba(0, 122, 255, 0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setAnswerFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="var(--accent-color)" style={{ marginBottom: '12px' }} />
                  <span className="text-sm" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                    Click to upload answers
                  </span>
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div style={{ height: '240px', padding: '24px', border: '2px solid var(--accent-color)', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={40} color="var(--accent-color)" />
                  <div className="text-sm font-medium" style={{ marginTop: '16px', textAlign: 'center' }}>{answerFile.name}</div>
                  <button onClick={() => setAnswerFile(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="var(--text-secondary)" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
            {isExtracting && (
              <div className="animate-fade-in" style={{ marginBottom: '32px', padding: '24px', borderRadius: '16px', backgroundColor: 'rgba(0, 122, 255, 0.05)', border: '1px solid var(--accent-color)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  <Sparkles size={24} color="var(--accent-color)" className="animate-pulse" />
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)' }}>Gemini Vision is reading your handwriting...</span>
                </div>
                <div className="progress-container" style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div className="progress-fill" style={{ width: '100%', height: '100%', backgroundColor: 'var(--accent-color)' }}></div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This may take 10-15 seconds depending on file size.</p>
              </div>
            )}

            <button className="btn" style={{ width: '100%', padding: '18px', borderRadius: '12px', fontSize: '17px', boxShadow: '0 4px 14px rgba(0, 122, 255, 0.2)' }} onClick={handleExtractOCR} disabled={!answerFile || isExtracting}>
              {isExtracting ? (
                <>
                  <Loader size={20} className="animate-spin" style={{ marginRight: '10px' }} />
                  Extracting Text...
                </>
              ) : (
                <>
                  Start Extraction
                  <ArrowRight size={20} style={{ marginLeft: '10px' }} />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card animate-fade-in" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Step 2: Review Extraction</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                onClick={handleImproveText}
                disabled={isImproving || isEvaluating}
              >
                {isImproving ? <Loader size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Improve Text
              </button>
              <button className="btn btn-outline" style={{ padding: '10px 20px', borderRadius: '8px' }} onClick={() => setStep(1)}>Back</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Question Text</label>
              <textarea
                value={extractedQuestion}
                onChange={(e) => setExtractedQuestion(e.target.value)}
                placeholder="Question text (optional)..."
                style={{ width: '100%', height: '400px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Answer Text</label>
              <textarea
                value={extractedAnswer}
                onChange={(e) => setExtractedAnswer(e.target.value)}
                placeholder="Extracting answer text..."
                style={{ width: '100%', height: '400px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none' }}
              />
            </div>
          </div>

          <button className="btn" style={{ width: '100%', padding: '18px', borderRadius: '12px', fontSize: '17px' }} onClick={handleEvaluate} disabled={isEvaluating || isImproving}>
            {isEvaluating ? (
              <>
                <Loader size={20} className="animate-spin" style={{ marginRight: '10px' }} />
                Running AI Evaluation...
              </>
            ) : (
              <>
                Evaluate Answer
                <ArrowRight size={20} style={{ marginLeft: '10px' }} />
              </>
            )}
          </button>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)' }}>
              <Info size={20} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Having trouble with OCR accuracy?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Try extracting text using <strong>Google Docs</strong> (Upload image &rarr; Right click &rarr; Open with Google Docs) and paste it here for the most accurate results.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .progress-fill {
           animation: loading 2s infinite ease-in-out;
           transform-origin: 0% 50%;
        }
        @keyframes loading {
           0% { transform: scaleX(0); }
           50% { transform: scaleX(1); }
           100% { transform: scaleX(0); transform-origin: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

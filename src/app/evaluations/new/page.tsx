'use client';
import { useState, useEffect } from 'react';
import { Upload, File, X, ArrowRight, Loader, Edit3, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewEvaluation() {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [extractedQuestion, setExtractedQuestion] = useState<string | null>(null);
  const [extractedAnswer, setExtractedAnswer] = useState<string | null>(null);
  const [examType, setExamType] = useState<string>('CA Final - Financial Reporting');
  const [step, setStep] = useState(1); // 1: Upload, 2: Review
  
  const router = useRouter();

  useEffect(() => {
    // Check for "auth" - simple simulation for the MVP
    const user = localStorage.getItem('w2r_user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  const handleExtractOCR = async () => {
    if (!answerFile) return;
    setIsExtracting(true);
    
    try {
      // Extract Answer Sheet
      const answerFormData = new FormData();
      answerFormData.append('file', answerFile);
      const answerRes = await fetch('/api/ocr', { method: 'POST', body: answerFormData });
      const answerData = await answerRes.json();
      setExtractedAnswer(answerData.extractedText);

      // If question file exists, extract it too, otherwise use a placeholder
      if (questionFile) {
        const questionFormData = new FormData();
        questionFormData.append('file', questionFile);
        const questionRes = await fetch('/api/ocr', { method: 'POST', body: questionFormData });
        const questionData = await questionRes.json();
        setExtractedQuestion(questionData.extractedText);
      } else {
        setExtractedQuestion("No specific question paper uploaded. Evaluate based on general standards.");
      }

      setStep(2);
    } catch (error) {
      console.error(error);
      alert("An error occurred during OCR extraction.");
    } finally {
      setIsExtracting(false);
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

      if (response.ok) {
        const data = await response.json();
        
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
        alert("Failed to evaluate the text.");
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
          <p style={{ color: 'var(--text-secondary)' }}>Get precise AI grading for your professional exam answers.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step >= 1 ? 'var(--accent-color)' : 'var(--bg-tertiary)', color: step >= 1 ? 'white' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>1. Upload</div>
           <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step >= 2 ? 'var(--accent-color)' : 'var(--bg-tertiary)', color: step >= 2 ? 'white' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>2. Review</div>
        </div>
      </div>
      
      {step === 1 ? (
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Step 1: Upload Documents</h2>
            <select 
              value={examType} 
              onChange={(e) => setExamType(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 500 }}
            >
              <option>CA Final - Financial Reporting</option>
              <option>CA Inter - Corporate Law</option>
              <option>CS Executive - JIGL</option>
              <option>CMA Final - SFM</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Question Paper Upload */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <HelpCircle size={18} color="var(--text-secondary)" />
                <span style={{ fontWeight: 600 }}>Question Paper (Optional)</span>
              </div>
              {!questionFile ? (
                <div 
                  className="upload-area" 
                  style={{ height: '200px', borderStyle: 'dashed' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setQuestionFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                  <label className="text-sm" style={{ cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 600 }}>
                    Click to upload questions
                    <input type="file" style={{ display: 'none' }} onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              ) : (
                <div style={{ height: '200px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={40} color="var(--accent-color)" />
                  <div className="text-sm font-medium" style={{ marginTop: '12px', textAlign: 'center' }}>{questionFile.name}</div>
                  <button onClick={() => setQuestionFile(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={18} color="var(--text-secondary)" />
                  </button>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)', fontSize: '12px' }}>
                    <CheckCircle2 size={14} /> Ready for OCR
                  </div>
                </div>
              )}
            </div>

            {/* Answer Sheet Upload */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Edit3 size={18} color="var(--text-secondary)" />
                <span style={{ fontWeight: 600 }}>Answer Sheet (Required)</span>
              </div>
              {!answerFile ? (
                <div 
                  className="upload-area" 
                  style={{ height: '200px', borderStyle: 'dashed', borderColor: 'var(--accent-color)', backgroundColor: 'rgba(0, 122, 255, 0.02)' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setAnswerFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="var(--accent-color)" style={{ marginBottom: '12px' }} />
                  <label className="text-sm" style={{ cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 600 }}>
                    Click to upload answers
                    <input type="file" style={{ display: 'none' }} onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              ) : (
                <div style={{ height: '200px', padding: '20px', border: '2px solid var(--accent-color)', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={40} color="var(--accent-color)" />
                  <div className="text-sm font-medium" style={{ marginTop: '12px', textAlign: 'center' }}>{answerFile.name}</div>
                  <button onClick={() => setAnswerFile(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={18} color="var(--text-secondary)" />
                  </button>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)', fontSize: '12px' }}>
                    <CheckCircle2 size={14} /> Ready for OCR
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ padding: '14px 28px' }} onClick={handleExtractOCR} disabled={!answerFile || isExtracting}>
              {isExtracting ? (
                <>
                  <Loader size={18} className="animate-spin" style={{ marginRight: '8px' }} />
                  Processing documents...
                </>
              ) : (
                <>
                  Process & Extract Text
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card animate-fade-in" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Step 2: Review Extracted Content</h2>
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              Back to Upload
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>QUESTION PAPER CONTENT</label>
              <textarea
                value={extractedQuestion || ''}
                onChange={(e) => setExtractedQuestion(e.target.value)}
                placeholder="Question text will appear here..."
                style={{ width: '100%', height: '300px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', resize: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>YOUR ANSWER CONTENT</label>
              <textarea
                value={extractedAnswer || ''}
                onChange={(e) => setExtractedAnswer(e.target.value)}
                placeholder="Answer text will appear here..."
                style={{ width: '100%', height: '300px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" style={{ padding: '14px 32px' }} onClick={handleEvaluate} disabled={isEvaluating}>
              {isEvaluating ? (
                <>
                  <Loader size={18} className="animate-spin" style={{ marginRight: '8px' }} />
                  Gemini is grading your paper...
                </>
              ) : (
                <>
                  Start AI Evaluation
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

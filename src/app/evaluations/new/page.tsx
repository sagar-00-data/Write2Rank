'use client';
import { useState } from 'react';
import { Upload, File as FileIcon, X, ArrowRight, Loader, Edit3, HelpCircle, Sparkles, Wand2, Info, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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

  // 1. Extract metrics block
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
    const totMatch = metricsContent.match(/Total[^:]*:\s*(\d+)/i);

    if (provMatch) provisions = provMatch[1];
    if (analMatch) analysis = analMatch[1];
    if (concMatch) conclusion = concMatch[1];
    if (formMatch) formatting = formMatch[1];
    if (totMatch) total = totMatch[1];
  }

  generalMarkdown = generalMarkdown.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, '').trim();

  // Segment remaining text into bento boxes
  const auditHeaderIdx = generalMarkdown.search(/1\.\s*CITATIONS\s*AUDIT/i);
  const strengthsHeaderIdx = generalMarkdown.search(/2\.\s*STRENGTHS\s*&/i);
  const modelHeaderIdx = generalMarkdown.search(/3\.\s*COMPRESSED|###\s*PERFECT\s*MODEL\s*ANSWER/i);

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

  return {
    provisions,
    analysis,
    conclusion,
    formatting,
    total,
    citationsAudit,
    strengthsDeficiencies,
    modelAnswer,
    generalMarkdown
  };
}

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
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [answerImageBase64, setAnswerImageBase64] = useState<string>('');
  const [answerImageMime, setAnswerImageMime] = useState<string>('image/jpeg');

  const router = useRouter();
  const { user } = useAuth();

  const processImageFile = async (file: File): Promise<File> => {
    const isImage = /\.(png|jpe?g)$/i.test(file.name) || file.type.startsWith('image/');
    if (!isImage) return file;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > 1200) {
              const aspectRatio = height / width;
              width = 1200;
              height = Math.round(1200 * aspectRatio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG at 70% quality (better size-to-quality ratio for fast OCR)
            const base64DataUrl = canvas.toDataURL('image/jpeg', 0.7);

            const arr = base64DataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)![1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const processedFile = new (File as any)([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }) as File;
            resolve(processedFile);
          } catch (e) {
            console.error("Canvas image preprocessing failed:", e);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const callOcrApi = async (file: File): Promise<{ text: string, notice?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

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
    } else {
      throw new Error("OCR API returned invalid non-JSON response.");
    }
  };

  const handleExtractOCR = async () => {
    if (!answerFile) return;
    setIsExtracting(true);
    setExtractionStatus('📄 Initializing forensic script scan...');

    try {
      // Preprocess files client-side if they are images
      const processedAnswerFile = await processImageFile(answerFile);
      const processedQuestionFile = questionFile ? await processImageFile(questionFile) : null;

      // Extract base64 and mime type
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      try {
        const base64DataUrl = await getBase64(processedAnswerFile);
        setAnswerImageBase64(base64DataUrl);
        setAnswerImageMime(processedAnswerFile.type || 'image/jpeg');
      } catch (base64Err) {
        console.error('Failed to convert processed answer file to base64:', base64Err);
      }

      setExtractionStatus('⚡ Transmitting optimized packet to examiner...');

      // Extract Answer Sheet & Question Paper in Parallel
      const answerPromise = callOcrApi(processedAnswerFile);
      const questionPromise = processedQuestionFile 
        ? callOcrApi(processedQuestionFile) 
        : Promise.resolve({ text: '', notice: undefined });

      const [answer, question] = await Promise.all([answerPromise, questionPromise]);

      setExtractedAnswer(answer.text);
      if (answer.notice) alert(answer.notice);
      setExtractedQuestion(question.text);

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

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (response.ok && isJson) {
        const data = await response.json();
        setExtractedAnswer(data.improvedText);
      } else {
        let errorMsg = "Failed to improve text.";
        if (isJson) {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        } else {
          const text = await response.text();
          errorMsg = text.substring(0, 150) || `Server error (${response.status})`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during text improvement.");
    } finally {
      setIsImproving(false);
    }
  };

  const [streamingResult, setStreamingResult] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [finalEvalId, setFinalEvalId] = useState<string>('');

  const handleEvaluate = async () => {
    if (!extractedAnswer) return;

    if (examType !== 'CS Executive - Company Law') {
      setIsEvaluating(true);
      try {
        const userId = user?.id || '00000000-0000-0000-0000-000000000000';
        const response = await fetch('/api/evaluate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answerText: extractedAnswer,
            questionText: extractedQuestion,
            examType,
            userId
          }),
        });

        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (!response.ok) {
          let errorMsg = 'Failed to evaluate the text.';
          if (isJson) {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } else {
            const text = await response.text();
            errorMsg = text.substring(0, 150) || `Server error (${response.status})`;
          }
          alert(errorMsg);
          return;
        }

        if (isJson) {
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
          alert("Server returned invalid non-JSON evaluation response.");
        }
      } catch (error) {
        console.error(error);
        alert("An error occurred during evaluation.");
      } finally {
        setIsEvaluating(false);
      }
      return;
    }

    // CS Executive - Company Law Streaming Evaluation
    setIsEvaluating(true);
    setIsStreaming(true);
    setStreamingResult('');
    setFinalEvalId('');
    setLoadingStatus('⚖️ Initializing ICSI Council Examiner Engine...');

    const loadingTimer1 = setTimeout(() => {
      setLoadingStatus('🔍 Fetching Companies Act references (RAG Database)...');
    }, 1500);

    const loadingTimer2 = setTimeout(() => {
      setLoadingStatus('🔑 Balancing API load & preparing AI generation...');
    }, 3500);

    try {
      const response = await fetch('/api/evaluate-icsi-law', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerText: extractedAnswer,
          questionText: extractedQuestion,
          base64Image: answerImageBase64,
          mimeType: answerImageMime,
          userId: user?.id || '00000000-0000-0000-0000-000000000000'
        }),
      });

      clearTimeout(loadingTimer1);
      clearTimeout(loadingTimer2);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server-side evaluation error:', errorText);
        throw new Error(`Failed to start evaluation stream: ${errorText || response.statusText}`);
      }

      setLoadingStatus('📝 Decoding examiner critique stream...');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

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
            if (match) {
              detectedEvalId = match[1];
              setFinalEvalId(detectedEvalId);
            }
          }

          const displayMarkdown = accumulatedText.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, '');
          setStreamingResult(displayMarkdown);
        }
      }

      // Save dummy fallback evaluation record to local storage
      if (detectedEvalId && typeof window !== 'undefined') {
        const existingEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        
        const provisionsMatch = accumulatedText.match(/Legal Provisions & Citations:\s*(\d+)/i);
        const analysisMatch = accumulatedText.match(/Analysis & Application:\s*(\d+)/i);
        const conclusionMatch = accumulatedText.match(/Conclusion:\s*(\d+)/i);
        const formattingMatch = accumulatedText.match(/Secretarial Formatting:\s*(\d+)/i);
        const totalScoreMatch = accumulatedText.match(/Total Score:\s*(\d+)/i);

        const scoreProvisions = provisionsMatch ? parseInt(provisionsMatch[1], 10) : 0;
        const scoreAnalysis = analysisMatch ? parseInt(analysisMatch[1], 10) : 0;
        const scoreConclusion = conclusionMatch ? parseInt(conclusionMatch[1], 10) : 0;
        const scoreFormatting = formattingMatch ? parseInt(formattingMatch[1], 10) : 0;
        const totalScore = totalScoreMatch ? parseInt(totalScoreMatch[1], 10) : (scoreProvisions + scoreAnalysis + scoreConclusion + scoreFormatting);

        const cleanMarkdown = accumulatedText.replace(/---EVAL_ID:eval_[a-z0-9_]+---\n?/, '');

        const newEval = {
          id: detectedEvalId,
          score: totalScore,
          maxScore: 100,
          confidence: 95,
          status: 'completed',
          exam: examType,
          date: new Date().toISOString(),
          extractedText: extractedAnswer,
          feedback: {
            overall: cleanMarkdown,
            strengths: ["Citations and legal provisions included"],
            weaknesses: ["Structure formatting check complete"]
          },
          breakdown: [
            { q: "Legal Provisions", topic: "Companies Act & Case Laws", awarded: scoreProvisions, max: 35, comments: "Verification of cited sections" },
            { q: "Analysis & Application", topic: "Facts Parsing", awarded: scoreAnalysis, max: 35, comments: "Application of law to facts" },
            { q: "Conclusion", topic: "Legal Stance", awarded: scoreConclusion, max: 15, comments: "Definitive conclusion review" },
            { q: "Secretarial Formatting", topic: "Professional Structure", awarded: scoreFormatting, max: 15, comments: "Provisions -> Analysis -> Conclusion formatting" }
          ]
        };
        existingEvals.unshift(newEval);
        localStorage.setItem('write2rank_evals', JSON.stringify(existingEvals));
      }

    } catch (error) {
      clearTimeout(loadingTimer1);
      clearTimeout(loadingTimer2);
      console.error(error);
      alert("An error occurred during evaluation streaming.");
    } finally {
      setIsEvaluating(false);
      setIsStreaming(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="responsive-wrapper animate-fade-in">
      <div className="flex-stack-mobile" style={{ marginBottom: '40px' }}>
        <div>
          <h1 className="page-title responsive-title" style={{ marginBottom: '8px' }}>New Evaluation</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Powered by Gemini Vision for High-Accuracy Handwriting Recognition.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step === 1 ? '#2563eb' : '#f1f5f9', color: step === 1 ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, border: '1px solid #e2e8f0' }}>1. UPLOAD</div>
          <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: step === 2 ? '#2563eb' : '#f1f5f9', color: step === 2 ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, border: '1px solid #e2e8f0' }}>2. REVIEW & EDIT</div>
        </div>
      </div>

      {step === 1 ? (
        <div className="card" style={{ 
          padding: '40px 32px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.08)'
        }}>
          <div className="flex-stack-mobile" style={{ marginBottom: '36px' }}>
            <h2 className="card-title" style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Step 1: Upload Documents</h2>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ 
                padding: '12px 18px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                backgroundColor: '#ffffff', 
                color: '#0f172a', 
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '100%'
              }}
            >
              <optgroup label="Chartered Accountant (CA)" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
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
              <optgroup label="Company Secretary (CS)" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                <option>CS Executive - Company Law</option>
                <option>CS Executive - JIGL</option>
                <option>CS Executive - Tax Laws</option>
                <option>CS Professional - Governance & Sustainability</option>
                <option>CS Professional - Drafting & Appearances</option>
              </optgroup>
              <optgroup label="Cost & Management Accountant (CMA)" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                <option>CMA Final - Strategic Financial Management</option>
                <option>CMA Final - Strategic Cost Management</option>
                <option>CMA Inter - Financial Accounting</option>
                <option>CMA Inter - Laws & Ethics</option>
              </optgroup>
              <optgroup label="Other Professional Exams" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                <option>ICSI - Professional Programme</option>
                <option>ICAI - CPT</option>
                <option>MBA - Finance</option>
                <option>LLB - Corporate Law</option>
              </optgroup>
            </select>
          </div>

          <div className="grid-2-cols" style={{ marginBottom: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
            {/* Question Paper (Optional) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <HelpCircle size={18} color="#64748b" />
                <span style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>Question Paper (Optional)</span>
              </div>
              {!questionFile ? (
                <label
                  className="upload-area"
                  style={{ 
                    height: '240px', 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '16px',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setQuestionFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="#64748b" style={{ marginBottom: '16px' }} />
                  <span className="text-sm" style={{ color: '#64748b', fontWeight: 600 }}>
                    Click or drag to upload questions
                  </span>
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setQuestionFile(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div style={{ height: '240px', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon size={40} color="#06b6d4" />
                  <div className="text-sm font-medium" style={{ marginTop: '16px', textAlign: 'center', color: '#0f172a' }}>{questionFile.name}</div>
                  <button onClick={() => setQuestionFile(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="#64748b" />
                  </button>
                </div>
              )}
            </div>

            {/* Answer Sheet (Required) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Edit3 size={18} color="#64748b" />
                <span style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>Answer Sheet (Required)</span>
              </div>
              {!answerFile ? (
                <label
                  className="upload-area"
                  style={{ 
                    height: '240px', 
                    border: '2px dashed #2563eb', 
                    borderRadius: '16px',
                    backgroundColor: 'rgba(37, 99, 235, 0.02)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setAnswerFile(e.dataTransfer.files[0]); }}
                >
                  <Upload size={32} color="#2563eb" style={{ marginBottom: '16px' }} />
                  <span className="text-sm" style={{ color: '#2563eb', fontWeight: 600 }}>
                    Click or drag to upload answers
                  </span>
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} />
                </label>
              ) : (
                <div style={{ height: '240px', padding: '24px', border: '2px solid #2563eb', borderRadius: '16px', backgroundColor: '#f8fafc', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon size={40} color="#2563eb" />
                  <div className="text-sm font-medium" style={{ marginTop: '16px', textAlign: 'center', color: '#0f172a' }}>{answerFile.name}</div>
                  <button onClick={() => setAnswerFile(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="#64748b" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
            {isExtracting && (
              <div className="animate-fade-in" style={{ marginBottom: '32px', padding: '24px', borderRadius: '16px', backgroundColor: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  <Sparkles size={24} color="#2563eb" className="animate-pulse" />
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{extractionStatus || 'Gemini Vision is reading your handwriting...'}</span>
                </div>
                <div className="progress-container" style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div className="progress-fill" style={{ width: '100%', height: '100%', backgroundColor: '#2563eb' }}></div>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>This may take 10-15 seconds depending on file size.</p>
              </div>
            )}

            <button className="btn" style={{ width: '100%', padding: '18px', borderRadius: '12px', fontSize: '17px', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.15)' }} onClick={handleExtractOCR} disabled={!answerFile || isExtracting}>
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
        <div className="card animate-fade-in" style={{ 
          padding: '40px 32px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.08)'
        }}>
          <div className="flex-stack-mobile" style={{ marginBottom: '32px' }}>
            <h2 className="card-title" style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Step 2: Review Extraction</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#e2e8f0', color: '#2563eb', backgroundColor: '#ffffff' }}
                onClick={handleImproveText}
                disabled={isImproving || isEvaluating}
              >
                {isImproving ? <Loader size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Improve Text
              </button>
              <button className="btn btn-outline" style={{ padding: '10px 20px', borderRadius: '8px', color: '#334155', borderColor: '#e2e8f0', backgroundColor: '#ffffff' }} onClick={() => setStep(1)}>Back</button>
            </div>
          </div>

          <div className="grid-2-cols" style={{ marginBottom: '36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Question Text</label>
              <textarea
                value={extractedQuestion}
                onChange={(e) => setExtractedQuestion(e.target.value)}
                placeholder="Question text (optional)..."
                style={{ width: '100%', height: '380px', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answer Text</label>
              <textarea
                value={extractedAnswer}
                onChange={(e) => setExtractedAnswer(e.target.value)}
                placeholder="Extracting answer text..."
                style={{ width: '100%', height: '380px', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '14px', lineHeight: '1.6', resize: 'none', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>

          <button className="btn" style={{ width: '100%', padding: '18px', borderRadius: '12px', fontSize: '17px', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.15)' }} onClick={handleEvaluate} disabled={isEvaluating || isImproving}>
            {isEvaluating ? (
              <>
                <Loader size={20} className="animate-spin" style={{ marginRight: '10px' }} />
                {isStreaming ? "Streaming AI Critique..." : "Running AI Evaluation..."}
              </>
            ) : (
              <>
                Evaluate Answer
                <ArrowRight size={20} style={{ marginLeft: '10px' }} />
              </>
            )}
          </button>

          {isEvaluating && loadingStatus && (
            <div className="animate-pulse" style={{ marginTop: '16px', textAlign: 'center', fontSize: '14.5px', color: '#2563eb', fontWeight: 600 }}>
              {loadingStatus}
            </div>
          )}

          {(() => {
            if (!streamingResult) return null;
            const parsed = parseStreamText(streamingResult);
            const showBento = !!(parsed.total || parsed.provisions || parsed.citationsAudit || parsed.strengthsDeficiencies || parsed.modelAnswer);

            return (
              <div className="animate-fade-in" style={{ marginTop: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="#2563eb" className={isStreaming ? "animate-pulse" : ""} />
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '16px' }}>
                      {isStreaming ? "AI Examiner is grading (Streaming)..." : "ICSI Council Examiner Grading Complete"}
                    </span>
                  </div>
                  {!isStreaming && finalEvalId && (
                    <button 
                      className="btn" 
                      style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)' }}
                      onClick={() => router.push(`/evaluations/${finalEvalId}`)}
                    >
                      View Detailed Report & Analytics
                    </button>
                  )}
                </div>

                {showBento ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* Score & Parameters Row (Bento Grid) */}
                    <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                      {/* Tile A: Marks Gauge */}
                      <div style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '20px', 
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.04)',
                        minHeight: '200px'
                      }}>
                        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '16px', marginTop: 0 }}>Marks Gauge</h4>
                        {parsed.total ? (
                          <>
                            <div style={{ 
                              position: 'relative', 
                              width: '90px', 
                              height: '90px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.08), inset 0 2px 4px rgba(0,0,0,0.01)'
                            }}>
                              <svg style={{ transform: 'rotate(-90deg)', width: '90px', height: '90px' }}>
                                <circle cx="45" cy="45" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                                <circle cx="45" cy="45" r="38" fill="transparent" stroke={parseInt(parsed.total) >= 40 ? "#10b981" : "#ef4444"} strokeWidth="6" 
                                  strokeDasharray={`${2 * Math.PI * 38}`}
                                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - parseInt(parsed.total) / 100)}`}
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 0.5s' }}
                                />
                              </svg>
                              <div style={{ position: 'absolute', textAlign: 'center' }}>
                                <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{parsed.total}</span>
                                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '-4px' }}>/100</span>
                              </div>
                            </div>
                            <div style={{ 
                              marginTop: '12px',
                              padding: '3px 10px', 
                              borderRadius: '9999px', 
                              backgroundColor: parseInt(parsed.total) >= 40 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                              color: parseInt(parsed.total) >= 40 ? '#10b981' : '#ef4444',
                              fontSize: '10px',
                              fontWeight: 700
                            }}>
                              {parseInt(parsed.total) >= 40 ? 'PASSED' : 'FAILED'}
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b' }}>
                            <Loader className="animate-spin" size={20} style={{ margin: '0 auto 12px' }} />
                            <span style={{ fontSize: '12px' }}>Calculating total...</span>
                          </div>
                        )}
                      </div>

                      {/* Tile B: Parameters */}
                      <div style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '20px', 
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.04)',
                        minHeight: '200px'
                      }}>
                        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '12px', marginTop: 0 }}>Parameters</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Status</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isStreaming ? '#2563eb' : '#10b981' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isStreaming ? '#2563eb' : '#10b981' }} className={isStreaming ? "animate-pulse" : ""}></span>
                              {isStreaming ? 'Streaming' : 'Completed'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Verify Level</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>95% Match</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Exam</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '110px' }} title={examType}>
                              {examType}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tile C: Pillars */}
                      <div style={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '20px', 
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.04)',
                        minHeight: '200px'
                      }}>
                        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '12px', marginTop: 0 }}>Pillars</h4>
                        {parsed.provisions || parsed.analysis || parsed.conclusion || parsed.formatting ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                              { name: 'Provisions', val: parsed.provisions, max: 35, color: '#2563eb' },
                              { name: 'Analysis', val: parsed.analysis, max: 35, color: '#8b5cf6' },
                              { name: 'Conclusion', val: parsed.conclusion, max: 15, color: '#10b981' },
                              { name: 'Formatting', val: parsed.formatting, max: 15, color: '#f59e0b' }
                            ].map((pillar, idx) => {
                              const score = parseInt(pillar.val) || 0;
                              const percentage = Math.round((score / pillar.max) * 100);
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', fontSize: '10.5px' }}>
                                    <span style={{ fontWeight: 600, color: '#475569' }}>{pillar.name}</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{pillar.val || 0}<span style={{ color: '#94a3b8', fontWeight: 500 }}>/{pillar.max}</span></span>
                                  </div>
                                  <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: pillar.color, borderRadius: '2px' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b', padding: '10px 0' }}>
                            <Loader className="animate-spin" size={18} style={{ margin: '0 auto 8px' }} />
                            <span style={{ fontSize: '11px' }}>Waiting for scores...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section Content Bento Containers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Citations Audit Card */}
                      {parsed.citationsAudit && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                            <Info size={16} color="#2563eb" />
                            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>Citations Audit</h4>
                          </div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13.5px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                            {parsed.citationsAudit}
                          </pre>
                        </div>
                      )}

                      {/* Strengths & Deficiencies Card */}
                      {parsed.strengthsDeficiencies && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                            <Sparkles size={16} color="#8b5cf6" />
                            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>Strengths & Deficiencies</h4>
                          </div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13.5px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                            {parsed.strengthsDeficiencies}
                          </pre>
                        </div>
                      )}

                      {/* Model Answer Outline Card */}
                      {parsed.modelAnswer && (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                            <BookOpen size={16} color="#10b981" />
                            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>Perfect Model Answer Outline</h4>
                          </div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13.5px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                            {parsed.modelAnswer}
                          </pre>
                        </div>
                      )}

                      {/* Full Raw Output Collapsible for safe fallbacks */}
                      <details style={{ marginTop: '10px', cursor: 'pointer' }}>
                        <summary style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Show Raw Markdown Output</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.6', overflowY: 'auto', maxHeight: '300px', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', marginTop: '10px', cursor: 'auto' }}>
                          {streamingResult}
                        </pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  /* Fallback to simple styled container while metrics block is being typed/assembled */
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.7', overflowY: 'auto', maxHeight: '420px', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#334155' }}>
                    {streamingResult}
                  </pre>
                )}
              </div>
            );
          })()}

          <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <Info size={20} color="#64748b" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>Having trouble with OCR accuracy?</p>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
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

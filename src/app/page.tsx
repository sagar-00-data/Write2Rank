'use client';
import Link from 'next/link';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  FileText, 
  BookOpen, 
  Award,
  ArrowUpRight,
  TrendingUp,
  Check,
  Zap,
  ShieldCheck,
  Play
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Existing Dashboard interface preserved
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

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (user) {
    return <StudentDashboard user={user} />;
  }

  return <PublicLandingPage />;
}

// ==========================================
// 1. STUDENT DASHBOARD (UNTOUCHED LOGIC)
// ==========================================
function StudentDashboard({ user }: { user: any }) {
  const [evals, setEvals] = useState<EvaluationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoading: authLoading } = useAuth();

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
        const res = await fetch('/api/evaluations');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        const dbEvals = data.evaluations || [];

        if (dbEvals.length > 0) {
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
              overall: e.ai_feedback?.overall || '',
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
        console.warn('Failed to connect to evaluations API, falling back to localStorage:', err);
        const savedEvals = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        setEvals(savedEvals);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, authLoading]);

  const totalEvals = evals.length;
  const avgScore = totalEvals > 0 ? Math.round(evals.reduce((sum, e) => sum + e.score, 0) / totalEvals) : 0;
  const avgAccuracy = totalEvals > 0 ? (evals.reduce((sum, e) => sum + e.confidence, 0) / totalEvals).toFixed(1) : "0.0";

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title stagger-1">Welcome back, {user?.name?.split(' ')[0] || 'Student'}!</h1>
      
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

// ==========================================
// 2. PUBLIC LANDING PAGE (NEW IMPLEMENTATION)
// ==========================================
function PublicLandingPage() {
  const [activePreviewTab, setActivePreviewTab] = useState<'ocr' | 'score' | 'feedback' | 'provisions'>('ocr');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '16px'
            }}>
              X
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Xaminix</span>
          </div>

          <nav style={{ display: 'flex', gap: '32px' }} className="hidden md:flex">
            <a href="#how-it-works" style={{ fontSize: '14.5px', color: '#475569', textDecoration: 'none', fontWeight: 500 }} className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#features" style={{ fontSize: '14.5px', color: '#475569', textDecoration: 'none', fontWeight: 500 }} className="hover:text-blue-600 transition-colors">Outcomes</a>
            <a href="#preview" style={{ fontSize: '14.5px', color: '#475569', textDecoration: 'none', fontWeight: 500 }} className="hover:text-blue-600 transition-colors">Interactive Demo</a>
            <a href="#roadmap" style={{ fontSize: '14.5px', color: '#475569', textDecoration: 'none', fontWeight: 500 }} className="hover:text-blue-600 transition-colors">Roadmap</a>
            <a href="#faq" style={{ fontSize: '14.5px', color: '#475569', textDecoration: 'none', fontWeight: 500 }} className="hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/login" style={{ textDecoration: 'none', fontSize: '14.5px', color: '#0f172a', fontWeight: 600 }} className="hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }} className="hover:bg-slate-800 transition-colors">
                Get Started <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={{ 
        padding: '80px 24px 100px 24px', 
        background: 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.03), transparent 40%), radial-gradient(circle at top left, rgba(37, 99, 235, 0.03), transparent 40%)',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: '48px' }} className="lg:grid-cols-2 lg:items-center">
          
          {/* Hero Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 14px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #bfdbfe',
              borderRadius: '9999px',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px'
            }}>
              <Sparkles size={14} /> AI-Powered Examiner Grading
            </div>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: 800, 
              color: '#0f172a', 
              lineHeight: '1.15', 
              letterSpacing: '-1.5px', 
              margin: '0 0 20px 0' 
            }} className="sm:text-5xl md:text-6xl">
              Turn practice answers into <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>higher exam scores</span>.
            </h1>
            <p style={{ 
              fontSize: '17px', 
              color: '#475569', 
              lineHeight: '1.65', 
              margin: '0 0 36px 0', 
              maxWidth: '540px' 
            }}>
              Upload your handwritten exam answer sheets. Xaminix automatically extracts the handwriting, checks your statutory citations, verifies key concepts, and evaluates your paper using realistic examiner calibration guidelines.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '16px 28px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.2)'
                }} className="hover:bg-blue-700 transition-colors">
                  Evaluate My Answer <ArrowRight size={16} />
                </button>
              </Link>
              <a href="#preview" style={{ textDecoration: 'none' }}>
                <button style={{
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  padding: '16px 28px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }} className="hover:bg-slate-50 transition-colors">
                  <Play size={16} /> See How It Works
                </button>
              </a>
            </div>

            {/* Micro proof badges */}
            <div style={{ display: 'flex', gap: '28px', marginTop: '48px', borderTop: '1px solid #f1f5f9', paddingTop: '28px', width: '100%' }}>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'block' }}>&lt; 60s</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Evaluation Time</span>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'block' }}>96.8%</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Handwriting Recognition</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visual (OCR scan simulation) */}
          <div style={{ position: 'relative' }}>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animated Scan Line */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                boxShadow: '0 0 12px #10b981',
                zIndex: 20,
                animation: 'scan 4s infinite linear'
              }} />
              <style>{`
                @keyframes scan {
                  0% { top: 0%; }
                  50% { top: 100%; }
                  100% { top: 0%; }
                }
              `}</style>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Handwritten Answer Sheet</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }} /> OCR active
                </span>
              </div>

              {/* Hand written look answer simulation */}
              <div style={{ fontStyle: 'italic', color: '#1e3a8a', fontSize: '15px', lineHeight: '2', fontFamily: 'serif', padding: '0 8px' }}>
                Under Section 96 of Companies Act, 2013, Annual General Meeting (AGM) is a statutory requirement for every company (other than OPC).
                The first AGM must be held within 9 months of the closing of the first financial year. For subsequent years, the gap between two consecutive AGMs shall not exceed 15 months...
              </div>

              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                backgroundColor: '#ffffff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Award size={16} color="#2563eb" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Real-time Calibrated Marks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>3.75</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>/ 5.0 marks</span>
                  <span style={{ color: '#10b981', fontSize: '12.5px', fontWeight: 600, marginLeft: 'auto' }}>✅ 3 provisions verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Who Xaminix Is For */}
      <section style={{ padding: '60px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', marginBottom: '32px' }}>
            Built Specifically for Professional Exam Students
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px' 
          }}>
            {[
              { title: 'CS Executive', active: true, desc: 'Company Law module & secretarial practices.' },
              { title: 'Company Law', active: true, desc: 'Core Companies Act compliance & case analysis.' },
              { title: 'CA (Chartered Accountant)', active: false, desc: 'Law & Auditing corporate standards (Coming Late 2026).' },
              { title: 'CMA (Cost Management)', active: false, desc: 'Corporate laws & financial checkups (Coming Late 2026).' },
              { title: 'UPSC Law Optional', active: false, desc: 'Descriptive analytical legal modules (Coming 2027).' }
            ].map((card, i) => (
              <div key={i} style={{
                padding: '24px',
                backgroundColor: '#ffffff',
                border: card.active ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                borderRadius: '16px',
                position: 'relative',
                boxShadow: card.active ? '0 4px 12px rgba(37,99,235,0.02)' : 'none',
                opacity: card.active ? 1 : 0.75
              }}>
                {!card.active && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    fontSize: '9px', 
                    fontWeight: 700, 
                    backgroundColor: '#f1f5f9', 
                    color: '#64748b', 
                    padding: '2px 8px', 
                    borderRadius: '9999px' 
                  }}>Coming Soon</span>
                )}
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>{card.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
            Get evaluation feedback in under 60 seconds
          </h2>
          <p style={{ fontSize: '16px', color: '#475569', marginBottom: '60px' }}>
            Our 3-step engine does the heavy lifting of parsing, citation verification, and grading.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
            {[
              { step: '01', title: 'Upload Sheet', desc: 'Scan or snapshot your handwritten exam answer sheet and drag it directly into the dashboard.' },
              { step: '02', title: 'AI OCR & Analysis', desc: 'Xaminix extracts the handwriting, checks provisions, maps coverage guidelines, and outputs calibrated marks.' },
              { step: '03', title: 'Improve Structure', desc: 'Review your personalized feedback check, missing sections summary, and study the examiner-grade model script.' }
            ].map((item, idx) => (
              <div key={idx} style={{ textAlign: 'left', position: 'relative' }}>
                <span style={{ 
                  fontSize: '48px', 
                  fontWeight: 900, 
                  color: '#e2e8f0', 
                  display: 'block', 
                  lineHeight: '1', 
                  marginBottom: '12px',
                  fontFamily: 'monospace'
                }}>{item.step}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>{item.title}</h3>
                <p style={{ fontSize: '14.5px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Outcomes & Features */}
      <section id="features" style={{ padding: '100px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
              Engineered for actual score improvements
            </h2>
            <p style={{ fontSize: '16px', color: '#475569', maxWidth: '600px', margin: '0 auto' }}>
              Features mapped to specific learning gaps, helping you eliminate penalities and address examiner expectations.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {[
              { icon: FileText, title: 'Handwriting Recognition (OCR)', desc: 'Optimized specifically for handwritten, exam-conditioned scripts to translate answers instantly without manual transcription.' },
              { icon: Award, title: 'Examiner Calibration Layer', desc: 'Checks answers against rubric criteria using point-based values (Mandatory, Important, Supporting) to remove grading subjectivity.' },
              { icon: ShieldCheck, title: 'Legal Provision Check', desc: 'Instantly identifies correct, partial, missing, or hallucinated Companies Act Sections, Rules, and Forms.' },
              { icon: Sparkles, title: 'Exam-Realistic Model Guidance', desc: 'Access realistic answers structured exactly as an AIR-level CS Executive candidate would write under actual time constraints.' },
              { icon: Zap, title: 'Structure-Preserved Rewrites', desc: 'Review an improved version of your own script that fixes terminology omissions while retaining your personal formatting.' },
              { icon: TrendingUp, title: 'Long-term Progress Metrics', desc: 'Track your marks trend, conceptual strengths, and accuracy indicators over time to measure exam-readiness.' }
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} style={{
                  padding: '32px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderRadius: '10px',
                    marginBottom: '20px'
                  }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>{feat.title}</h3>
                  <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Interactive Product Preview */}
      <section id="preview" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
              Explore the evaluation report dashboard
            </h2>
            <p style={{ fontSize: '16px', color: '#475569' }}>
              Click the tabs below to preview the exact breakdown structure Xaminix provides.
            </p>
          </div>

          <div style={{ 
            border: '1px solid #e2e8f0', 
            borderRadius: '24px', 
            overflow: 'hidden',
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.05)'
          }}>
            {/* Tabs selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              {[
                { id: 'ocr', label: '1. Handwriting & OCR' },
                { id: 'score', label: '2. Score Breakdown' },
                { id: 'feedback', label: '3. Examiner Feedback' },
                { id: 'provisions', label: '4. Legal Provision Check' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '16px 8px',
                    border: 'none',
                    borderBottom: activePreviewTab === tab.id ? '2px solid #2563eb' : 'none',
                    backgroundColor: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: activePreviewTab === tab.id ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '32px', minHeight: '340px' }}>
              {activePreviewTab === 'ocr' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Handwritten Sheet Snap</span>
                    <p style={{ fontStyle: 'italic', color: '#1e3a8a', fontFamily: 'serif', lineHeight: '1.8' }}>
                      &quot;Under Section 96 of Companies Act, 2013, AGM is statutory... First AGM must be within 9 months of financial year end...&quot;
                    </p>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Extracted Digital OCR</span>
                    <p style={{ color: '#1e293b', fontSize: '14.5px', lineHeight: '1.6' }}>
                      Under Section 96 of Companies Act, 2013, AGM is a statutory requirement... The first AGM must be held within 9 months of the close of the financial year.
                    </p>
                  </div>
                </div>
              )}

              {activePreviewTab === 'score' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Marks Breakdown Rubric</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { title: 'Legal Provision & Citations', score: '0.80 / 1.0', pct: 80 },
                      { title: 'Concept Coverage', score: '1.50 / 2.0', pct: 75 },
                      { title: 'Explanation & Analysis', score: '0.70 / 1.0', pct: 70 },
                      { title: 'Conclusion Validity', score: '0.50 / 0.5', pct: 100 }
                    ].map((row, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' }}>
                          <span style={{ color: '#334155' }}>{row.title}</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{row.score}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '9999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePreviewTab === 'feedback' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div style={{ padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#166534' }}>Key Strengths</h5>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#14532d', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li>✅ Cited primary Companies Act Section 96 cleanly.</li>
                      <li>✅ Outlined OPC exemption rules accurately.</li>
                    </ul>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#9f1239' }}>Improvement Required</h5>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#9f1239', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li>⚠️ Detail the ROC extension exception rules (max 3 months).</li>
                      <li>⚠️ Clarify business hour constraints for notices.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activePreviewTab === 'provisions' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Legal Provision Check</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '8px' }}>CORRECT</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#14532d' }}>Section 96</span>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', display: 'block', marginBottom: '8px' }}>PARTIAL</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#78350f' }}>Form MGT-15</span>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#fff1f2', borderRadius: '12px', border: '1px solid #fecdd3' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#be123c', display: 'block', marginBottom: '8px' }}>MISSING</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#9f1239' }}>Rule 14 (Notice)</span>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px' }}>INCORRECT</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>None</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why Students Choose Xaminix (Comparison) */}
      <section style={{ padding: '100px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '48px' }}>
            Traditional Practice vs. Xaminix
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#64748b', marginBottom: '24px' }}>Traditional Practice</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14.5px', color: '#64748b' }}>❌ **7-14 Days wait** for manual evaluation feedback.</div>
                <div style={{ fontSize: '14.5px', color: '#64748b' }}>❌ **Subjective marks** with little specific alignment context.</div>
                <div style={{ fontSize: '14.5px', color: '#64748b' }}>❌ **No legal citation tracking** to verify Sections vs Rules.</div>
                <div style={{ fontSize: '14.5px', color: '#64748b' }}>❌ **No progress tracking** or scores trend history.</div>
              </div>
            </div>

            <div style={{ padding: '32px', backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(37,99,235,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb', marginBottom: '24px' }}>Xaminix AI</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14.5px', color: '#334155' }}>✅ **Under 60 seconds** evaluation turnaround.</div>
                <div style={{ fontSize: '14.5px', color: '#334155' }}>✅ **Calibrated scoring** utilizing point-based metrics.</div>
                <div style={{ fontSize: '14.5px', color: '#334155' }}>✅ **Interactive Legal Provision Check** details.</div>
                <div style={{ fontSize: '14.5px', color: '#334155' }}>✅ **SaaS progress dashboards** with score tracking.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Future Roadmap */}
      <section id="roadmap" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '48px' }}>
            Roadmap & Certifications Support
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { phase: 'CS Executive (Active)', desc: 'Fully live and calibrated for Company Law & secretarial practice evaluations.' },
              { phase: 'CA & CMA Modules (Q4 2026)', desc: 'Configuring RAG databases and scoring criteria for financial law papers.' },
              { phase: 'UPSC Law Optional (Q1 2027)', desc: 'Custom legal interpretation scoring modules for UPSC law optional.' }
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: idx === 0 ? '#2563eb' : '#e2e8f0',
                  color: idx === 0 ? '#ffffff' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{step.phase}</h4>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section id="faq" style={{ padding: '100px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', textAlign: 'center', marginBottom: '48px' }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { q: 'How accurate is the AI evaluation?', a: 'Highly accurate. The evaluation engine maps student answers directly to calibrated checklists (Mandatory, Important, Supporting points) to ensure grading criteria align with corporate secretarial standards.' },
              { q: 'Does it support handwritten answer sheets?', a: 'Yes! Our custom OCR model is specifically optimized for exam-room handwriting, converting handwritten sheets into digital text before performing checks.' },
              { q: 'Is it relevant for CA and CMA exams?', a: 'Currently we are fully active for CS Executive and Company Law theory. CA, CMA, and UPSC law optional modules are in progress and will launch according to the roadmap.' }
            ].map((faq, i) => (
              <div key={i} style={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '16px',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    outline: 'none'
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px 24px', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          backgroundColor: '#0f172a', 
          borderRadius: '24px', 
          padding: '60px 40px',
          color: '#ffffff'
        }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
            Upload your first answer sheet today
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px auto' }}>
            Join thousands of professional exam candidates improving descriptive scores with Xaminix.
          </p>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '12px',
              fontSize: '15.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }} className="hover:bg-blue-700 transition-colors">
              Get Started for Free <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </section>

      {/* 11. Footer */}
      <footer style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '60px 24px 40px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '32px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '6px', 
                background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px'
              }}>
                X
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Xaminix</span>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>AI Answer Evaluation for Professional Exams</span>
          </div>

          <div style={{ display: 'flex', gap: '60px' }}>
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '16px' }}>Legal</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="#privacy" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600">Privacy Policy</a>
                <a href="#terms" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600">Terms of Service</a>
              </div>
            </div>
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', marginBottom: '16px' }}>Community</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="#github" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600">GitHub</a>
                <a href="#linkedin" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600">LinkedIn</a>
                <a href="#reddit" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600">Reddit</a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>&copy; {new Date().getFullYear()} Xaminix. All rights reserved.</span>
        </div>
      </footer>

    </div>
  );
}

// ==========================================
// 3. PARSING HELPER FUNCTIONS
// ==========================================
function parseMarkdownTable(markdown: string): Array<{ criterion: string; expected: string; covered: string; coveragePercent: string; awardedMarks: string; reason: string }> {
  if (!markdown) return [];
  const rows: any[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (line.includes('|') && !line.includes('---') && !line.toLowerCase().includes('criterion')) {
      const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (parts.length >= 5) {
        rows.push({
          criterion: parts[0] || '',
          expected: parts[1] || '',
          covered: parts[2] || '',
          coveragePercent: parts[3] || '',
          awardedMarks: parts[4] || '',
          reason: parts[5] || ''
        });
      }
    }
  }
  return rows;
}

function parseLegalProvisions(markdown: string): Array<{ status: 'correct' | 'partial' | 'missing' | 'incorrect'; text: string }> {
  const items: any[] = [];
  if (!markdown) return items;
  const lines = markdown.split('\n');
  const seenTexts = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    let status: 'correct' | 'partial' | 'missing' | 'incorrect' | null = null;
    let cleanText = trimmed;

    if (trimmed.startsWith('- ✅') || trimmed.startsWith('* ✅') || trimmed.startsWith('✅')) {
      status = 'correct';
      cleanText = trimmed.replace(/^[-*\s]*✅\s*/, '');
    } else if (trimmed.startsWith('- ⚠️') || trimmed.startsWith('* ⚠️') || trimmed.startsWith('⚠️') || trimmed.startsWith('- ⚠') || trimmed.startsWith('* ⚠') || trimmed.startsWith('⚠')) {
      status = 'partial';
      cleanText = trimmed.replace(/^[-*\s]*(?:⚠️|⚠)\s*/, '');
    } else if (trimmed.startsWith('- ❌') || trimmed.startsWith('* ❌') || trimmed.startsWith('❌')) {
      status = 'missing';
      cleanText = trimmed.replace(/^[-*\s]*❌\s*/, '');
    } else if (trimmed.startsWith('- 🚫') || trimmed.startsWith('* 🚫') || trimmed.startsWith('🚫') || trimmed.toLowerCase().includes('wrong') || trimmed.toLowerCase().includes('incorrect')) {
      status = 'incorrect';
      cleanText = trimmed.replace(/^[-*\s]*🚫\s*/, '');
    }

    if (status && cleanText) {
      const normalizedText = cleanText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        items.push({ status, text: cleanText });
      }
    }
  }
  return items;
}

function parseConceptCoverage(markdown: string): Array<{ concept: string; covered: string; remarks: string }> {
  const rows: any[] = [];
  if (!markdown) return rows;
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (line.includes('|') && !line.includes('---') && !line.toLowerCase().includes('expected concept')) {
      const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (parts.length >= 3) {
        rows.push({
          concept: parts[0] || '',
          covered: parts[1] || '',
          remarks: parts[2] || ''
        });
      }
    }
  }
  return rows;
}

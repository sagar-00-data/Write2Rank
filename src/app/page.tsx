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
// =========================================// ==========================================
// 2. PUBLIC LANDING PAGE (NEW IMPLEMENTATION)
// ==========================================
function PublicLandingPage() {
  const [activePreviewTab, setActivePreviewTab] = useState<'ocr' | 'score' | 'feedback' | 'provisions'>('ocr');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [activeProgressTab, setActiveProgressTab] = useState<'trends' | 'weakness' | 'topics'>('trends');

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScore((prev) => {
        if (prev >= 4.25) {
          return 4.25;
        }
        return Math.min(4.25, Number((prev + 0.15).toFixed(2)));
      });
    }, 45);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Global CSS Inject for animations and overrides */}
      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-faster {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-1.5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(99, 91, 255, 0.15); }
          50% { box-shadow: 0 0 30px rgba(99, 91, 255, 0.35); }
        }
        @keyframes scan-glow {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
        @keyframes beam-line {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        .float-card-1 {
          animation: float-slower 6s infinite ease-in-out;
        }
        .float-card-2 {
          animation: float-faster 5s infinite ease-in-out;
        }
        .btn-premium-primary {
          background: linear-gradient(135deg, #0f172a, #27272a);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-premium-primary:hover {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
        }
        .btn-premium-secondary {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-premium-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-2px);
        }
        .bento-card {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 24px;
          padding: 32px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .bento-card:hover {
          transform: translateY(-4px);
          border-color: #e2e8f0;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }
        .gradient-text {
          background: linear-gradient(135deg, #1e40af 10%, #7c3aed 70%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-link {
          position: relative;
          color: #475569;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #2563eb;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -4px;
          left: 0;
          background-color: #2563eb;
          transition: width 0.2s;
        }
        .nav-link:hover::after {
          width: 100%;
        }
        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .mobile-nav-hide {
            display: none !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* 1. Header Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo Brandmark */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img 
              src="/logo.png" 
              alt="Xaminix Logo" 
              style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
            />
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.7px', display: 'inline-flex', alignItems: 'center' }}>
              Xaminix
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '32px' }} className="mobile-nav-hide">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#preview" className="nav-link">Demo Report</a>
            <a href="#comparison" className="nav-link">Why Xaminix</a>
            <a href="#analytics" className="nav-link">Analytics</a>
            <a href="#roadmap" className="nav-link">Roadmap</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>

          {/* Right CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/login" style={{ textDecoration: 'none', fontSize: '14.5px', color: '#475569', fontWeight: 600 }} className="hover:text-blue-600 transition-colors">
              Log In
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-premium-primary" style={{
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Get Started Free <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={{ 
        padding: '100px 24px 120px 24px', 
        background: 'radial-gradient(circle at 80% 20%, rgba(99, 91, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Subtle geometric grid background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.01) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
          pointerEvents: 'none'
        }} />

        <div className="hero-grid" style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '64px', alignItems: 'center' }}>
          {/* Left Hero Content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {/* Pill Badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '6px 14px', 
              backgroundColor: '#f5f3ff', 
              border: '1px solid #ddd6fe',
              borderRadius: '9999px',
              color: '#6366f1',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '28px'
            }}>
              <Sparkles size={14} style={{ color: '#7c3aed' }} /> AI-Powered. Examiner-Calibrated. Result-Focused.
            </div>

            <h1 style={{ 
              fontSize: '56px', 
              fontWeight: 800, 
              color: '#0f172a', 
              lineHeight: '1.1', 
              letterSpacing: '-1.8px', 
              margin: '0 0 24px 0'
            }}>
              Turn practice into performance: <span className="gradient-text">Master every answer</span> before the exam.
            </h1>

            <p style={{ 
              fontSize: '18px', 
              color: '#475569', 
              lineHeight: '1.65', 
              margin: '0 0 40px 0', 
              maxWidth: '560px' 
            }}>
              Upload your handwritten exam answer sheets. Xaminix automatically extracts the handwriting, checks statutory legal citations, audits conceptual coverage, and scores your paper using calibrated examiner rubrics.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', width: '100%', marginBottom: '48px' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-premium-primary" style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '15.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  Evaluate My First Answer <ArrowRight size={16} />
                </button>
              </Link>
              <a href="#how-it-works" style={{ textDecoration: 'none' }}>
                <button className="btn-premium-secondary" style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '15.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Play size={16} fill="currentColor" /> See How It Works
                </button>
              </a>
            </div>

            {/* Core Trust Badges */}
            <div style={{ display: 'flex', gap: '32px', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SPEED</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '4px' }}>Under 60 Secs</span>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CONFIDENCE</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '4px' }}>96.8% Accuracy</span>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STUDENTS</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '4px' }}>CS & Law Focus</span>
              </div>
            </div>
          </div>

          {/* Right Hero Dashboard Mockup Visual */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.08), 0 0 40px rgba(99, 91, 255, 0.02)',
              position: 'relative',
              overflow: 'hidden'
            }} className="float-card-1">
              
              {/* Scan Beam Effect */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #10b981 30%, #10b981 70%, transparent)',
                boxShadow: '0 0 15px #10b981, 0 0 5px #10b981',
                zIndex: 20,
                animation: 'scan-glow 4s infinite ease-in-out'
              }} />

              {/* Mockup Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#eab308', borderRadius: '50%' }} />
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', borderRadius: '50%' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginLeft: '8px', fontFamily: 'monospace' }}>eval-session_982b.xml</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }} /> Live Calibrating
                </span>
              </div>

              {/* Main Content Layout in Mockup */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {/* Handwritten Answer Mock */}
                <div style={{ padding: '20px', backgroundColor: '#fafaf9', border: '1px dashed #e2e8f0', borderRadius: '16px', position: 'relative' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>Handwritten Answer Sheet Preview</span>
                  <div style={{ 
                    fontStyle: 'italic', 
                    color: '#1e3a8a', 
                    fontSize: '15px', 
                    lineHeight: '2.1', 
                    fontFamily: '"Georgia", serif', 
                    background: 'linear-gradient(rgba(226,232,240,0.4) 1px, transparent 1px)',
                    backgroundSize: '100% 2.1em',
                    padding: '0 8px'
                  }}>
                    Q. Discuss the powers of the general meeting regarding Section 96 of Companies Act, 2013.<br/>
                    Every company must hold an Annual General Meeting each year... The gap between two AGMs cannot exceed 15 months...
                  </div>
                </div>

                {/* Score & OCR Floating Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      <CheckCircle size={14} /> Sections Tracked
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#14532d' }}>Sec 96 Verified</div>
                    <span style={{ fontSize: '11px', color: '#166534' }}>Companies Act, 2013</span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      <Award size={14} /> Total Score
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e3a8a' }}>
                      {animatedScore.toFixed(2)} / 5.00
                    </div>
                    <span style={{ fontSize: '11px', color: '#1e40af' }}>Grade: Excellent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlapping small floating badge */}
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-10px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 30
            }} className="float-card-2">
              <Sparkles size={16} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.8, display: 'block', fontWeight: 600 }}>OCR Speed</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Evaluated in 42s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Built For Professional Exams Section */}
      <section style={{ padding: '80px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              CALIBRATED COVERAGE
            </h2>
            <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              Built for Professional Exam Candidates
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { title: 'CS Executive', active: true, desc: 'Company Law module, Secreterial practice standards fully automated.' },
              { title: 'Company Law', active: true, desc: 'Corporate legal analysis, Case structures, ROC extensions calibration.' },
              { title: 'CA (Chartered Accountant)', active: false, desc: 'Auditing, Income Tax laws, corporate acts modules. (Coming Late 2026)' },
              { title: 'CMA (Cost Management)', active: false, desc: 'Financial statutes & Cost accounting laws evaluation. (Coming Late 2026)' },
              { title: 'UPSC Law Optional', active: false, desc: 'Descriptive answers checking & Constitutional articles. (Coming 2027)' }
            ].map((card, i) => (
              <div key={i} style={{
                padding: '28px',
                backgroundColor: '#ffffff',
                border: card.active ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                borderRadius: '20px',
                boxShadow: card.active ? '0 10px 25px -5px rgba(15, 23, 42, 0.02)' : 'none',
                opacity: card.active ? 1 : 0.7,
                position: 'relative',
                transition: 'all 0.2s ease-in-out'
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
                    padding: '3px 8px', 
                    borderRadius: '9999px' 
                  }}>Coming Soon</span>
                )}
                {card.active && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    fontSize: '9px', 
                    fontWeight: 700, 
                    backgroundColor: '#e6fffa', 
                    color: '#059669', 
                    padding: '3px 8px', 
                    borderRadius: '9999px' 
                  }}>Supported</span>
                )}
                <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>{card.title}</h4>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              EVALUATION PIPELINE
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              3 Steps to Examiner-Grade Evaluation
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', position: 'relative' }}>
            {[
              { num: '01', title: 'Upload Practice Sheet', desc: 'Take a picture or upload a PDF of your handwritten answers. Our dashboard handles high-res uploads instantly.' },
              { num: '02', title: 'AI OCR Scanning & Audit', desc: 'The engine extracts text, checks statutory section numbers, cross-references corporate guidelines, and scores metrics.' },
              { num: '03', title: 'Actionable Improvement', desc: 'Receive your score breakdown, see missing sections highlights, and read the calibrated model script answers.' }
            ].map((step, idx) => (
              <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ 
                  fontSize: '56px', 
                  fontWeight: 900, 
                  color: '#e2e8f0', 
                  display: 'block', 
                  lineHeight: '1', 
                  marginBottom: '16px',
                  fontFamily: 'monospace'
                }}>{step.num}</span>
                <h4 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>{step.title}</h4>
                <p style={{ fontSize: '14.5px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bento Feature Grid Section */}
      <section id="features" style={{ padding: '120px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              PRODUCT FEATURES
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              Engineered to Elevate Descriptive Scores
            </h3>
          </div>

          <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            
            {/* Bento Card 1: Large (2 Cols Wide) */}
            <div className="bento-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px' }}>
                  <FileText size={22} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Handwriting OCR Engine</h4>
              </div>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: 20 }}>
                Custom trained neural network optimized for typical exam handwriting. Converts fast and messy scribbles into structured digital text with 96.8% accuracy. Keeps visual markers intact.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>Cursive Support</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>Low Light Uploads</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>Multi-Page Stitching</span>
              </div>
            </div>

            {/* Bento Card 2: Small */}
            <div className="bento-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', color: '#10b981', borderRadius: '12px' }}>
                  <ShieldCheck size={22} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Statute Verification</h4>
              </div>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
                Scans citations in real-time. Highlights valid Section numbers, missing Rules, and alerts if you write wrong provisions.
              </p>
            </div>

            {/* Bento Card 3: Small */}
            <div className="bento-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f5f3ff', color: '#7c3aed', borderRadius: '12px' }}>
                  <Award size={22} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Examiner Rubrics</h4>
              </div>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
                We calibrate our AI to follow the exact point structures of CA & CS Board guidelines. No generic suggestions.
              </p>
            </div>

            {/* Bento Card 4: Large (2 Cols Wide) */}
            <div className="bento-card" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#fffbeb', color: '#d97706', borderRadius: '12px' }}>
                  <Sparkles size={22} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>calibrated Model Answers</h4>
              </div>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: 20 }}>
                Study top-performing model drafts tailored for every question. Understand how professional examiners expect answer formats, legal references, analysis flow, and definitive conclusions to look.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '6px' }}>Format Highlights</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '6px' }}>Legal Phrasing</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Interactive Product Preview Section */}
      <section id="preview" style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              INTERACTIVE DEMO
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
              Explore the Evaluation Report
            </h3>
            <p style={{ fontSize: '16px', color: '#475569' }}>
              Select the tabs below to preview the exact breakdown structure Xaminix provides for your scripts.
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
                { id: 'provisions', label: '4. Legal Provisions Audit' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '18px 12px',
                    border: 'none',
                    borderBottom: activePreviewTab === tab.id ? '2px solid #2563eb' : 'none',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: activePreviewTab === tab.id ? '#2563eb' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '36px', minHeight: '360px', backgroundColor: '#ffffff' }}>
              {activePreviewTab === 'ocr' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div style={{ padding: '24px', backgroundColor: '#fafaf9', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', display: 'block', marginBottom: '12px', letterSpacing: '0.5px' }}>Handwritten Sheet snapshot</span>
                    <p style={{ fontStyle: 'italic', color: '#1e3b8a', fontFamily: '"Georgia", serif', lineHeight: '1.9' }}>
                      &quot;Every company under Section 96 has to hold an AGM within 9 months of financial year end...&quot;
                    </p>
                  </div>
                  <div style={{ padding: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '12px', letterSpacing: '0.5px' }}>Extracted Digital Text (OCR)</span>
                    <p style={{ color: '#1e293b', fontSize: '14.5px', lineHeight: '1.6' }}>
                      Every company under Section 96 has to hold an AGM within 9 months of financial year end...
                    </p>
                    <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600, display: 'block', marginTop: '16px' }}>✓ OCR Confidence: 99.1%</span>
                  </div>
                </div>
              )}

              {activePreviewTab === 'score' && (
                <div>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Marks Breakdown Rubric</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                      { title: 'Legal Provision & Citations (Section 96 & rules)', score: '0.90 / 1.0', pct: 90 },
                      { title: 'Concept Coverage (AGM timelines & exemptions)', score: '1.60 / 2.0', pct: 80 },
                      { title: 'Explanation & Analysis (OPC exclusions context)', score: '0.80 / 1.0', pct: 80 },
                      { title: 'Conclusion validity & structure', score: '0.45 / 0.5', pct: 90 }
                    ].map((row, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                          <span style={{ color: '#475569' }}>{row.title}</span>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>{row.score}</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '9999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePreviewTab === 'feedback' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  <div style={{ padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#166534' }}>Key Strengths</h5>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', color: '#14532d', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <li>Successfully identified Section 96 requirements.</li>
                      <li>Accurately outlined 15-month max gap between subsequent meetings.</li>
                    </ul>
                  </div>
                  <div style={{ padding: '24px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#9f1239' }}>Improvement Required</h5>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13.5px', color: '#9f1239', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <li>Missed the ROC extension rules (max extension of 3 months).</li>
                      <li>Incorporate specific case rules like ROC business hour notice constraints.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activePreviewTab === 'provisions' && (
                <div>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Legal Provision Audit</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>CORRECT</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#14532d' }}>Section 96</span>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#fffbeb', borderRadius: '14px', border: '1px solid #fde68a' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>PARTIAL CITATION</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#78350f' }}>Form MGT-15</span>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#fff1f2', borderRadius: '14px', border: '1px solid #fecdd3' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#be123c', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>MISSING RULE</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#9f1239' }}>Rule 14 (Notices)</span>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>INCORRECT</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>None Detected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Traditional Practice vs Xaminix Section */}
      <section id="comparison" style={{ padding: '120px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              PRODUCT COMPARISON
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              Traditional Checking vs. Xaminix
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
            {/* Traditional Column */}
            <div style={{ padding: '36px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px' }}>
              <h4 style={{ fontSize: '19px', fontWeight: 700, color: '#64748b', marginBottom: '28px' }}>Traditional Evaluation</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '14.5px', color: '#64748b', display: 'flex', gap: '10px' }}>
                  <span>❌</span> <span>**7 to 14 Day Wait time** before receiving evaluation.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#64748b', display: 'flex', gap: '10px' }}>
                  <span>❌</span> <span>**Subjective marks** with minimal alignment details.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#64748b', display: 'flex', gap: '10px' }}>
                  <span>❌</span> <span>**No specific citation verification** checks.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#64748b', display: 'flex', gap: '10px' }}>
                  <span>❌</span> <span>**Zero progress tracking** dashboard stats.</span>
                </div>
              </div>
            </div>

            {/* Xaminix Column */}
            <div style={{ 
              padding: '36px', 
              backgroundColor: '#ffffff', 
              border: '2px solid #2563eb', 
              borderRadius: '24px', 
              boxShadow: '0 20px 40px -10px rgba(37,99,235,0.06)',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                top: '-14px',
                right: '24px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '9999px',
                textTransform: 'uppercase'
              }}>RECOMMENDED</span>
              <h4 style={{ fontSize: '19px', fontWeight: 700, color: '#2563eb', marginBottom: '28px' }}>Xaminix AI</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '14.5px', color: '#334155', display: 'flex', gap: '10px' }}>
                  <span>✅</span> <span>**Under 60 seconds** total evaluation turnaround.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#334155', display: 'flex', gap: '10px' }}>
                  <span>✅</span> <span>**Calibrated scoring** based on point value standards.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#334155', display: 'flex', gap: '10px' }}>
                  <span>✅</span> <span>**Interactive Legal Provision Check** with highlights.</span>
                </div>
                <div style={{ fontSize: '14.5px', color: '#334155', display: 'flex', gap: '10px' }}>
                  <span>✅</span> <span>**SaaS progress dashboard** with metrics history.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Progress Tracking & Analytics Section */}
      <section id="analytics" style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '65px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              ANALYTICS & METRICS
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
              Track Your Strengths & Progress
            </h3>
            <p style={{ fontSize: '16px', color: '#475569' }}>
              Our analytics dashboard processes scores from all tests to draw a performance roadmap.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '40px', alignItems: 'center' }} className="hero-grid">
            {/* Tabs for switching visuals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'trends', label: 'Improvement Trends', desc: 'Watch your scores rise across successive evaluations.' },
                { id: 'weakness', label: 'Weakness Identification', desc: 'Isolate sections or rules you consistently miss.' },
                { id: 'topics', label: 'Topic Strengths', desc: 'Identify which corporate statutes you master best.' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveProgressTab(btn.id as any)}
                  style={{
                    textAlign: 'left',
                    padding: '20px',
                    border: '1px solid ' + (activeProgressTab === btn.id ? '#bfdbfe' : '#e2e8f0'),
                    borderRadius: '16px',
                    backgroundColor: activeProgressTab === btn.id ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <h5 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>{btn.label}</h5>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>{btn.desc}</p>
                </button>
              ))}
            </div>

            {/* Display Graphic Cards based on active tab */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 15px 30px rgba(15, 23, 42, 0.03)',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {activeProgressTab === 'trends' && (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0' }}>Average Score Growth Trend</h4>
                  {/* Visual SVG Line Graph representation */}
                  <svg viewBox="0 0 400 160" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    <path d="M 10,140 Q 90,130 130,90 T 250,60 T 380,20" fill="none" stroke="#2563eb" strokeWidth="4" />
                    <circle cx="10" cy="140" r="5" fill="#2563eb" />
                    <circle cx="130" cy="90" r="5" fill="#2563eb" />
                    <circle cx="250" cy="60" r="5" fill="#2563eb" />
                    <circle cx="380" cy="20" r="6" fill="#10b981" />
                    <text x="10" y="160" fontSize="10" fill="#64748b" textAnchor="middle">Test 1</text>
                    <text x="130" y="110" fontSize="10" fill="#64748b" textAnchor="middle">Test 2</text>
                    <text x="250" y="80" fontSize="10" fill="#64748b" textAnchor="middle">Test 3</text>
                    <text x="380" y="40" fontSize="10" fill="#10b981" fontWeight="700" textAnchor="middle">Test 4 (85%)</text>
                  </svg>
                </div>
              )}

              {activeProgressTab === 'weakness' && (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0' }}>Omission Identification Analysis</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>ROC Filings (Section 92 / 137)</span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>60% Missed</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                        <div style={{ width: '60%', height: '100%', backgroundColor: '#ef4444', borderRadius: '4px' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>Secretarial Standards (SS-1 / SS-2)</span>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>35% Missed</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                        <div style={{ width: '35%', height: '100%', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeProgressTab === 'topics' && (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0' }}>Syllabus Strengths Map</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { topic: 'General Meetings (Section 96-122)', strength: '92% Strength', color: '#10b981', w: '92%' },
                      { topic: 'Directors & Board Rules', strength: '78% Strength', color: '#3b82f6', w: '78%' },
                      { topic: 'Incorporation & Objects', strength: '65% Strength', color: '#6366f1', w: '65%' }
                    ].map((row, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span>{row.topic}</span>
                          <span style={{ color: row.color, fontWeight: 600 }}>{row.strength}</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                          <div style={{ width: row.w, height: '100%', backgroundColor: row.color, borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. Future Roadmap Section */}
      <section id="roadmap" style={{ padding: '120px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              ROADMAP
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              Future Certification Tracks
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
            {/* Connection Line */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '19px',
              bottom: '20px',
              width: '2px',
              background: 'linear-gradient(#2563eb, #e2e8f0)'
            }} />

            {[
              { phase: 'CS Executive Theory (Active)', desc: 'Fully active for Company Law papers. Scoring models configured against current executive guidelines.' },
              { phase: 'CA & CMA Modules (Q4 2026)', desc: 'Extending to corporate audit standards, direct/indirect tax sections scoring calibration.' },
              { phase: 'UPSC Law Optional & Law Exams (Q1 2027)', desc: 'Configuring constitutional law guidelines and descriptive judicial interpretation scoring.' }
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: idx === 0 ? '#2563eb' : '#ffffff',
                  border: idx === 0 ? 'none' : '2px solid #cbd5e1',
                  color: idx === 0 ? '#ffffff' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
                }}>
                  {idx + 1}
                </div>
                <div style={{ paddingTop: '8px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>{step.phase}</h4>
                  <p style={{ fontSize: '14.5px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ Accordion Section */}
      <section id="faq" style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
              SUPPORT & FAQ
            </h2>
            <h3 style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px' }}>
              Frequently Asked Questions
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { q: 'How does Xaminix calibrate its scores?', a: 'The engine uses structured grading rubrics calibrated directly to professional board examination standards. It awards partial marks based on legal provisions, concept coverage, analysis quality, and conclusion validity.' },
              { q: 'Does the scanner support messy cursive handwriting?', a: 'Yes. Our specialized OCR engine is trained on thousands of sample student test scripts, allowing it to parse fast cursive and low-light photo uploads with high accuracy.' },
              { q: 'Which exams are currently supported?', a: 'We are currently fully live for CS Executive and general Company Law. Modules for Chartered Accountancy (CA) and Cost Management (CMA) are launching in Q4 2026.' },
              { q: 'Is my uploaded answer sheet kept secure?', a: 'Absolutely. All uploads are fully encrypted and treated as strictly private. Your sheets are only used for your evaluation session report.' }
            ].map((faq, i) => (
              <div key={i} style={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}>
                <button 
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: '100%',
                    padding: '22px 28px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    fontSize: '15.5px',
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
                  <div style={{ padding: '0 28px 24px 28px', fontSize: '14.5px', color: '#475569', lineHeight: '1.6', borderTop: '1px solid #f8fafc' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Final CTA Section */}
      <section style={{ padding: '100px 24px 120px 24px' }}>
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          backgroundColor: '#0f172a', 
          borderRadius: '32px', 
          padding: '80px 48px',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.25)'
        }}>
          {/* Subtle glow effect background inside CTA card */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            right: '-50%',
            bottom: '-50%',
            background: 'radial-gradient(circle, rgba(99, 91, 255, 0.1) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          <h2 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '20px', letterSpacing: '-1px' }}>
            Ready to Master Your Exams?
          </h2>
          <p style={{ fontSize: '17px', color: '#94a3b8', marginBottom: '40px', maxWidth: '520px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            Upload your descriptive answers today and learn exactly what it takes to score full marks.
          </p>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn-premium-primary" style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '18px 36px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Evaluate My First Answer <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </section>

      {/* 11.5 Join the Xaminix Community Section */}
      <section style={{ 
        padding: '80px 24px', 
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderTop: '1px solid #f1f5f9',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            GET CONNECTED
          </h2>
          <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.8px', marginBottom: '16px' }}>
            Join the Xaminix Community
          </h3>
          <p style={{ fontSize: '16px', color: '#475569', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            Connect with other professional exam candidates, read updates, participate in discussions, and get direct support from our team.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '24px',
            marginTop: '20px'
          }}>
            {/* Instagram Card */}
            <a 
              href="https://instagram.com/xaminix.ai" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Follow Xaminix on Instagram"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
              }}
              className="bento-card"
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Instagram</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>@xaminix.ai</span>
            </a>

            {/* Reddit Card */}
            <a 
              href="https://reddit.com/u/xaminix_ai" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Follow Xaminix on Reddit"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
              }}
              className="bento-card"
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: '#ff4500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M17.5 10.5c0-.83-.67-1.5-1.5-1.5-.27 0-.52.07-.74.2-.74-.53-1.74-.87-2.85-.92l.6-1.9 1.63.35c.03.46.42.82.9.82.5 0 .9-.4.9-.9s-.4-.9-.9-.9c-.4 0-.74.26-.86.62l-1.84-.4c-.1-.02-.2.03-.25.12l-.68 2.16c-1.16.03-2.2.37-2.96.92-.22-.13-.48-.2-.75-.2-.83 0-1.5.67-1.5 1.5 0 .54.28 1.01.7 1.28-.04.18-.06.36-.06.55 0 2.2 2.68 4 6 4s6-1.8 6-4c0-.18-.02-.37-.06-.55.43-.27.7-.74.7-1.28zM9 11.5c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm6 3.5c-1.07 0-2.02-.58-2.5-1.5-.07-.13-.02-.3.12-.37.13-.07.3-.02.37.12.38.74 1.16 1.2 2.01 1.2.85 0 1.63-.46 2.01-1.2.07-.14.24-.19.37-.12.14.07.19.24.12.37-.48.92-1.43 1.5-2.5 1.5zm1-3.5c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z"/></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Reddit</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>u/xaminix_ai</span>
            </a>

            {/* Twitter Card */}
            <a 
              href="https://x.com/XaminixAI" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Follow Xaminix on Twitter X"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
              }}
              className="bento-card"
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                marginBottom: '16px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Twitter (X)</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>@XaminixAI</span>
            </a>

            {/* Founder Card */}
            <a 
              href="mailto:founder@xaminix.com" 
              aria-label="Email Founder & Partnerships"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
              }}
              className="bento-card"
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Founder & Partnerships</span>
              <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>founder@xaminix.com</span>
            </a>

            {/* Support Card */}
            <a 
              href="mailto:hi@xaminix.com" 
              aria-label="Email Support & General Enquiries"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                transition: 'all 0.3s ease-in-out',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
              }}
              className="bento-card"
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Support & General Enquiries</span>
              <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>hi@xaminix.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* 12. Footer Section */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '80px 24px 40px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '48px', marginBottom: '60px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <img 
                src="/logo.png" 
                alt="Xaminix Logo" 
                style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
              />
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Xaminix</span>
            </div>
            <span style={{ fontSize: '13.5px', color: '#64748b', display: 'block', maxWidth: '320px', lineHeight: '1.6' }}>
              AI-powered answer evaluation calibration platform for professional descriptive examinations.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap' }}>
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>Product</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="#how-it-works" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600 transition-colors">How It Works</a>
                <a href="#features" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600 transition-colors">Features</a>
                <a href="#preview" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600 transition-colors">Interactive Demo</a>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>Legal</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="#privacy" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                <a href="#terms" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} className="hover:text-blue-600 transition-colors">Terms of Service</a>
                <a 
                  href="https://forms.gle/rnpjFmw6dorfXAJc6" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      console.log('[Analytics Event]: footer_feedback_clicked');
                    }
                  }}
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  Feedback & Suggestions
                </a>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>Community</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a 
                  href="https://instagram.com/xaminix.ai" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Instagram Link"
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  @xaminix.ai (Instagram)
                </a>
                <a 
                  href="https://reddit.com/u/xaminix_ai" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Reddit Link"
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  u/xaminix_ai (Reddit)
                </a>
                <a 
                  href="https://x.com/XaminixAI" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Twitter X Link"
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  @XaminixAI (Twitter)
                </a>
                <a 
                  href="mailto:hi@xaminix.com" 
                  aria-label="Support Email Link"
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  hi@xaminix.com (Support)
                </a>
                <a 
                  href="mailto:founder@xaminix.com" 
                  aria-label="Founder Email Link"
                  style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }} 
                  className="hover:text-blue-600 transition-colors"
                >
                  founder@xaminix.com (Business)
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1280px', margin: '0 auto', borderTop: '1px solid #e2e8f0', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontSize: '13.5px', color: '#64748b' }}>&copy; {new Date().getFullYear()} Xaminix. All rights reserved.</span>
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

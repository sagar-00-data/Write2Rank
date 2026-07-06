'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, ShieldCheck, Lock, Award, EyeOff, FileUp, Cpu, Activity, ArrowRight } from 'lucide-react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [animationStep, setAnimationStep] = useState<0 | 1 | 2 | 3>(0);
  const [typedText, setTypedText] = useState('');
  const [progressVal, setProgressVal] = useState(0);

  // Auth routing redirect
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Looping Dashboard Story state machine
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (animationStep === 0) {
      setProgressVal(0);
      const interval = setInterval(() => {
        setProgressVal((p) => {
          if (p >= 100) {
            clearInterval(interval);
            timer = setTimeout(() => setAnimationStep(1), 800);
            return 100;
          }
          return p + 4;
        });
      }, 50);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else if (animationStep === 1) {
      setTypedText('');
      const fullText = "Every company must hold an Annual General Meeting (AGM) each year under Section 96 of the Companies Act, 2013. The gap between two AGMs cannot exceed 15 months...";
      let currIndex = 0;
      const interval = setInterval(() => {
        if (currIndex < fullText.length) {
          setTypedText((prev) => prev + fullText.charAt(currIndex));
          currIndex++;
        } else {
          clearInterval(interval);
          timer = setTimeout(() => setAnimationStep(2), 1200);
        }
      }, 25);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else if (animationStep === 2) {
      timer = setTimeout(() => {
        setAnimationStep(3);
      }, 4500);
      return () => clearTimeout(timer);
    } else if (animationStep === 3) {
      timer = setTimeout(() => {
        setAnimationStep(0);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [animationStep]);

  return (
    <div className="login-container">
      {/* CSS-in-JS global style injection for custom classes and layout animation */}
      <style jsx global>{`
        .login-container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          background-color: #060913;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }

        /* Left Side: Immersive AI Workspace Showcase */
        .workspace-panel {
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 50% 30%, #0d1527 0%, #050811 80%);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Ambient Glow & Grid Textures */
        .grid-mask {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backgroundImage: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          backgroundSize: 30px 30px;
          maskImage: radial-gradient(ellipse at center, black, transparent 85%);
          pointer-events: none;
        }

        .glow-orb {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 91, 255, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
          top: 15%;
          left: 10%;
          filter: blur(40px);
          pointer-events: none;
        }

        .glow-orb-2 {
          position: absolute;
          width: 450px;
          height: 450px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(0, 0, 0, 0) 70%);
          bottom: 10%;
          right: 10%;
          filter: blur(40px);
          pointer-events: none;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 20;
        }

        .brand-monogram {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        .brand-wordmark {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .workspace-content {
          margin: auto 0;
          z-index: 20;
          position: relative;
        }

        .title-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 91, 255, 0.12);
          border: 1px solid rgba(99, 91, 255, 0.25);
          color: #a78bfa;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .headline-text {
          font-size: 40px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
          color: #f8fafc;
        }

        .color-gradient {
          background: linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .supporting-text {
          font-size: 16px;
          color: #94a3b8;
          line-height: 1.6;
          max-width: 520px;
          margin-bottom: 40px;
        }

        /* Interactive Dashboard Story Container */
        .dashboard-container {
          background: rgba(10, 15, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          backdrop-filter: blur(16px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.4);
          position: relative;
          min-height: 320px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: all 0.3s ease;
        }

        /* Flow Step Stepper Indicator */
        .stepper-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 14px;
        }

        .step-pill {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.2s;
        }

        .step-pill.active {
          color: #818cf8;
          background: rgba(99, 91, 255, 0.12);
        }

        /* OCR laser animation */
        .laser-beam {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #34d399, transparent);
          box-shadow: 0 0 10px #34d399;
          animation: laserMove 2.8s infinite ease-in-out;
        }

        @keyframes laserMove {
          0% { top: 15%; }
          50% { top: 85%; }
          100% { top: 15%; }
        }

        .handwritten-preview {
          font-family: 'Georgia', serif;
          font-style: italic;
          color: #93c5fd;
          font-size: 14px;
          line-height: 2.1;
          background: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 100% 2.1em;
          padding: 8px 12px;
          border-radius: 12px;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255,255,255,0.04);
        }

        /* Floating Info Badges */
        .gently-floating {
          position: absolute;
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.25);
          animation: floatSlow 4s infinite ease-in-out;
          z-index: 30;
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* Footer Metrics values */
        .workspace-footer {
          z-index: 20;
          display: flex;
          gap: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 24px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
        }

        .metric-desc {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        /* Right Side: High-Fidelity Authentication Form */
        .auth-panel {
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 60px 40px;
          position: relative;
        }

        /* Auth Card Layout mimicking Vercel / Apple aesthetics */
        .auth-card {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .trust-panel {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .trust-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #334155;
          font-weight: 500;
        }

        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
          }
          .workspace-panel {
            display: none;
          }
          .auth-panel {
            padding: 40px 20px;
            background-color: #060913;
            color: #ffffff;
          }
          .trust-panel {
            background-color: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.06);
          }
          .trust-badge-row {
            color: #94a3b8;
          }
        }
      `}</style>

      {/* Left Column: Interactive Showcase */}
      <div className="workspace-panel">
        <div className="grid-mask"></div>
        <div className="glow-orb"></div>
        <div className="glow-orb-2"></div>

        {/* Brand Header */}
        <div className="panel-header">
          <img src="/logo.png" alt="Xaminix Logo" className="brand-monogram" />
          <span className="brand-wordmark">Xaminix</span>
        </div>

        {/* Dynamic AI Workspace Showcase */}
        <div className="workspace-content">
          <div className="title-badge">
            <Sparkles size={12} />
            <span>AI Workspace Simulator</span>
          </div>

          <h2 className="headline-text">
            Turn practice into performance: <span className="color-gradient">Master every answer</span> before the exam.
          </h2>

          <p className="supporting-text">
            Upload handwritten answers. Receive examiner-style AI feedback. Improve with confidence.
          </p>

          {/* Interactive Mockup Component detailing the Evaluation Flow */}
          <div className="dashboard-container">
            <div className="stepper-header">
              <span className={`step-pill ${animationStep === 0 ? 'active' : ''}`}>1. Upload</span>
              <span className={`step-pill ${animationStep === 1 ? 'active' : ''}`}>2. Parsing OCR</span>
              <span className={`step-pill ${animationStep === 2 ? 'active' : ''}`}>3. Calibrating</span>
              <span className={`step-pill ${animationStep === 3 ? 'active' : ''}`}>4. Completed</span>
            </div>

            {/* Step 1: Uploading Animation */}
            {animationStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '16px' }}>
                <FileUp size={36} style={{ color: '#818cf8', animation: 'bounce 2s infinite' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#e2e8f0', display: 'block' }}>uploading_answer_script_law.pdf</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Uploading to check engine...</span>
                </div>
                <div style={{ width: '220px', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressVal}%`, height: '100%', backgroundColor: '#818cf8', borderRadius: '99px', transition: 'width 0.1s ease-out' }} />
                </div>
              </div>
            )}

            {/* Step 2: OCR Scanning Animation */}
            {animationStep === 1 && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '160px' }}>
                <div className="laser-beam"></div>
                <div className="handwritten-preview">
                  Q. Explain Section 96 of Companies Act, 2013 regarding AGMs...
                </div>
                <div style={{ padding: '12px', backgroundColor: 'rgba(99, 91, 255, 0.06)', border: '1px solid rgba(99,91,255,0.12)', borderRadius: '12px', fontSize: '13px', color: '#cbd5e1', minHeight: '60px', fontFamily: 'monospace' }}>
                  {typedText}
                  <span style={{ animation: 'blink 1s infinite', fontWeight: 800 }}>|</span>
                </div>
              </div>
            )}

            {/* Step 3: Calibrating Evaluation Breakdown */}
            {animationStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '160px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} /> Rubric calibration aligned to ICSI guidelines...
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>Section 96 statutory quote</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Correct (1.00 marks)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>ROC 3-month extension clause</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ Missing ROC reference</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>First AGM timeline constraint</span>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>✗ Incorrect gap timeline</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Finished Evaluation Scorecard */}
            {animationStep === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '160px', alignItems: 'center' }}>
                <div style={{ padding: '20px', backgroundColor: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.15)', borderRadius: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Calibrated Score</span>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff' }}>4.25 <span style={{ fontSize: '16px', color: '#64748b' }}>/ 5</span></div>
                  <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, display: 'block', marginTop: '6px' }}>Grade: Excellent</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>✓ Section 96 citations verified.</div>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>✓ Gap between AGMs validated.</div>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>⚠ Check Roc filings forms extension.</div>
                </div>
              </div>
            )}

            {/* Float badge overlays */}
            <div className="gently-floating" style={{ top: '-18px', left: '-12px' }}>
              <Cpu size={14} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#e2e8f0' }}>OCR accuracy: 98.6%</span>
            </div>
            <div className="gently-floating" style={{ bottom: '-18px', right: '-12px' }}>
              <Award size={14} style={{ color: '#34d399' }} />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#e2e8f0' }}>Score Improved +18%</span>
            </div>
          </div>
        </div>

        {/* Footer info panels */}
        <div className="workspace-footer">
          <div className="metric-item">
            <span className="metric-value">50k+</span>
            <span className="metric-desc">Sheets Evaluated</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">96.8%</span>
            <span className="metric-desc">Grading Calibration</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">Secure SSL</span>
            <span className="metric-desc">Private & Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="auth-panel">
        <div className="auth-card">
          {/* Clerk Native Authenticator Container */}
          <SignIn
            path="/login"
            appearance={{
              variables: {
                colorPrimary: '#2563eb', 
                colorBackground: '#ffffff', 
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              elements: {
                cardBox: {
                  boxShadow: 'none',
                  width: '100%',
                },
                card: {
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
                  borderRadius: '24px',
                  padding: '36px',
                  width: '100%',
                  background: '#ffffff',
                },
                headerTitle: {
                  fontWeight: '800',
                  fontSize: '22px',
                  letterSpacing: '-0.5px',
                  color: '#0f172a',
                },
                headerSubtitle: {
                  color: '#64748b',
                  fontSize: '13.5px',
                },
                socialButtonsBlockButton: {
                  borderColor: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '11px 20px',
                  '&:hover': {
                    background: '#f8fafc',
                  }
                },
                formButtonPrimary: {
                  background: '#0f172a',
                  borderRadius: '10px',
                  padding: '11px',
                  '&:hover': {
                    background: '#1e293b',
                  }
                },
                footerActionLink: {
                  color: '#2563eb',
                  '&:hover': {
                    color: '#1d4ed8',
                  }
                }
              }
            }}
          />

          {/* Secure Trust indicators panel */}
          <div className="trust-panel">
            <div className="trust-badge-row">
              <Lock size={14} style={{ color: '#10b981' }} />
              <span>Secure Google Authentication & SSO</span>
            </div>
            <div className="trust-badge-row">
              <EyeOff size={14} style={{ color: '#6366f1' }} />
              <span>Strict Privacy: Answer sheets remain 100% confidential</span>
            </div>
            <div className="trust-badge-row">
              <ShieldCheck size={14} style={{ color: '#3b82f6' }} />
              <span>Calibrated Answer Grading for CS Executive & Law</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


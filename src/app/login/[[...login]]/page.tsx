'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, ShieldCheck, Lock, Award, EyeOff, FileUp, Cpu, Activity, CheckCircle } from 'lucide-react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [animationStep, setAnimationStep] = useState<0 | 1 | 2 | 3>(0);
  const [typedText, setTypedText] = useState('');
  const [progressVal, setProgressVal] = useState(0);

  // Redirect if logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Looping background workspace story
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (animationStep === 0) {
      const interval = setInterval(() => {
        setProgressVal((p) => {
          if (p >= 100) {
            clearInterval(interval);
            timer = setTimeout(() => setAnimationStep(1), 1000);
            return 100;
          }
          return p + 5;
        });
      }, 50);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else if (animationStep === 1) {
      setTypedText('');
      const fullText = "Section 96 of Companies Act, 2013: Every company must hold an AGM each year. First AGM within 9 months of financial year close. Subsequent AGMs within 6 months. Max gap is 15 months...";
      let currIndex = 0;
      const interval = setInterval(() => {
        if (currIndex < fullText.length) {
          setTypedText((prev) => prev + fullText.charAt(currIndex));
          currIndex++;
        } else {
          clearInterval(interval);
          timer = setTimeout(() => setAnimationStep(2), 1500);
        }
      }, 20);
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
        setProgressVal(0);
        setAnimationStep(0);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [animationStep]);

  return (
    <div className="immersive-login-container">
      {/* Global CSS Inject for full screen styling, animations, floating cards */}
      <style jsx global>{`
        .immersive-login-container {
          min-height: 100vh;
          width: 100vw;
          background-color: #030712;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 24px;
        }

        /* Ambient Glow Backdrop */
        .ambient-mesh {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 10% 20%, rgba(99, 91, 255, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.95) 0%, #030712 100%);
          z-index: 1;
        }

        .minimal-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backgroundImage: linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          backgroundSize: 40px 40px;
          maskImage: radial-gradient(ellipse at center, black, transparent 80%);
          pointer-events: none;
          z-index: 2;
        }

        /* Immersive Live Workspace Simulator Backdrop */
        .workspace-backdrop {
          position: absolute;
          width: 85%;
          max-width: 1200px;
          height: 80%;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 32px;
          background: rgba(10, 15, 30, 0.4);
          box-shadow: inset 0 0 80px rgba(99, 91, 255, 0.03);
          z-index: 3;
          opacity: 0.4;
          filter: blur(1px);
          pointer-events: none;
          display: flex;
          flex-direction: column;
          padding: 40px;
          gap: 24px;
        }

        /* Stage layout style inside simulated workspace */
        .backdrop-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 20px;
        }

        .backdrop-step-pill {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.15);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .backdrop-step-pill.active {
          color: rgba(99, 91, 255, 0.6);
        }

        .backdrop-handwriting {
          font-family: 'Georgia', serif;
          font-style: italic;
          color: rgba(147, 197, 253, 0.35);
          font-size: 16px;
          line-height: 2.2;
          background: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 100% 2.2em;
          padding: 20px;
          border-radius: 16px;
        }

        /* Interactive Laser scanning */
        .laser-line-anim {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.4), transparent);
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
          animation: moveLaser 3.5s infinite ease-in-out;
        }

        @keyframes moveLaser {
          0% { top: 20%; }
          50% { top: 80%; }
          100% { top: 20%; }
        }

        /* Floating UI Badges Strategically Scattered */
        .scattered-badge {
          position: absolute;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 5;
          animation: floatOverlay 6s infinite ease-in-out;
          font-size: 12.5px;
          font-weight: 600;
          color: #e2e8f0;
          backdrop-filter: blur(8px);
        }

        @keyframes floatOverlay {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }

        /* Central Glassmorphic Authentication Card */
        .central-auth-card {
          position: relative;
          z-index: 10;
          background: rgba(10, 15, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 44px 40px;
          width: 100%;
          max-width: 460px;
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: cardEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardEntrance {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .auth-brand-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .monogram-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        .wordmark-text {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        .title-group {
          text-align: center;
        }

        .hero-title {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -1px;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .hero-subtitle {
          font-size: 14.5px;
          color: #94a3b8;
          font-weight: 500;
        }

        .welcome-back-lbl {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          text-align: center;
          margin-top: 10px;
        }

        .trust-indicator-box {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 20px;
        }

        .trust-indicator-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
        }

        /* Mobile specific styling overrides */
        @media (max-width: 640px) {
          .central-auth-card {
            padding: 32px 24px;
          }
          .workspace-backdrop {
            display: none !important;
          }
          .scattered-badge {
            display: none !important;
          }
          .hero-title {
            font-size: 26px;
          }
        }
      `}</style>

      {/* Background Lighting & Grid Layer */}
      <div className="ambient-mesh"></div>
      <div className="minimal-grid"></div>

      {/* Simulated Live Product Workspace Backdrop */}
      <div className="workspace-backdrop">
        <div className="backdrop-header">
          <span className={`backdrop-step-pill ${animationStep === 0 ? 'active' : ''}`}>INGEST (Upload)</span>
          <span className={`backdrop-step-pill ${animationStep === 1 ? 'active' : ''}`}>PARSING (OCR)</span>
          <span className={`backdrop-step-pill ${animationStep === 2 ? 'active' : ''}`}>CALIBRATION</span>
          <span className={`backdrop-step-pill ${animationStep === 3 ? 'active' : ''}`}>COMPLETED</span>
        </div>

        {/* Step 1 Backdrop */}
        {animationStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px' }}>
            <FileUp size={44} style={{ color: 'rgba(99, 91, 255, 0.4)' }} />
            <div style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '15px' }}>uploading_descriptive_answer_sheet.pdf</div>
            <div style={{ width: '300px', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ width: `${progressVal}%`, height: '100%', backgroundColor: 'rgba(99, 91, 255, 0.4)', borderRadius: '99px' }} />
            </div>
          </div>
        )}

        {/* Step 2 Backdrop */}
        {animationStep === 1 && (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div className="laser-line-anim"></div>
            <div className="backdrop-handwriting">
              Q1. Discuss the provisions of Section 96 of the Companies Act...
            </div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px', fontFamily: 'monospace', minHeight: '60px', padding: '16px', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.005)' }}>
              {typedText}
            </div>
          </div>
        )}

        {/* Step 3 Backdrop */}
        {animationStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(52, 211, 153, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} /> ICSI Guidelines Grading Verification Active
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Section 96 statutory citation quote</span>
                <span style={{ color: 'rgba(52, 211, 153, 0.5)' }}>✓ Correct (1.00 Marks)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>ROC AGM Extension gap limitations</span>
                <span style={{ color: 'rgba(245, 158, 11, 0.5)' }}>⚠ ROC Citation Missing</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Mandatory gap between consecutive AGMs</span>
                <span style={{ color: 'rgba(248, 113, 113, 0.5)' }}>✗ Omitted 15-month rule</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 Backdrop */}
        {animationStep === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', flex: 1, alignItems: 'center' }}>
            <div style={{ padding: '30px', backgroundColor: 'rgba(52, 211, 153, 0.01)', border: '1px solid rgba(52, 211, 153, 0.05)', borderRadius: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(52, 211, 153, 0.4)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Calibrated Score</span>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.3)' }}>4.25 <span style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.15)' }}>/ 5.00</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>
              <div>✓ Calibrated assessment sheet processed.</div>
              <div>✓ Key statutory provisions successfully mapped.</div>
              <div>⚠ Review final ROC timeline extension constraints.</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Badges Surrounding the Center Authentication Card */}
      <div className="scattered-badge" style={{ top: '15%', left: '8%', animationDelay: '0s' }}>
        <CheckCircle size={14} style={{ color: '#34d399' }} /> OCR Complete
      </div>
      <div className="scattered-badge" style={{ top: '22%', right: '12%', animationDelay: '1.5s' }}>
        <Cpu size={14} style={{ color: '#818cf8' }} /> Legal Provision Found
      </div>
      <div className="scattered-badge" style={{ bottom: '20%', left: '10%', animationDelay: '3s' }}>
        <Award size={14} style={{ color: '#34d399' }} /> Performance +18%
      </div>
      <div className="scattered-badge" style={{ bottom: '15%', right: '14%', animationDelay: '4.5s' }}>
        <Sparkles size={14} style={{ color: '#a78bfa' }} /> AI Feedback Ready
      </div>

      {/* Central Glassmorphic Authentication Card */}
      <div className="central-auth-card">
        {/* Brand Header */}
        <div className="auth-brand-logo">
          <img src="/logo.png" alt="Xaminix Logo" className="monogram-img" />
          <span className="wordmark-text">Xaminix</span>
        </div>

        {/* Hero Headlines */}
        <div className="title-group">
          <h1 className="hero-title">Turn practice into performance.</h1>
          <p className="hero-subtitle">Master every answer before the exam.</p>
        </div>

        {/* Action Header Label */}
        <div className="welcome-back-lbl">Welcome Back</div>

        {/* Clerk Sign In block */}
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
                display: 'none',
              },
              headerSubtitle: {
                display: 'none',
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
        <div className="trust-indicator-box">
          <div className="trust-indicator-row">
            <Lock size={13} style={{ color: '#10b981' }} />
            <span>🔒 Secure Google Authentication</span>
          </div>
          <div className="trust-indicator-row">
            <ShieldCheck size={13} style={{ color: '#3b82f6' }} />
            <span>📄 Private & Confidential Answer Sheets</span>
          </div>
          <div className="trust-indicator-row">
            <Award size={13} style={{ color: '#a78bfa' }} />
            <span>🤖 AI Examiner-Style Evaluation</span>
          </div>
          <div className="trust-indicator-row">
            <Check size={13} style={{ color: '#34d399' }} />
            <span>⚖️ Built for Professional Exams</span>
          </div>
        </div>
      </div>
    </div>
  );
}



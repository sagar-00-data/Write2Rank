'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, ShieldCheck, Lock, Award, EyeOff } from 'lucide-react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedScore((prev) => {
        if (prev >= 4.5) return 4.5;
        return Math.min(4.5, Number((prev + 0.15).toFixed(2)));
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="login-container">
      {/* CSS-in-JS style injection for custom classes and overrides */}
      <style jsx global>{`
        .login-container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          background-color: #ffffff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }

        /* Left Showcase Panel */
        .showcase-panel {
          background-color: #090d16;
          color: #ffffff;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .ambient-glow-1 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 91, 255, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
        }

        .ambient-glow-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0) 70%);
          bottom: -150px;
          right: -100px;
          pointer-events: none;
        }

        .showcase-header {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
        }

        .logo-img {
          width: 34px;
          height: 34px;
          object-fit: contain;
        }

        .brand-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.6px;
          background: linear-gradient(135deg, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase-content {
          margin: 60px 0;
          max-width: 580px;
          z-index: 10;
        }

        .badge-premium {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 91, 255, 0.12);
          border: 1px solid rgba(99, 91, 255, 0.25);
          color: #a78bfa;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .showcase-title {
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -1.2px;
          margin-bottom: 16px;
          color: #f8fafc;
        }

        .gradient-highlight {
          background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase-subtitle {
          font-size: 16.5px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        /* Highlights list */
        .highlights-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 48px;
        }

        .highlight-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-check-wrapper {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(16, 185, 129, 0.12);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .highlight-text {
          font-size: 15px;
          font-weight: 500;
          color: #e2e8f0;
        }

        /* Visual Interactive Mockup */
        .mockup-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .scan-laser-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          box-shadow: 0 0 12px #10b981;
          animation: laserMove 3.5s infinite ease-in-out;
        }

        @keyframes laserMove {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }

        .cursive-handwriting {
          font-family: 'Georgia', serif;
          font-style: italic;
          color: #93c5fd;
          font-size: 14.5px;
          line-height: 2.1;
          background: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 100% 2.1em;
          padding: 0 6px;
        }

        /* Floating Badge */
        .floating-badge {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: #6366f1;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(99, 91, 255, 0.25);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .showcase-footer {
          z-index: 10;
        }

        .metrics-grid {
          display: flex;
          gap: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 24px;
        }

        .metric-block {
          display: flex;
          flex-direction: column;
        }

        .metric-num {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
        }

        .metric-lbl {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        /* Right Panel */
        .auth-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 60px 40px;
          background-color: #f8fafc;
          position: relative;
        }

        .auth-card-container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .trust-indicator-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trust-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #475569;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
          }
          .showcase-panel {
            display: none;
          }
          .auth-panel {
            padding: 40px 20px;
          }
        }
      `}</style>

      {/* Left Showcase Brand Panel */}
      <div className="showcase-panel">
        <div className="ambient-glow-1"></div>
        <div className="ambient-glow-2"></div>

        {/* Brand Header */}
        <div className="showcase-header">
          <img src="/logo.png" alt="Xaminix Brand Monogram" className="logo-img" />
          <span className="brand-name">Xaminix</span>
        </div>

        {/* Showcase Content */}
        <div className="showcase-content">
          <div className="badge-premium">
            <Sparkles size={13} />
            <span>Calibrated Answer Evaluation</span>
          </div>

          <h1 className="showcase-title">
            Turn practice into performance: <span className="gradient-highlight">Master every answer</span> before the exam.
          </h1>

          <p className="showcase-subtitle">
            Experience the descriptive answer grader designed to elevate your performance. Align Section references, verify facts, and score higher.
          </p>

          {/* Highlights checklist */}
          <div className="highlights-container">
            {[
              'Examiner-style calibrated evaluation',
              'Handwritten answer parsing (OCR)',
              'Legal provision citation audit',
              'Instant concept metrics feedback',
              'Performance tracking roadmap'
            ].map((text, idx) => (
              <div key={idx} className="highlight-row">
                <div className="icon-check-wrapper">
                  <Check size={14} />
                </div>
                <span className="highlight-text">{text}</span>
              </div>
            ))}
          </div>

          {/* Graphical Mockup Card */}
          <div className="mockup-card">
            <div className="scan-laser-line"></div>
            <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Real-time OCR Calibration Session
            </span>
            <p className="cursive-handwriting">
              Under Section 96, every company must hold an Annual General Meeting each calendar year...
            </p>
            <div className="floating-badge">
              <Award size={16} />
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.8, display: 'block' }}>Calibrated Score</span>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{animatedScore.toFixed(2)} / 5.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Showcase Footer Metrics */}
        <div className="showcase-footer">
          <div className="metrics-grid">
            <div className="metric-block">
              <span className="metric-num">96.8%</span>
              <span className="metric-lbl">OCR Accuracy</span>
            </div>
            <div className="metric-block">
              <span className="metric-num">&lt; 60s</span>
              <span className="metric-lbl">Evaluation Time</span>
            </div>
            <div className="metric-block">
              <span className="metric-num">100%</span>
              <span className="metric-lbl">CS & Law Calibrated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Action Panel */}
      <div className="auth-panel">
        <div className="auth-card-container">
          
          {/* Clerk Auth Card */}
          <SignIn
            path="/login"
            appearance={{
              variables: {
                colorPrimary: '#2563eb', // --accent-color
                colorBackground: '#ffffff', // --bg-primary
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

          {/* Secure Trust Indicators panel below */}
          <div className="trust-indicator-card">
            <div className="trust-row">
              <Lock size={14} style={{ color: '#10b981' }} />
              <span>Secure Google Authentication & SSO</span>
            </div>
            <div className="trust-row">
              <EyeOff size={14} style={{ color: '#6366f1' }} />
              <span>Strict Privacy: Answer sheets remain 100% confidential</span>
            </div>
            <div className="trust-row">
              <ShieldCheck size={14} style={{ color: '#3b82f6' }} />
              <span>Trusted AI Answer Grading for CS Executive & Law</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

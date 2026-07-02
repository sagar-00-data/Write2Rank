'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { Sparkles, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  return (
    <div className="login-container animate-fade-in">
      {/* Left panel - Brand & Showcase */}
      <div className="login-showcase">
        <div className="showcase-content">
          <div className="showcase-header">
            <div className="showcase-logo">
              <Logo size={42} color="#ffffff" />
            </div>
            <span className="showcase-brand">Write2Rank</span>
          </div>

          <div className="showcase-hero">
            <div className="premium-badge">
              <Sparkles size={14} className="sparkle-icon" />
              <span>Next-Gen Essay Evaluation</span>
            </div>
            <h1 className="showcase-title">
              Elevate your writing to the <span className="highlight-text">highest rank</span>.
            </h1>
            <p className="showcase-subtitle">
              Powering academic excellence with deep, AI-driven assessment and comprehensive performance insights.
            </p>
          </div>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <CheckCircle2 size={18} />
              </div>
              <div className="feature-info">
                <h3>Multi-layered Scoring</h3>
                <p>Detailed analysis of coherence, grammar, and vocabulary complexity.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={18} />
              </div>
              <div className="feature-info">
                <h3>Instant Evaluation History</h3>
                <p>Secure history storage to monitor your progression and score curves.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <FileText size={18} />
              </div>
              <div className="feature-info">
                <h3>Advanced RAG Insights</h3>
                <p>Contextualized recommendations derived from high-scoring benchmarks.</p>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <div className="metrics">
              <div className="metric-item">
                <span className="metric-value">99.4%</span>
                <span className="metric-label">Grading Accuracy</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">50k+</span>
                <span className="metric-label">Essays Analyzed</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Glow decorative elements */}
        <div className="glow-1"></div>
        <div className="glow-2"></div>
      </div>

      {/* Right panel - Authentication Action using Clerk */}
      <div className="login-action-panel">
        <SignIn
          path="/login"
          appearance={{
            variables: {
              colorPrimary: '#2563eb', // --accent-color
              colorBackground: '#ffffff', // --bg-primary
              borderRadius: '12px',
              fontFamily: 'var(--font-inter), sans-serif',
            },
            elements: {
              cardBox: {
                boxShadow: 'none',
                width: '100%',
              },
              card: {
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '420px',
                background: 'var(--bg-primary)',
              },
              headerTitle: {
                fontWeight: '800',
                fontSize: '24px',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              },
              headerSubtitle: {
                color: 'var(--text-secondary)',
                fontSize: '14px',
              },
              socialButtonsBlockButton: {
                borderColor: 'var(--border-color)',
                borderRadius: '12px',
                padding: '12px 24px',
                '&:hover': {
                  background: 'var(--bg-secondary)',
                }
              },
              formButtonPrimary: {
                background: 'var(--accent-color)',
                borderRadius: '12px',
                padding: '12px',
                '&:hover': {
                  background: 'var(--accent-hover)',
                }
              },
              footerActionLink: {
                color: 'var(--accent-color)',
                '&:hover': {
                  color: 'var(--accent-hover)',
                }
              }
            }
          }}
        />
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          background: var(--bg-primary);
        }

        /* Left Panel - Showcase */
        .login-showcase {
          background: #0b0f19;
          color: #ffffff;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .showcase-content {
          max-width: 580px;
          position: relative;
          z-index: 10;
        }

        .showcase-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
        }

        .showcase-brand {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase-hero {
          margin-bottom: 48px;
        }

        .premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(37, 99, 235, 0.3);
          color: #3b82f6;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .sparkle-icon {
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }

        .showcase-title {
          font-size: 40px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
          color: #f8fafc;
        }

        .highlight-text {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .showcase-subtitle {
          font-size: 16px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 56px;
        }

        .feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .feature-icon-wrapper {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #3b82f6;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-info h3 {
          font-size: 15px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .feature-info p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.4;
        }

        .showcase-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 32px;
        }

        .metrics {
          display: flex;
          gap: 48px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .metric-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        /* Decorative ambient glow background */
        .glow-1 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(0, 0, 0, 0) 70%);
          top: -100px;
          left: -100px;
        }

        .glow-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
          bottom: -150px;
          right: -100px;
        }

        /* Right Panel - Login Card */
        .login-action-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          background: var(--bg-secondary);
        }

        /* Responsive Breakpoints */
        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
          }

          .login-showcase {
            display: none;
          }

          .login-action-panel {
            padding: 40px 20px;
          }
        }
      `}</style>
    </div>
  );
}

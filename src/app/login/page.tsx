'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { Sparkles, CheckCircle2, ShieldCheck, FileText, ArrowUpRight } from 'lucide-react';

export default function LoginPage() {
  const { user, isLoading, signInWithGoogle } = useAuth();
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

      {/* Right panel - Authentication Action */}
      <div className="login-action-panel">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo-container">
              <Logo size={56} />
            </div>
            <h2 className="login-card-title">Sign in to your account</h2>
            <p className="login-card-subtitle">Choose your authentication provider to continue</p>
          </div>

          <div className="login-card-body">
            <button 
              className="google-btn" 
              onClick={signInWithGoogle}
              disabled={isLoading}
            >
              <div className="google-icon-wrapper">
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
              </div>
              <span className="google-btn-text">
                {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>

            <div className="login-divider">
              <span>Secure OAuth2 Flow</span>
            </div>
            
            <p className="login-help-text">
              Direct connection via Supabase Authentication. We do not store or see your Google account password.
            </p>
          </div>
          
          <div className="login-card-footer">
            <span className="footer-link">Terms of Service</span>
            <span className="footer-dot">•</span>
            <span className="footer-link">Privacy Policy</span>
          </div>
        </div>
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

        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          border-radius: 24px;
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .login-card-header {
          text-align: center;
        }

        .login-logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 18px;
          border: 1px solid var(--border-color);
        }

        .login-card-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .login-card-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .login-card-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
        }

        .google-btn:hover {
          background: var(--bg-secondary);
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .google-btn:active {
          transform: translateY(0);
          box-shadow: var(--shadow-sm);
        }

        .google-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .google-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-divider {
          display: flex;
          align-items: center;
          text-align: center;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }

        .login-divider:not(:empty)::before {
          margin-right: 16px;
        }

        .login-divider:not(:empty)::after {
          margin-left: 16px;
        }

        .login-help-text {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-secondary);
          text-align: center;
        }

        .login-card-footer {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-secondary);
          border-top: 1px solid var(--border-color);
          padding-top: 24px;
        }

        .footer-link {
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .footer-link:hover {
          color: var(--accent-color);
        }

        .footer-dot {
          color: var(--border-color);
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

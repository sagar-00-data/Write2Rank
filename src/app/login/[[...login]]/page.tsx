'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, CheckCircle } from 'lucide-react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  return (
    <div className="minimal-login-container">
      {/* Global CSS Inject for minimal centered styling, soft background, and hover animations */}
      <style jsx global>{`
        .minimal-login-container {
          min-height: 100vh;
          width: 100vw;
          background-color: #030712;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        /* Subtle premium background glow */
        .glow-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 50%, #0d1527 0%, #030712 100%);
          z-index: 1;
        }

        .minimal-grid-texture {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          backgroundImage: linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
          backgroundSize: 50px 50px;
          maskImage: radial-gradient(ellipse at center, black, transparent 75%);
          pointer-events: none;
          z-index: 2;
        }

        /* Centralized Card Container */
        .login-card-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          animation: pageFadeIn 0.8s ease-out;
        }

        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Prominent Brand Logo */
        .logo-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: logoFade 1.2s ease-out;
        }

        @keyframes logoFade {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .monogram-icon {
          width: 44px;
          height: 44px;
          object-fit: contain;
        }

        .wordmark-logo {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }

        /* Headline Styling */
        .headlines-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .primary-title {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.8px;
          color: #f8fafc;
        }

        .secondary-title {
          font-size: 15px;
          color: #94a3b8;
          font-weight: 500;
          line-height: 1.5;
        }

        /* Custom clerk styles targeting Stripe/Notion like minimal white card */
        .clerk-box-container {
          width: 100%;
        }

        /* Subtle Trust Badging Panel */
        .trust-indicator-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 20px;
          align-items: center;
        }

        .trust-indicator-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
        }

        .trust-icon-colored {
          color: #475569;
        }
      `}</style>

      {/* Decorative Backdrops */}
      <div className="glow-background"></div>
      <div className="minimal-grid-texture"></div>

      {/* Centered Login Card wrapper */}
      <div className="login-card-wrapper">
        {/* Prominent Logo */}
        <div className="logo-wrapper">
          <img src="/logo.png" alt="Xaminix Logo" className="monogram-icon" />
          <span className="wordmark-logo">Xaminix</span>
        </div>

        {/* Hero Headline Group */}
        <div className="headlines-container">
          <h1 className="primary-title">Turn practice into performance.</h1>
          <p className="secondary-title">Master every answer before the exam.</p>
        </div>

        {/* Clerk Sign In component */}
        <div className="clerk-box-container">
          <SignIn
            path="/login"
            appearance={{
              variables: {
                colorPrimary: '#2563eb', // Accent color
                colorBackground: '#ffffff', // Clean white background
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              elements: {
                cardBox: {
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                  width: '100%',
                },
                card: {
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '32px',
                  width: '100%',
                  background: '#ffffff',
                },
                headerTitle: {
                  fontWeight: '800',
                  fontSize: '20px',
                  letterSpacing: '-0.5px',
                  color: '#0f172a',
                },
                headerSubtitle: {
                  color: '#64748b',
                  fontSize: '13px',
                },
                socialButtonsBlockButton: {
                  borderColor: '#e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    background: '#f8fafc',
                    borderColor: '#cbd5e1',
                  }
                },
                socialButtonsBlockButtonText: {
                  color: '#334155',
                  fontWeight: '600',
                },
                formButtonPrimary: {
                  background: '#0f172a',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: '600',
                  '&:hover': {
                    background: '#1e293b',
                  }
                },
                footerActionLink: {
                  color: '#2563eb',
                  fontWeight: '600',
                  '&:hover': {
                    color: '#1d4ed8',
                  }
                }
              }
            }}
          />
        </div>

        {/* Minimal trust indicator row underneath */}
        <div className="trust-indicator-container">
          <div className="trust-indicator-row">
            <Lock size={13} className="trust-icon-colored" />
            <span>Secure Google Authentication</span>
          </div>
          <div className="trust-indicator-row">
            <Shield size={13} className="trust-icon-colored" />
            <span>Private Answer Sheets</span>
          </div>
          <div className="trust-indicator-row">
            <CheckCircle size={13} className="trust-icon-colored" />
            <span>Built for Professional Exams</span>
          </div>
        </div>
      </div>
    </div>
  );
}



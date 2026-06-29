'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Activity, Mail } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid password.');
      } else {
        router.refresh();
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <style>{CSS_RULES}</style>

      {/* LEFT PANEL: Branded Mesh & Graphics (Hidden on Mobile) */}
      <div className="left-panel">
        <div className="mesh-gradient-bg" />
        <div className="grid-overlay" />
        
        {/* Floating Accent Glows */}
        <div className="glow-orb" style={{ top: '20%', left: '20%', width: 350, height: 350, background: 'rgba(79, 70, 229, 0.15)', filter: 'blur(100px)' }} />
        <div className="glow-orb" style={{ bottom: '20%', right: '10%', width: 300, height: 300, background: 'rgba(6, 182, 212, 0.15)', filter: 'blur(80px)' }} />

        <div className="left-content-wrapper">
          {/* Logo Brand Header */}
          <div className="brand-header">
            <div className="logo-box">
              <Activity className="logo-icon" />
            </div>
            <span className="brand-title">Write2Rank</span>
            <span className="badge-ops">Ops Hub</span>
          </div>

          {/* Value Proposition */}
          <div className="hero-text-block">
            <h1 className="hero-heading">Founder Command Center</h1>
            <p className="hero-subtext">
              Monitor your AI platform, users, evaluations, infrastructure, and business performance in real time.
            </p>
          </div>

          {/* Floating Mock Analytics Cards (Stripe/Linear style) */}
          <div className="floating-cards-container">
            <div className="mock-card card-1">
              <div className="mock-card-header">
                <span className="mock-card-label">Gemini API Pool</span>
                <span className="mock-status-pill green">99.8%</span>
              </div>
              <div className="mock-card-val">Active Rotator</div>
              <div className="mock-card-footer">5 keys online · round-robin</div>
            </div>

            <div className="mock-card card-2">
              <div className="mock-card-header">
                <span className="mock-card-label">Platform Latency</span>
                <span className="mock-status-pill purple">0.82s</span>
              </div>
              <div className="mock-card-val">System Healthy</div>
              <div className="mock-card-footer">Avg. speed down 18% vs yesterday</div>
            </div>

            <div className="mock-card card-3">
              <div className="mock-card-header">
                <span className="mock-card-label">Security Shield</span>
                <span className="mock-status-pill blue">Secure</span>
              </div>
              <div className="mock-card-val">TLS 1.3 Active</div>
              <div className="mock-card-footer">Admin session tokens fully encrypted</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Card Centered */}
      <div className="right-panel">
        <div className="login-card-wrapper animate-fade-in">
          
          {/* Mobile-only Logo */}
          <div className="mobile-logo-header">
            <div className="logo-box">
              <Activity className="logo-icon" />
            </div>
            <span className="brand-title">Write2Rank</span>
          </div>

          {/* Header */}
          <div className="login-header">
            <h2 className="login-heading">Welcome Back</h2>
            <p className="login-subtext">Sign in to access the Write2Rank Founder Command Center.</p>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle className="error-icon" />
              <span className="error-message">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field (Required by UI spec, cosmetics) */}
            <div className="form-group">
              <label className="field-label">Administrator Email</label>
              <div className="input-relative">
                <Mail className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@write2rank.com"
                  required
                  disabled={loading}
                  className="auth-input"
                />
              </div>
            </div>

            {/* Password Field (The one that actually authenticates) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="field-label" style={{ margin: 0 }}>Security Passkey</label>
                <a href="#forgot" className="helper-link" onClick={(e) => { e.preventDefault(); alert("Please verify your ADMIN_PASSWORD variable in your .env.local file."); }}>
                  Forgot Passkey?
                </a>
              </div>
              <div className="input-relative">
                <Lock className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="auth-input font-mono"
                />
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="auth-checkbox" defaultChecked />
                <span>Remember this secure device</span>
              </label>
            </div>

            {/* Login Button */}
            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? (
                <span className="spinner-loader" />
              ) : (
                <>
                  <span>Secure Sign In</span>
                  <ArrowRight className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Security badging footer inside card */}
          <div className="card-security-footer">
            <div className="security-badge">
              <ShieldCheck className="badge-icon" />
              <span>Founder Access Only</span>
            </div>
            <div className="security-badge">
              <Lock className="badge-icon" />
              <span>Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* Outer bottom links */}
        <div className="bottom-meta-links">
          <Link href="/" className="public-return-link">
            ← Return to public website
          </Link>
          <div className="portal-indicator">
            Internal Portal · End-to-end Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PREMIUM LOGIN PAGE STYLES
// ─────────────────────────────────────────────────────────────
const CSS_RULES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .login-page-container {
    min-height: 100vh;
    display: flex;
    background-color: #06080c;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #f8fafc;
    overflow: hidden;
  }

  /* --- LEFT PANEL --- */
  .left-panel {
    display: flex;
    flex-direction: column;
    width: 60%;
    position: relative;
    padding: 48px;
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    background-color: #04060a;
    overflow: hidden;
  }

  .mesh-gradient-bg {
    position: absolute;
    inset: 0;
    opacity: 0.8;
    background: radial-gradient(at 0% 0%, rgba(79, 70, 229, 0.25) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.2) 0px, transparent 50%),
                radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.15) 0px, transparent 60%);
    animation: mesh-movement 20s infinite alternate ease-in-out;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.15;
    background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .glow-orb {
    position: absolute;
    border-radius: 50%;
  }

  .left-content-wrapper {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
    justify-content: space-between;
  }

  .brand-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #4f46e5, #8b5cf6);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  .logo-icon {
    width: 20px;
    height: 20px;
    color: #ffffff;
  }

  .brand-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .badge-ops {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
    border: 1px solid rgba(167, 139, 250, 0.2);
    padding: 3px 8px;
    border-radius: 6px;
  }

  .hero-text-block {
    margin-top: 80px;
  }

  .hero-heading {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    line-height: 1.15;
    margin-bottom: 16px;
  }

  .hero-subtext {
    font-size: 15px;
    color: #94a3b8;
    line-height: 1.6;
    font-weight: 500;
  }

  .floating-cards-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 60px;
    margin-bottom: 40px;
  }

  .mock-card {
    background: rgba(9, 13, 22, 0.6);
    backdrop-blur: 16px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 14px;
    padding: 16px 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    width: 320px;
    transition: transform 0.3s ease;
  }

  .mock-card:hover {
    transform: translateX(4px);
  }

  .card-1 { align-self: flex-start; animation: float-1 6s infinite ease-in-out; }
  .card-2 { align-self: center; animation: float-2 6s infinite ease-in-out; }
  .card-3 { align-self: flex-end; animation: float-3 6s infinite ease-in-out; }

  .mock-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .mock-card-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mock-status-pill {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .mock-status-pill.green { color: #34d399; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52,211,153,0.15); }
  .mock-status-pill.purple { color: #c084fc; background: rgba(192, 132, 252, 0.08); border: 1px solid rgba(192,132,252,0.15); }
  .mock-status-pill.blue { color: #60a5fa; background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96,165,250,0.15); }

  .mock-card-val {
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 6px;
  }

  .mock-card-footer {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
  }

  /* --- RIGHT PANEL --- */
  .right-panel {
    width: 40%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 48px;
    position: relative;
  }

  .login-card-wrapper {
    width: 100%;
    max-width: 420px;
    background: linear-gradient(180deg, #090d16 0%, #070a10 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 40px;
  }

  .mobile-logo-header {
    display: none;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
    justify-content: center;
  }

  .login-header {
    margin-bottom: 32px;
  }

  .login-heading {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #ffffff;
    margin-bottom: 8px;
  }

  .login-subtext {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.5;
    font-weight: 500;
  }

  .error-banner {
    background: rgba(220, 38, 38, 0.08);
    border: 1px solid rgba(220, 38, 38, 0.25);
    padding: 12px 16px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
  }

  .error-icon {
    width: 18px;
    height: 18px;
    color: #ef4444;
    flex-shrink: 0;
  }

  .error-message {
    font-size: 12px;
    font-weight: 600;
    color: #fca5a5;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-left: 2px;
  }

  .input-relative {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 14px;
    width: 16px;
    height: 16px;
    color: #475569;
    transition: color 0.2s;
  }

  .auth-input {
    width: 100%;
    background-color: #05070a;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px 14px 12px 42px;
    font-size: 13px;
    color: #f1f5f9;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  }

  .auth-input::placeholder {
    color: #334155;
  }

  .auth-input:focus {
    border-color: rgba(79, 70, 229, 0.5);
    background-color: #06080f;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }

  .auth-input:focus ~ .input-icon {
    color: #6366f1;
  }

  .helper-link {
    font-size: 11px;
    color: #6366f1;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
  }

  .helper-link:hover {
    color: #818cf8;
  }

  .form-options {
    display: flex;
    align-items: center;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  .auth-checkbox {
    width: 16px;
    height: 16px;
    background-color: #05070a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
    accent-color: #4f46e5;
  }

  .login-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    background-color: #4f46e5;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
  }

  .login-submit-btn:hover {
    background-color: #4338ca;
    box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35);
  }

  .login-submit-btn:active {
    transform: scale(0.985);
  }

  .btn-arrow {
    width: 15px;
    height: 15px;
    transition: transform 0.2s;
  }

  .login-submit-btn:hover .btn-arrow {
    transform: translatex(2px);
  }

  .card-security-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
  }

  .security-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
  }

  .badge-icon {
    width: 12px;
    height: 12px;
    color: #475569;
  }

  .bottom-meta-links {
    width: 100%;
    max-width: 420px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    padding: 0 4px;
  }

  .public-return-link {
    font-size: 11px;
    color: #475569;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  .public-return-link:hover {
    color: #94a3b8;
  }

  .portal-indicator {
    font-size: 10px;
    color: #475569;
    font-weight: 600;
  }

  .spinner-loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: fd-spin 0.8s linear infinite;
  }

  /* --- KEYFRAME ANIMATIONS --- */
  @keyframes mesh-movement {
    0% { transform: scale(1) translate(0px, 0px); }
    50% { transform: scale(1.15) translate(20px, -20px); }
    100% { transform: scale(0.9) translate(-10px, 15px); }
  }

  @keyframes float-1 {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-8px) rotate(0.5deg); }
  }
  @keyframes float-2 {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(-0.5deg); }
  }
  @keyframes float-3 {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-6px) rotate(0.3deg); }
  }

  .animate-fade-in {
    animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- RESPONSIVE MEDIA QUERIES --- */
  @media (max-width: 1024px) {
    .left-panel { display: none; }
    .right-panel { width: 100%; padding: 24px; }
    .mobile-logo-header { display: flex; }
    .bottom-meta-links { flex-direction: column; gap: 12px; text-align: center; }
  }
`;

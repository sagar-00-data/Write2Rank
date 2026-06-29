'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Activity, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
        setSuccess(true);
        // Play brief success transition animation before redirect
        setTimeout(() => {
          router.refresh();
          router.push('/admin/dashboard');
        }, 800);
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`login-page-container ${success ? 'access-granted' : ''}`}>
      <style>{CSS_RULES}</style>

      {/* LEFT PANEL: Restricted Access / Terminal Interface */}
      <div className="left-panel">
        <div className="mesh-gradient-bg" />
        <div className="grid-overlay" />
        
        {/* Subtle glowing military-grade indicators */}
        <div className="glow-orb" style={{ top: '15%', left: '15%', width: 450, height: 450, background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(120px)' }} />
        <div className="glow-orb" style={{ bottom: '15%', right: '5%', width: 350, height: 350, background: 'rgba(30, 58, 138, 0.12)', filter: 'blur(100px)' }} />

        <div className="left-content-wrapper">
          {/* Logo Header */}
          <div className="brand-header">
            <div className="logo-box">
              <Activity className="logo-icon" />
            </div>
            <span className="brand-title">Write2Rank</span>
            <span className="badge-ops">Restricted Console</span>
          </div>

          {/* Console Heading */}
          <div className="hero-text-block">
            <div className="clearance-tag">RESTRICTED EXECUTIVE ACCESS</div>
            <h1 className="hero-heading">Founder Command Center</h1>
            <p className="hero-subtext">
              Restricted access to the operational intelligence platform powering Write2Rank.
            </p>
          </div>

          {/* Status Chips - Clean, Modern, Minimal (Aesthetic Indicators) */}
          <div className="status-chips-panel">
            <div className="status-chip">
              <span className="chip-dot emerald" />
              <span className="chip-label">AI Infrastructure Online</span>
            </div>
            <div className="status-chip">
              <span className="chip-dot emerald" />
              <span className="chip-label">OCR Engine Ready</span>
            </div>
            <div className="status-chip">
              <span className="chip-dot emerald" />
              <span className="chip-label">Knowledge Base Synced</span>
            </div>
            <div className="status-chip">
              <span className="chip-dot emerald" />
              <span className="chip-label">Secure Connection Established</span>
            </div>
            <div className="status-chip">
              <span className="chip-dot blue" />
              <span className="chip-label">Production Environment Active</span>
            </div>
          </div>

          {/* Security details bottom left */}
          <div className="security-terminal-specs">
            <div className="spec-line"><span className="spec-key">SYSTEM STATE:</span> <span className="spec-val text-emerald">SECURED</span></div>
            <div className="spec-line"><span className="spec-key">NODE ACCESS:</span> <span className="spec-val">ADMIN_PRIMARY</span></div>
            <div className="spec-line"><span className="spec-key">AUTH METHOD:</span> <span className="spec-val">FOUNDER_PASSPHRASE</span></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Secure Authentication */}
      <div className="right-panel">
        <div className="login-card-wrapper animate-fade-in">
          
          {/* Mobile-only Logo */}
          <div className="mobile-logo-header">
            <div className="logo-box">
              <Activity className="logo-icon" />
            </div>
            <span className="brand-title">Write2Rank</span>
          </div>

          {/* Heading */}
          <div className="login-header">
            <h2 className="login-heading">Founder Access</h2>
            <p className="login-subtext">Restricted internal access. Authorized personnel only.</p>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle className="error-icon" />
              <span className="error-message">{error}</span>
            </div>
          )}

          {/* Password Authentication Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="field-label">Enter Founder Passphrase</label>
              <div className="input-relative">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  required
                  disabled={loading || success}
                  className="auth-input font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="show-hide-toggle"
                  disabled={loading || success}
                  title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassword ? <EyeOff className="toggle-icon" /> : <Eye className="toggle-icon" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || success || !password.trim()}
              className={`login-submit-btn ${success ? 'btn-success' : ''}`}
            >
              {success ? (
                <span>Access Granted</span>
              ) : loading ? (
                <span className="spinner-loader" />
              ) : (
                <>
                  <span>Unlock Command Center</span>
                  <ArrowRight className="btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Security clearance indicators inside the card */}
          <div className="card-security-footer">
            <div className="security-stat-column">
              <div className="stat-label">SECURITY CLEARANCE</div>
              <div className="stat-value text-blue">FOUNDER</div>
            </div>
            <div className="security-stat-column">
              <div className="stat-label">ACCESS LEVEL</div>
              <div className="stat-value text-red">RESTRICTED</div>
            </div>
          </div>
        </div>

        {/* Outer bottom metadata links */}
        <div className="bottom-meta-links">
          <Link href="/" className="public-return-link">
            ← Exit console to public site
          </Link>
          <div className="portal-indicator">
            256-BIT ENCRYPTED SESSION
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MILITARY / OPERATIONS TERMINAL THEME
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
    transition: filter 0.6s ease;
  }

  .login-page-container.access-granted {
    filter: brightness(1.2) contrast(1.1);
  }

  /* --- LEFT PANEL: Classified Operations Room --- */
  .left-panel {
    display: flex;
    flex-direction: column;
    width: 60%;
    position: relative;
    padding: 64px;
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    background-color: #040508;
    overflow: hidden;
  }

  .mesh-gradient-bg {
    position: absolute;
    inset: 0;
    opacity: 0.7;
    background: radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.25) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(15, 23, 42, 0.3) 0px, transparent 50%),
                radial-gradient(at 50% 50%, rgba(37, 99, 235, 0.06) 0px, transparent 60%);
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 50px 50px;
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
    max-width: 580px;
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
    width: 36px;
    height: 36px;
    background: #090d16;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .logo-icon {
    width: 18px;
    height: 18px;
    color: #3b82f6;
  }

  .brand-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .badge-ops {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 3px 8px;
    border-radius: 6px;
  }

  .clearance-tag {
    font-size: 9px;
    font-weight: 700;
    color: #3b82f6;
    letter-spacing: 0.15em;
    margin-bottom: 12px;
    text-transform: uppercase;
  }

  .hero-heading {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    line-height: 1.2;
    margin-bottom: 14px;
  }

  .hero-subtext {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    font-weight: 500;
  }

  /* --- Minimal Status Chips --- */
  .status-chips-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 40px 0;
  }

  .status-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    width: fit-content;
  }

  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .chip-dot.emerald { background-color: #059669; box-shadow: 0 0 6px rgba(5,150,105,0.6); }
  .chip-dot.blue { background-color: #2563eb; box-shadow: 0 0 6px rgba(37,99,235,0.6); }

  .chip-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.02em;
  }

  .security-terminal-specs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: monospace;
    font-size: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    padding-top: 16px;
  }

  .spec-line {
    display: flex;
    gap: 8px;
  }

  .spec-key { color: #475569; }
  .spec-val { color: #94a3b8; }
  .spec-val.text-emerald { color: #34d399; }

  /* --- RIGHT PANEL: Private Login form --- */
  .right-panel {
    width: 40%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 64px;
    position: relative;
    background-color: #06080c;
  }

  .login-card-wrapper {
    width: 100%;
    max-width: 400px;
    background: linear-gradient(180deg, #090d16 0%, #070a10 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    padding: 36px;
    transition: transform 0.4s ease, border-color 0.4s ease;
  }

  .login-page-container.access-granted .login-card-wrapper {
    transform: scale(0.98);
    border-color: rgba(52, 211, 153, 0.3);
  }

  .mobile-logo-header {
    display: none;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
    justify-content: center;
  }

  .login-header {
    margin-bottom: 28px;
    border-left: 2px solid #2563eb;
    padding-left: 14px;
  }

  .login-heading {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
    margin-bottom: 6px;
  }

  .login-subtext {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    font-weight: 500;
  }

  .error-banner {
    background: rgba(220, 38, 38, 0.06);
    border: 1px solid rgba(220, 38, 38, 0.2);
    padding: 10px 14px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .error-icon {
    width: 16px;
    height: 16px;
    color: #ef4444;
    flex-shrink: 0;
  }

  .error-message {
    font-size: 11px;
    font-weight: 600;
    color: #fca5a5;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-label {
    font-size: 9px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .input-relative {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 14px;
    width: 15px;
    height: 15px;
    color: #475569;
    transition: color 0.2s;
  }

  .auth-input {
    width: 100%;
    background-color: #040609;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    padding: 12px 42px 12px 40px;
    font-size: 13px;
    color: #f1f5f9;
    outline: none;
    letter-spacing: 0.1em;
    transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  }

  .auth-input::placeholder {
    color: #1e293b;
    letter-spacing: 0px;
  }

  .auth-input:focus {
    border-color: rgba(37, 99, 235, 0.4);
    background-color: #05070c;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .auth-input:focus ~ .input-icon {
    color: #3b82f6;
  }

  .show-hide-toggle {
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
  }

  .toggle-icon {
    width: 15px;
    height: 15px;
    color: #475569;
    transition: color 0.2s;
  }

  .show-hide-toggle:hover .toggle-icon {
    color: #94a3b8;
  }

  .login-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px;
    background-color: #2563eb;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
  }

  .login-submit-btn:hover {
    background-color: #1d4ed8;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  }

  .login-submit-btn:active {
    transform: scale(0.99);
  }

  .login-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .login-submit-btn.btn-success {
    background-color: #059669;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 16px rgba(5, 150, 105, 0.3);
  }

  .btn-arrow {
    width: 14px;
    height: 14px;
    transition: transform 0.2s;
  }

  .login-submit-btn:hover .btn-arrow {
    transform: translateX(2px);
  }

  .card-security-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }

  .security-stat-column {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    letter-spacing: 0.06em;
  }

  .stat-value {
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .stat-value.text-blue { color: #60a5fa; }
  .stat-value.text-red { color: #f87171; }

  .bottom-meta-links {
    width: 100%;
    max-width: 400px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
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
    font-size: 9px;
    color: #475569;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .spinner-loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: fd-spin 0.8s linear infinite;
  }

  .animate-fade-in {
    animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* --- RESPONSIVE MEDIA QUERIES --- */
  @media (max-width: 1024px) {
    .left-panel { display: none; }
    .right-panel { width: 100%; padding: 24px; }
    .mobile-logo-header { display: flex; }
    .bottom-meta-links { flex-direction: column; gap: 12px; text-align: center; }
  }
`;

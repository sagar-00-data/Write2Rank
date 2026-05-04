'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, ArrowRight, Github, Globe } from 'lucide-react';

export default function LoginPage() {
  const [method, setMethod] = useState<'initial' | 'email' | 'phone'>('initial');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // For now, we store a mock session in localStorage
      localStorage.setItem('w2r_session', JSON.stringify({ id: 'user_123', isNew: true }));
      router.push('/onboarding');
    }, 1500);
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo">W2R</div>
          <h1>Welcome to Write2Rank</h1>
          <p>The AI evaluator for professional students</p>
        </div>

        {method === 'initial' && (
          <div className="login-options">
            <button className="auth-btn google" onClick={handleMockLogin}>
              <Globe size={20} />
              <span>Continue with Google</span>
            </button>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="auth-grid">
              <button className="auth-btn secondary" onClick={() => setMethod('email')}>
                <Mail size={20} />
                <span>Email</span>
              </button>
              <button className="auth-btn secondary" onClick={() => setMethod('phone')}>
                <Phone size={20} />
                <span>Phone</span>
              </button>
            </div>
          </div>
        )}

        {(method === 'email' || method === 'phone') && (
          <form className="otp-form animate-slide-up" onSubmit={handleMockLogin}>
            <div className="input-group">
              <label>{method === 'email' ? 'Email Address' : 'Phone Number'}</label>
              <input 
                type={method === 'email' ? 'email' : 'tel'} 
                placeholder={method === 'email' ? 'name@example.com' : '+91 0000000000'}
                required 
                autoFocus
              />
            </div>
            <button type="submit" className="btn primary-btn w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
              {!loading && <ArrowRight size={18} />}
            </button>
            <button type="button" className="btn-link" onClick={() => setMethod('initial')}>
              Go back
            </button>
          </form>
        )}

        <p className="login-footer">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 20px;
        }
        .login-card {
          background: white;
          width: 100%;
          max-width: 400px;
          padding: 40px 32px;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-logo {
          width: 48px;
          height: 48px;
          background: #2563eb;
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          margin: 0 auto 16px;
        }
        h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
        p { color: #64748b; font-size: 15px; }
        
        .auth-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
          color: #0f172a;
        }
        .auth-btn:hover { background: #f1f5f9; transform: translateY(-1px); }
        .auth-btn.google { background: #111; color: white; border: none; margin-bottom: 12px; }
        .auth-btn.google:hover { background: #000; }
        
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 500;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }
        .divider span { padding: 0 12px; }
        
        .auth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .input-group input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 15px;
          transition: border-color 0.2s;
        }
        .input-group input:focus { outline: none; border-color: #2563eb; }
        
        .w-full { width: 100%; justify-content: center; padding: 14px; }
        
        .btn-link {
          display: block;
          margin: 16px auto 0;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          font-size: 14px;
        }
        .login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          line-height: 1.5;
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

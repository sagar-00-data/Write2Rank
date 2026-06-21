'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth
    setTimeout(() => {
      localStorage.setItem('w2r_user', JSON.stringify({ email, name: 'Student' }));
      router.push('/');
    }, 1500);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            backgroundColor: 'var(--accent-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: '0 10px 30px rgba(0, 122, 255, 0.3)'
          }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue to Write2Rank</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '15px'
                }} 
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600 }}>Password</label>
                <Link href="#" style={{ fontSize: '13px', color: 'var(--accent-color)' }}>Forgot password?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '15px'
                }} 
              />
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={isLoading}
              style={{ width: '100%', padding: '14px', justifyContent: 'center' }}
            >
              {isLoading ? 'Signing in...' : (
                <>
                  <LogIn size={18} style={{ marginRight: '8px' }} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or continue with</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              <User size={18} style={{ marginRight: '8px' }} />
              Github
            </button>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              <Mail size={18} style={{ marginRight: '8px' }} />
              Google
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link href="#" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}

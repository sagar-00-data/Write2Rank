'use client';
import { CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <CreditCard size={40} color="var(--accent-color)" />
      </div>
      
      <h1 className="page-title" style={{ fontSize: '32px', marginBottom: '16px' }}>Subscription Plans</h1>
      <p className="page-desc" style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '16px', lineHeight: 1.6 }}>
        Premium plans with increased evaluation limits and advanced AI models are coming soon. 
        <br /><br />
        During the beta period, all users have access to the Free Beta tier.
      </p>

      <button className="btn primary-btn" style={{ marginTop: '32px' }} onClick={() => window.history.back()}>
        Go Back
      </button>
    </div>
  );
}

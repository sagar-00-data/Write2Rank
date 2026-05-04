'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, User, BookOpen, GraduationCap, ArrowRight, Loader } from 'lucide-react';

const COURSE_DATA: Record<string, string[]> = {
  'CA': ['CA Foundation', 'CA Inter', 'CA Final'],
  'CS': ['CSEET', 'CS Executive', 'CS Professional'],
  'CMA': ['CMA Foundation', 'CMA Inter', 'CMA Final']
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    level: ''
  });

  // Pre-fill if mock session exists
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('w2r_session') || '{}');
    if (session.email) setFormData(prev => ({ ...prev, email: session.email }));
    if (session.phone) setFormData(prev => ({ ...prev, phone: session.phone }));
  }, []);

  const handleCourseSelect = (course: string) => {
    setFormData({ ...formData, course, level: '' }); // Reset level when course changes
  };

  const handleComplete = async () => {
    setLoading(true);
    // Simulate API saving to "Database"
    setTimeout(() => {
      localStorage.setItem('w2r_user_profile', JSON.stringify(formData));
      localStorage.setItem('w2r_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('w2r_session') || '{}'), isNew: false }));
      router.push('/');
    }, 2000);
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card animate-fade-in">
        
        {/* Progress Bar */}
        <div className="progress-bar">
          <div className={`segment ${step >= 1 ? 'active' : ''}`} />
          <div className={`segment ${step >= 2 ? 'active' : ''}`} />
          <div className={`segment ${step >= 3 ? 'active' : ''}`} />
        </div>

        {step === 1 && (
          <div className="step animate-slide-in">
            <div className="step-header">
              <div className="step-icon"><User size={24} /></div>
              <h2>Basic Information</h2>
              <p>Let's get to know you better</p>
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                className="onboard-input"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="onboard-input"
                disabled={!!formData.email}
              />
            </div>
            <button 
              className="btn primary-btn w-full mt-8" 
              disabled={!formData.name}
              onClick={() => setStep(2)}
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="step animate-slide-in">
            <div className="step-header">
              <div className="step-icon"><BookOpen size={24} /></div>
              <h2>Select Your Course</h2>
              <p>Which professional exam are you preparing for?</p>
            </div>
            <div className="selection-grid">
              {Object.keys(COURSE_DATA).map(course => (
                <div 
                  key={course}
                  className={`selection-card ${formData.course === course ? 'selected' : ''}`}
                  onClick={() => handleCourseSelect(course)}
                >
                  <div className="check-box">
                    {formData.course === course && <Check size={14} />}
                  </div>
                  <span className="course-name">{course}</span>
                  <span className="course-desc">
                    {course === 'CA' ? 'Chartered Accountancy' : course === 'CS' ? 'Company Secretary' : 'Cost & Mgmt Accountant'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="btn btn-outline flex-1" onClick={() => setStep(1)}>Back</button>
              <button 
                className="btn primary-btn flex-1" 
                disabled={!formData.course}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step animate-slide-in">
            <div className="step-header">
              <div className="step-icon"><GraduationCap size={24} /></div>
              <h2>Current Level</h2>
              <p>Select your current stage in {formData.course}</p>
            </div>
            <div className="level-list">
              {COURSE_DATA[formData.course]?.map(level => (
                <div 
                  key={level}
                  className={`level-item ${formData.level === level ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, level})}
                >
                  <span>{level}</span>
                  <div className={`radio ${formData.level === level ? 'active' : ''}`} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="btn btn-outline flex-1" onClick={() => setStep(2)}>Back</button>
              <button 
                className="btn primary-btn flex-1" 
                disabled={!formData.level || loading}
                onClick={handleComplete}
              >
                {loading ? <Loader className="animate-spin" /> : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .onboard-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          padding: 20px;
        }
        .onboard-card {
          background: white;
          width: 100%;
          max-width: 480px;
          padding: 48px 40px;
          border-radius: 28px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          border: 1px solid var(--border-color);
          position: relative;
        }
        .progress-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 40px;
        }
        .segment {
          flex: 1;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          transition: background 0.3s;
        }
        .segment.active { background: var(--accent-color); }

        .step-header { text-align: center; margin-bottom: 32px; }
        .step-icon {
          width: 56px;
          height: 56px;
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-color);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        h2 { font-size: 24px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
        p { color: var(--text-secondary); font-size: 15px; }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .onboard-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          font-size: 16px;
        }
        .onboard-input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }

        .selection-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .selection-card {
          padding: 16px 20px;
          border-radius: 16px;
          border: 2px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .selection-card:hover { border-color: var(--accent-color); background: rgba(37, 99, 235, 0.02); }
        .selection-card.selected { border-color: var(--accent-color); background: rgba(37, 99, 235, 0.05); }
        
        .check-box {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .selected .check-box { background: var(--accent-color); border-color: var(--accent-color); }

        .course-name { font-weight: 800; font-size: 18px; margin-bottom: 4px; }
        .course-desc { font-size: 13px; color: var(--text-secondary); }

        .level-list { display: flex; flex-direction: column; gap: 10px; }
        .level-item {
          padding: 16px 20px;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
        }
        .level-item:hover { background: var(--bg-tertiary); }
        .level-item.selected { border-color: var(--accent-color); color: var(--accent-color); font-weight: 700; }
        
        .radio { width: 18px; height: 18px; border: 2px solid var(--border-color); border-radius: 50%; }
        .radio.active { border-color: var(--accent-color); background: radial-gradient(circle, var(--accent-color) 40%, transparent 40%); }

        .w-full { width: 100%; justify-content: center; padding: 16px; }
        .mt-8 { margin-top: 32px; }
        .flex-1 { flex: 1; justify-content: center; }

        .animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

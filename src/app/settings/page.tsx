'use client';
import { useState, useEffect } from 'react';
import { User, BookOpen, GraduationCap, Edit2, Save, X, CheckCircle2, Mail, Phone } from 'lucide-react';

const COURSE_DATA: Record<string, string[]> = {
  'CA': ['CA Foundation', 'CA Inter', 'CA Final'],
  'CS': ['CSEET', 'CS Executive', 'CS Professional'],
  'CMA': ['CMA Foundation', 'CMA Inter', 'CMA Final']
};

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    level: ''
  });

  const [editForm, setEditForm] = useState({...profile});

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem('w2r_user_profile') || '{}');
    setTimeout(() => {
      setProfile(savedProfile);
      setEditForm(savedProfile);
    }, 0);
  }, []);

  const handleSave = () => {
    localStorage.setItem('w2r_user_profile', JSON.stringify(editForm));
    setProfile(editForm);
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="settings-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-desc">Manage your personal information and academic track.</p>
      </div>

      {showSuccess && (
        <div className="success-toast animate-slide-up">
          <CheckCircle2 size={18} />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="card profile-main">
          <div className="profile-avatar-large">
            {profile.name?.charAt(0) || <User />}
          </div>
          <div className="profile-info">
            <h2>{profile.name || 'Student Name'}</h2>
            <div className="profile-badges">
              <span className="badge course">{profile.course || 'Course'}</span>
              <span className="badge level">{profile.level || 'Level'}</span>
            </div>
          </div>
          <button className="btn btn-outline edit-btn" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>

        {/* Detailed Info */}
        <div className="settings-details">
          <div className="card info-card">
            <h3 className="section-title">Academic Information</h3>
            <div className="info-row">
              <div className="info-icon"><BookOpen size={18} /></div>
              <div className="info-content">
                <label>Current Course</label>
                <p>{profile.course || 'Not Selected'}</p>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon"><GraduationCap size={18} /></div>
              <div className="info-content">
                <label>Current Level</label>
                <p>{profile.level || 'Not Selected'}</p>
              </div>
            </div>
          </div>

          <div className="card info-card">
            <h3 className="section-title">Contact Information</h3>
            <div className="info-row">
              <div className="info-icon"><Mail size={18} /></div>
              <div className="info-content">
                <label>Email Address</label>
                <p>{profile.email || 'Not Provided'}</p>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon"><Phone size={18} /></div>
              <div className="info-content">
                <label>Phone Number</label>
                <p>{profile.phone || 'Not Provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="close-modal" onClick={() => setIsEditing(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Course</label>
                <select 
                  value={editForm.course} 
                  onChange={e => setEditForm({...editForm, course: e.target.value, level: ''})}
                  className="modal-input"
                >
                  <option value="">Select Course</option>
                  <option value="CA">Chartered Accountancy (CA)</option>
                  <option value="CS">Company Secretary (CS)</option>
                  <option value="CMA">Cost & Management Accountant (CMA)</option>
                </select>
              </div>

              {editForm.course && (
                <div className="form-group">
                  <label>Level</label>
                  <select 
                    value={editForm.level} 
                    onChange={e => setEditForm({...editForm, level: e.target.value})}
                    className="modal-input"
                  >
                    <option value="">Select Level</option>
                    {COURSE_DATA[editForm.course].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn primary-btn" onClick={handleSave}>
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-header { margin-bottom: 32px; }
        .page-desc { color: var(--text-secondary); margin-top: 4px; }
        
        .success-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          background: var(--success-color);
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          z-index: 2000;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 32px;
          align-items: start;
        }

        .profile-main {
          text-align: center;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .profile-avatar-large {
          width: 96px;
          height: 96px;
          background: linear-gradient(135deg, var(--accent-color), #6366f1);
          color: white;
          border-radius: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.2);
        }

        .profile-info h2 { font-size: 22px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em; }
        .profile-badges { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; }
        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.course { background: rgba(37, 99, 235, 0.1); color: var(--accent-color); }
        .badge.level { background: #f1f5f9; color: var(--text-secondary); }

        .edit-btn { width: 100%; justify-content: center; font-size: 14px; }

        .settings-details { display: flex; flex-direction: column; gap: 24px; }
        .section-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
        
        .info-row {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .info-row:last-child { border-bottom: none; }
        .info-icon {
          width: 36px;
          height: 36px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        .info-content label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 2px; }
        .info-content p { font-size: 15px; font-weight: 500; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          width: 100%;
          max-width: 480px;
          border-radius: 24px;
          overflow: hidden;
        }
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-body { padding: 24px; }
        .modal-footer {
          padding: 20px 24px;
          background: #f8fafc;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .modal-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          font-size: 15px;
          margin-top: 8px;
        }
        .close-modal { background: none; border: none; cursor: pointer; color: var(--text-secondary); }

        @media (max-width: 1024px) {
          .settings-grid { grid-template-columns: 1fr; }
          .profile-main { width: 100%; }
        }
      `}</style>
    </div>
  );
}

'use client';
import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiveFeedback: () => void;
}

export default function FeedbackModal({ isOpen, onClose, onGiveFeedback }: FeedbackModalProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small timeout to trigger transition
      const t = setTimeout(() => {
        setAnimationClass('modal-open');
      }, 10);
      return () => clearTimeout(t);
    } else {
      setAnimationClass('');
      const t = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Wait for transition to complete
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`feedback-modal-overlay ${animationClass}`} onClick={onClose}>
      <div 
        className="feedback-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="feedback-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="feedback-modal-icon-container">
          <div className="feedback-modal-icon">
            <Sparkles size={24} color="#2563eb" />
          </div>
        </div>

        <h3 className="feedback-modal-title">💙 Help us improve Xaminix</h3>
        
        <p className="feedback-modal-description">
          Your feedback helps us improve OCR accuracy, AI evaluation quality, and the overall experience.
          It only takes about 2 minutes.
        </p>

        <p className="feedback-modal-note">
          Your responses are anonymous and help shape future updates.
        </p>

        <div className="feedback-modal-actions">
          <button className="feedback-modal-btn feedback-modal-btn-primary" onClick={onGiveFeedback}>
            Give Feedback
          </button>
          <button className="feedback-modal-btn feedback-modal-btn-secondary" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>

      <style>{`
        .feedback-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feedback-modal-overlay.modal-open {
          opacity: 1;
        }

        .feedback-modal-content {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 32px;
          width: 90%;
          max-width: 440px;
          box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.15);
          position: relative;
          text-align: center;
          transform: scale(0.9) translateY(10px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feedback-modal-overlay.modal-open .feedback-modal-content {
          transform: scale(1) translateY(0);
        }

        .feedback-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #f1f5f9;
          border: none;
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, color 0.2s;
        }

        .feedback-modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .feedback-modal-icon-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .feedback-modal-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(37, 99, 235, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feedback-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }

        .feedback-modal-description {
          font-size: 14.5px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .feedback-modal-note {
          font-size: 12.5px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          padding: 8px 16px;
          border-radius: 10px;
          margin: 0 0 24px 0;
          line-height: 1.4;
        }

        .feedback-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .feedback-modal-btn {
          width: 100%;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feedback-modal-btn-primary {
          background: #2563eb;
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
        }

        .feedback-modal-btn-primary:hover {
          background: #1d4ed8;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }

        .feedback-modal-btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .feedback-modal-btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

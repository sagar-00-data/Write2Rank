'use client';
import { BookOpen, FileText, Upload, Brain, CheckCircle, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    question: 'How does the AI evaluation work?',
    answer: 'Write2Rank uses Google\'s Gemini AI engine to analyze your handwritten exam answers. First, our OCR (Optical Character Recognition) extracts text from your uploaded images or PDFs. Then, the AI evaluates your answers against professional exam standards, awarding marks and providing detailed feedback.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'You can upload images (JPG, PNG, WebP) or PDF files. For best OCR accuracy, ensure the images are clear, well-lit, and the handwriting is legible.',
  },
  {
    question: 'How accurate is the handwriting recognition?',
    answer: 'Our Gemini Vision-powered OCR is highly accurate for standard handwriting. For very messy or unclear handwriting, you can manually edit the extracted text before evaluation, or use Google Docs (Open with Google Docs) for even better accuracy.',
  },
  {
    question: 'What exams does Write2Rank support?',
    answer: 'Currently, Write2Rank supports CS Executive (Company Law, JIGL), CA Final (Financial Reporting), CA Inter (Corporate Law), and CMA Final (SFM). More exam types are being added regularly.',
  },
  {
    question: 'Is my data stored securely?',
    answer: 'Your evaluations are stored locally in your browser. We do not store your files or personal data on any external servers. You can clear your evaluation history at any time from the Evaluations page.',
  },
  {
    question: 'How are scores calculated?',
    answer: 'The AI evaluates your answers based on accuracy, legal/professional terminology, structure, and completeness. Scores are awarded out of 100, with a detailed question-wise breakdown and actionable feedback.',
  },
];

const TIPS = [
  { icon: Upload, title: 'Upload Clear Images', desc: 'Ensure good lighting and focus when photographing your answer sheets. Blurry images reduce OCR accuracy.' },
  { icon: FileText, title: 'Include Question Paper', desc: 'Uploading the question paper alongside your answers helps the AI understand the context and grade more accurately.' },
  { icon: Brain, title: 'Use the Improve Text Feature', desc: 'After OCR extraction, use the "Improve Text" button to clean up any garbled words before evaluation.' },
  { icon: CheckCircle, title: 'Review Before Submitting', desc: 'Always review the extracted text in Step 2. You can manually correct any errors before running the AI evaluation.' },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title">Help & Support</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Learn how to get the most out of Write2Rank.</p>

      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BookOpen size={20} color="var(--accent-color)" />
          Quick Start Guide
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Upload your documents</strong> — Go to New Evaluation and upload your answer sheet (required) and question paper (optional).</li>
          <li style={{ marginBottom: '8px' }}><strong>Extract text</strong> — Click &ldquo;Start Extraction&rdquo; to let Gemini Vision read your handwriting.</li>
          <li style={{ marginBottom: '8px' }}><strong>Review &amp; edit</strong> — Check the extracted text and make any corrections. Use &ldquo;Improve Text&rdquo; for auto-cleanup.</li>
          <li style={{ marginBottom: '8px' }}><strong>Evaluate</strong> — Click &ldquo;Evaluate Answer&rdquo; to get your AI-powered score and feedback.</li>
          <li><strong>View results</strong> — See your detailed breakdown, strengths, and areas for improvement.</li>
        </ol>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '32px 0 16px' }}>Tips for Best Results</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {TIPS.map((tip, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <tip.icon size={20} color="var(--accent-color)" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{tip.title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{tip.desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '32px 0 16px' }}>Frequently Asked Questions</h2>
      <div className="card" style={{ padding: '0' }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
            <button
              onClick={() => toggleFaq(i)}
              style={{ width: '100%', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '15px', fontWeight: 600 }}
            >
              {faq.question}
              {openFaq === i ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
            </button>
            {openFaq === i && (
              <div style={{ padding: '0 24px 20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '32px', textAlign: 'center', padding: '40px' }}>
        <Mail size={32} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
        <h3 style={{ marginBottom: '8px' }}>Still need help?</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Contact us for support and we&rsquo;ll get back to you as soon as possible.</p>
        <a href="mailto:support@write2rank.com" className="btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
          <Mail size={16} />
          Contact Support
        </a>
      </div>
    </div>
  );
}

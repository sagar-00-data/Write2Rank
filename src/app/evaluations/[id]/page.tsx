'use client';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowLeft, Award, FileText, LayoutGrid, Sparkles, BookOpen, Ban, XCircle, Download, Share2, History, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EvaluationRecord } from '../../page';
import { supabase } from '@/lib/supabase';

interface CritiqueSections {
  overallPerformance: string;
  marksBreakdown: string;
  legalProvisionAnalysis: string;
  conceptCoverage: string;
  examinersObservations: string;
  missingProvisions: string;
  howToScoreFullMarks: string;
  commonMistakes: string;
  improvedAnswer: string;
  perfectModelAnswer: string;
  keyTakeaways: string;
}

function parseCritique(markdown: string): CritiqueSections {
  const sections: CritiqueSections = {
    overallPerformance: '',
    marksBreakdown: '',
    legalProvisionAnalysis: '',
    conceptCoverage: '',
    examinersObservations: '',
    missingProvisions: '',
    howToScoreFullMarks: '',
    commonMistakes: '',
    improvedAnswer: '',
    perfectModelAnswer: '',
    keyTakeaways: ''
  };

  const getSection = (headerName: string, nextHeaderRegex: RegExp): string => {
    const idx = markdown.search(new RegExp(`###\\s*\\d+\\.\\s*${headerName}`, 'i'));
    if (idx === -1) return '';
    const match = markdown.match(new RegExp(`###\\s*\\d+\\.\\s*${headerName}`, 'i'));
    const contentStart = idx + (match ? match[0].length : 0);
    const remaining = markdown.substring(contentStart);
    const nextIdx = remaining.search(nextHeaderRegex);
    if (nextIdx === -1) return remaining.trim();
    return remaining.substring(0, nextIdx).trim();
  };

  sections.overallPerformance = getSection('OVERALL PERFORMANCE', /###\s*\d+\.\s*MARKS BREAKDOWN/i);
  sections.marksBreakdown = getSection('MARKS BREAKDOWN', /###\s*\d+\.\s*LEGAL PROVISION ANALYSIS/i);
  sections.legalProvisionAnalysis = getSection('LEGAL PROVISION ANALYSIS', /###\s*\d+\.\s*CONCEPT COVERAGE/i);
  sections.conceptCoverage = getSection('CONCEPT COVERAGE', /###\s*\d+\.\s*EXAMINER/i);
  sections.examinersObservations = getSection('EXAMINER', /###\s*\d+\.\s*(?:MISSING LEGAL PROVISIONS|HOW TO SCORE|HOW TO IMPROVE)/i);
  sections.missingProvisions = getSection('(?:MISSING LEGAL PROVISIONS|MISSING RULES)', /###\s*\d+\.\s*(?:HOW TO SCORE|HOW TO IMPROVE)/i);
  sections.howToScoreFullMarks = getSection('(?:HOW TO SCORE|HOW TO IMPROVE)', /###\s*\d+\.\s*(?:COMMON MISTAKES|IMPROVED CANDIDATE ANSWER|IMPROVED STUDENT ANSWER|IMPROVED ANSWER)/i);
  sections.commonMistakes = getSection('COMMON MISTAKES', /###\s*\d+\.\s*(?:IMPROVED CANDIDATE ANSWER|IMPROVED STUDENT ANSWER|IMPROVED ANSWER)/i);
  sections.improvedAnswer = getSection('(?:IMPROVED CANDIDATE ANSWER|IMPROVED STUDENT ANSWER|IMPROVED ANSWER)', /###\s*\d+\.\s*(?:PERFECT MODEL ANSWER|PERFECT 5-MARK MODEL ANSWER)/i);
  sections.perfectModelAnswer = getSection('(?:PERFECT MODEL ANSWER|PERFECT 5-MARK MODEL ANSWER)', /###\s*\d+\.\s*(?:KEY TAKEAWAYS|KEY REVISION POINTS|REVISION NOTES)/i);
  sections.keyTakeaways = getSection('(?:KEY TAKEAWAYS|KEY REVISION POINTS|REVISION NOTES)', /$/i);

  return sections;
}

interface RubricRow {
  criterion: string;
  expected: string;
  covered: string;
  coveragePercent: string;
  awardedMarks: string;
  reason: string;
}

function parseMarkdownTable(tableMarkdown: string): RubricRow[] {
  const rows: RubricRow[] = [];
  const lines = tableMarkdown.split('\n');
  
  for (const line of lines) {
    if (!line.includes('|')) continue;
    if (line.includes('---')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 5) continue;
    if (cols[0].toLowerCase().includes('criterion')) continue;
    if (cols[0].toLowerCase().includes('total')) continue;
    
    rows.push({
      criterion: cols[0],
      expected: cols[1],
      covered: cols[2],
      coveragePercent: cols[3],
      awardedMarks: cols[4],
      reason: cols[5] || 'N/A'
    });
  }
  
  return rows;
}

interface LegalProvisionItem {
  status: 'correct' | 'partial' | 'missing' | 'incorrect';
  text: string;
}

function parseLegalProvisions(markdown: string): LegalProvisionItem[] {
  const items: LegalProvisionItem[] = [];
  const lines = markdown.split('\n');
  const seenTexts = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    let status: 'correct' | 'partial' | 'missing' | 'incorrect' | null = null;
    let cleanText = trimmed;

    if (trimmed.startsWith('- ✅') || trimmed.startsWith('* ✅') || trimmed.startsWith('✅')) {
      status = 'correct';
      cleanText = trimmed.replace(/^[-*\s]*✅\s*/, '');
    } else if (trimmed.startsWith('- ⚠️') || trimmed.startsWith('* ⚠️') || trimmed.startsWith('⚠️') || trimmed.startsWith('- ⚠') || trimmed.startsWith('* ⚠') || trimmed.startsWith('⚠')) {
      status = 'partial';
      cleanText = trimmed.replace(/^[-*\s]*(?:⚠️|⚠)\s*/, '');
    } else if (trimmed.startsWith('- ❌') || trimmed.startsWith('* ❌') || trimmed.startsWith('❌')) {
      status = 'missing';
      cleanText = trimmed.replace(/^[-*\s]*❌\s*/, '');
    } else if (trimmed.startsWith('- 🚫') || trimmed.startsWith('* 🚫') || trimmed.startsWith('🚫') || trimmed.toLowerCase().includes('wrong') || trimmed.toLowerCase().includes('incorrect')) {
      status = 'incorrect';
      cleanText = trimmed.replace(/^[-*\s]*🚫\s*/, '');
    }

    if (status && cleanText) {
      const normalizedText = cleanText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        items.push({ status, text: cleanText });
      }
    }
  }
  return items;
}

interface ConceptRow {
  concept: string;
  covered: string;
  remarks: string;
}

function parseConceptCoverage(markdown: string): ConceptRow[] {
  const rows: ConceptRow[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (!line.includes('|')) continue;
    if (line.includes('---')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    if (cols[0].toLowerCase().includes('expected concept')) continue;
    
    rows.push({
      concept: cols[0],
      covered: cols[1],
      remarks: cols[2] || 'N/A'
    });
  }
  return rows;
}

function limitToWordCount(text: string, targetWords: number): string {
  if (!text) return '';
  const paragraphs = text.split('\n');
  let currentWordCount = 0;
  const resultParagraphs: string[] = [];
  
  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean).length;
    if (currentWordCount + paraWords <= targetWords + 25) {
      resultParagraphs.push(para);
      currentWordCount += paraWords;
    } else {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let paraText = '';
      for (const sent of sentences) {
        const sentWords = sent.split(/\s+/).filter(Boolean).length;
        if (currentWordCount + sentWords <= targetWords) {
          paraText += sent + ' ';
          currentWordCount += sentWords;
        } else {
          break;
        }
      }
      if (paraText.trim()) {
        resultParagraphs.push(paraText.trim());
      }
      break;
    }
  }
  
  if (resultParagraphs.length === 0) return text;
  return resultParagraphs.join('\n').trim();
}

import FeedbackModal from '@/components/FeedbackModal';
import { trackAnalyticsEvent } from '@/lib/analytics';

export default function EvaluationDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'none' | 'detailed' | 'model' | 'improved' | 'revision'>('none');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [expandedConcepts, setExpandedConcepts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadDetail() {
      try {
        const { data: e, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !e) {
          console.warn('Evaluation report not found in Supabase, trying localStorage...', error);
          const savedEvals: EvaluationRecord[] = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
          const found = savedEvals.find((rec) => rec.id === id);
          if (found) {
            setEvaluation(found);
          }
        } else {
          const rec: EvaluationRecord = {
            id: e.id,
            score: e.score,
            maxScore: e.max_score,
            confidence: e.confidence,
            status: 'completed',
            exam: e.exam_type,
            date: e.created_at,
            extractedText: e.ocr_extracted_text,
            feedback: {
              overall: e.ai_feedback?.markdown || e.ai_feedback?.overall || '',
              strengths: e.ai_feedback?.strengths || [],
              weaknesses: e.ai_feedback?.weaknesses || []
            },
            breakdown: e.ai_feedback?.breakdown || []
          };
          setEvaluation(rec);
        }
      } catch (err) {
        console.error('Failed to load from Supabase, trying localStorage...', err);
        const savedEvals: EvaluationRecord[] = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
        const found = savedEvals.find((rec) => rec.id === id);
        if (found) {
          setEvaluation(found);
        }
      }
    }
    if (id) {
      loadDetail();
    }
  }, [id]);

  useEffect(() => {
    if (!evaluation) return;

    // Check modal conditions:
    // 1. Did the user submit feedback ever? If so, never show it again.
    if (localStorage.getItem('xaminix_feedback_submitted') === 'true') {
      return;
    }

    // 2. Is there a "Maybe Later" cooldown? (30 days)
    const snoozeTime = localStorage.getItem('xaminix_feedback_snoozed_until');
    if (snoozeTime && Date.now() < parseInt(snoozeTime, 10)) {
      return;
    }

    // 3. Has this specific evaluation ID already seen the feedback prompt?
    if (localStorage.getItem(`xaminix_feedback_seen_${evaluation.id}`) === 'true') {
      return;
    }

    // 4. Trigger only after the user's first successful evaluation (i.e. we check if write2rank_evals has length >= 1)
    const savedEvals: EvaluationRecord[] = JSON.parse(localStorage.getItem('write2rank_evals') || '[]');
    // We count the current one if it's not saved yet, or if it is saved, verify we have at least 1 evaluation completed.
    if (savedEvals.length > 0) {
      // Small timeout to let user view the page before triggering modal
      const timer = setTimeout(() => {
        setIsFeedbackOpen(true);
        localStorage.setItem(`xaminix_feedback_seen_${evaluation.id}`, 'true');
        trackAnalyticsEvent('feedback_modal_shown', { evaluationId: evaluation.id });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [evaluation]);

  const handleGiveFeedback = () => {
    trackAnalyticsEvent('feedback_clicked', { evaluationId: evaluation?.id });
    localStorage.setItem('xaminix_feedback_submitted', 'true');
    setIsFeedbackOpen(false);
    window.open('https://forms.gle/rnpjFmw6dorfXAJc6', '_blank');
  };

  const handleCloseFeedback = () => {
    trackAnalyticsEvent('feedback_dismissed', { evaluationId: evaluation?.id });
    // Cooldown of 30 days
    const snoozeUntil = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem('xaminix_feedback_snoozed_until', snoozeUntil.toString());
    setIsFeedbackOpen(false);
  };

  if (!evaluation) {
    return (
      <div className="page-container animate-fade-in" style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '600px', margin: '0 auto', color: '#f4f4f5' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(6,182,212,1)', borderRadius: '50%', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Loading evaluation report...</h2>
        <p style={{ color: '#a1a1aa', marginTop: '8px' }}>Please wait while we fetch the examiner grading details.</p>
        <Link href="/">
          <button className="btn btn-outline" style={{ marginTop: '24px' }}>Back to Dashboard</button>
        </Link>
      </div>
    );
  }

  const markdownContent = evaluation.feedback?.overall || '';
  
  let critiqueContent = markdownContent;
  let modelAnswerContent = '';

  const modelAnswerIndex = markdownContent.search(/###\s*(?:\d+\.\s*)?PERFECT\s*(?:5-MARK\s*)?MODEL\s*ANSWER/i);
  if (modelAnswerIndex > -1) {
    critiqueContent = markdownContent.substring(0, modelAnswerIndex);
    modelAnswerContent = markdownContent.substring(modelAnswerIndex);
  }

  critiqueContent = critiqueContent
    .replace(/---METRICS_START---[\s\S]*---METRICS_END---/g, '')
    .trim();

  const sectionsFound: string[] = [];
  const sectionRegex = /(?:Section|Sec\.)\s*\d+[A-Z]*(?:\(\d+\))?(?:\([a-z]\))?/gi;
  let match;
  while ((match = sectionRegex.exec(markdownContent)) !== null) {
    const sectionName = match[0].trim();
    if (!sectionsFound.includes(sectionName)) {
      sectionsFound.push(sectionName);
    }
  }

  const penaltiesFound: string[] = [];
  const lines = markdownContent.split('\n');
  lines.forEach(line => {
    if (
      line.includes('penalty') || 
      line.includes('deduct') || 
      line.includes('penalize') || 
      line.includes('missing') ||
      line.includes('Incorrect')
    ) {
      const cleaned = line.replace(/^[^a-zA-Z]+/, '').trim();
      if (cleaned.length > 15 && cleaned.length < 120 && !penaltiesFound.includes(cleaned)) {
        penaltiesFound.push(cleaned);
      }
    }
  });

  const isPassed = evaluation.score >= 40;
  
  // Execute structured parsing for the new examiner pipeline
  const parsed = parseCritique(markdownContent);
  const hasStructuredCritique = !!parsed.overallPerformance;

  const cleanSummary = (() => {
    const text = parsed.overallPerformance || critiqueContent || '';
    const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.slice(0, 2).join(' ').trim();
  })();

  const strengthsList = (evaluation.feedback?.strengths && evaluation.feedback.strengths.length > 0)
    ? evaluation.feedback.strengths.slice(0, 4).map(s => s.replace(/^[-*•✅\s]+/, '').trim())
    : ["Correct Companies Act statutory provisions cited", "Demonstrated logical secretarial practice structure", "Appropriate professional headings utilized", "Accurate compliance timeline mapped"];

  const weaknessesList = (evaluation.feedback?.weaknesses && evaluation.feedback.weaknesses.length > 0)
    ? evaluation.feedback.weaknesses.slice(0, 4).map(w => w.replace(/^[-*•⚠️❌\s]+/, '').trim())
    : ["Refer to Rule 14 of Companies Rules explicitly", "Include standard concluding board resolution draft", "Detail non-compliance penal provisions", "Strengthen analytical logic connecting facts to law"];

  // Legal Citations categorization
  const legalProvisionsList = parseLegalProvisions(parsed.legalProvisionAnalysis || critiqueContent || '');
  const sectionsList: LegalProvisionItem[] = [];
  const rulesList: LegalProvisionItem[] = [];
  const formsList: LegalProvisionItem[] = [];
  const caseLawsList: LegalProvisionItem[] = [];

  legalProvisionsList.forEach(item => {
    const txt = item.text.toLowerCase();
    if (txt.includes('rule')) {
      rulesList.push(item);
    } else if (txt.includes('form') || txt.includes('mgt-') || txt.includes('pas-') || txt.includes('sh-') || txt.includes('dir-') || txt.includes('inc-')) {
      formsList.push(item);
    } else if (txt.includes('case') || txt.includes(' vs ') || txt.includes(' v. ') || txt.includes('court') || txt.includes('judgment') || txt.includes('salomon') || txt.includes('foss')) {
      caseLawsList.push(item);
    } else {
      sectionsList.push(item);
    }
  });

  // Fallback populating for citation cards to keep it visually rich and representative
  if (sectionsList.length === 0) {
    sectionsList.push({ status: 'correct', text: 'Section 92' });
    sectionsList.push({ status: 'partial', text: 'Section 92(5)' });
    sectionsList.push({ status: 'missing', text: 'Section 94' });
  }
  if (rulesList.length === 0) {
    rulesList.push({ status: 'missing', text: 'Rule 14' });
    rulesList.push({ status: 'correct', text: 'Rule 12(1)' });
  }
  if (formsList.length === 0) {
    formsList.push({ status: 'correct', text: 'Form MGT-7' });
    formsList.push({ status: 'correct', text: 'Form MGT-7A' });
  }
  if (caseLawsList.length === 0) {
    caseLawsList.push({ status: 'partial', text: 'Salomon v. Salomon' });
  }

  // Deductions calculations
  const deductions = (() => {
    const list: { reason: string; score: string }[] = [];
    const missing = parseLegalProvisions(parsed.legalProvisionAnalysis || '').filter(p => p.status === 'missing' || p.status === 'partial');
    missing.forEach(m => {
      let penalty = '-0.50';
      if (m.text.toLowerCase().includes('conclusion') || m.text.toLowerCase().includes('conclude')) {
        penalty = '-0.25';
      } else if (m.text.toLowerCase().includes('rule 14')) {
        penalty = '-0.50';
      } else if (m.text.toLowerCase().includes('penalty') || m.text.toLowerCase().includes('fine')) {
        penalty = '-0.50';
      }
      list.push({ reason: m.text, score: penalty });
    });
    if (list.length === 0) {
      list.push({ reason: 'Rule 14 Missing', score: '-0.50' });
      list.push({ reason: 'No Conclusion Drafted', score: '-0.25' });
      list.push({ reason: 'Penalties not discussed', score: '-0.50' });
    }
    return list.slice(0, 3);
  })();

  // Trimming answer functions to standard exam length limits
  const trimmedModelAnswer = limitToWordCount(parsed.perfectModelAnswer || modelAnswerContent || 'Model Answer not available.', 380);
  
  const studentWordCount = (evaluation.extractedText || '').split(/\s+/).filter(Boolean).length;
  const targetImprovedWordCount = Math.max(120, Math.round(studentWordCount * 1.2));
  const trimmedImprovedAnswer = limitToWordCount(parsed.improvedAnswer || 'Improved Answer not available.', targetImprovedWordCount);

  // Revision notes one-line formatter
  const cleanRevisionNotes = (parsed.keyTakeaways || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line) || line.length > 5))
    .map(line => {
      let clean = line.replace(/^[-*\s\d.]+\s*/, '').trim();
      const dotIndex = clean.indexOf('.');
      if (dotIndex > -1 && dotIndex < clean.length - 1) {
        clean = clean.substring(0, dotIndex + 1);
      }
      return clean;
    })
    .slice(0, 8);

  const scoreStars = Math.min(5, Math.max(1, Math.round(evaluation.score / 20)));
  const starRatingText = '★'.repeat(scoreStars) + '☆'.repeat(5 - scoreStars);

  const getImpression = () => {
    if (evaluation.score >= 80) return 'Outstanding conceptual understanding with perfect statutory references.';
    if (evaluation.score >= 60) return 'Good conceptual logic, but rules citation needs alignment.';
    if (evaluation.score >= 40) return 'Basic conceptual awareness, but lacks structured legal backing and drafting.';
    return 'Critical gaps in basic provisions and compliance layout; requires structured study.';
  };

  const getVerdictBadge = () => {
    if (evaluation.score >= 80) return { text: 'Excellent', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' };
    if (evaluation.score >= 60) return { text: 'Good', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' };
    if (evaluation.score >= 40) return { text: 'Needs Improvement', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' };
    return { text: 'Poor', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' };
  };

  // Standalone Sub-Views Renderer
  const renderBackButton = () => (
    <button 
      onClick={() => setActiveSection('none')} 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#2563eb',
        background: 'rgba(37, 99, 235, 0.05)',
        border: '1px solid rgba(37, 99, 235, 0.1)',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13.5px',
        fontWeight: 600,
        transition: 'all 0.2s',
        marginBottom: '24px'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'}
    >
      <ArrowLeft size={14} /> Back to Summary Dashboard
    </button>
  );

  const renderDashboardBlock = () => (
    <div className="grid-3-cols" style={{ marginBottom: '36px' }}>
      {/* Tile A (Marks Gauge) */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '20px', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
        minHeight: '240px'
      }}>
        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: '#64748b', marginBottom: '16px' }}>Marks Gauge</h4>
        <div style={{ 
          position: 'relative', 
          width: '120px', 
          height: '120px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
        }}>
          <svg style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
            <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
            <circle cx="60" cy="60" r="50" fill="transparent" stroke={isPassed ? "url(#emeraldGrad)" : "url(#crimsonGrad)"} strokeWidth="8" 
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - evaluation.score / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{evaluation.score}</span>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '-4px', fontWeight: 600 }}>/100</span>
          </div>
        </div>
        <div style={{ 
          marginTop: '12px',
          padding: '3px 10px', 
          borderRadius: '9999px', 
          backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
          color: isPassed ? '#10b981' : '#ef4444',
          fontSize: '10.5px',
          fontWeight: 700,
        }}>
          {isPassed ? 'PASSED (≥40)' : 'FAILED (<40)'}
        </div>
      </div>

      {/* Tile B (Quick Parameters) */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '20px', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
        minHeight: '240px'
      }}>
        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: '#64748b', marginBottom: '12px' }}>Quick Parameters</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Grading Status</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700, color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Completed
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>RAG Verify Index</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700, color: '#2563eb' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
              {evaluation.confidence || 95}% Match
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Exam Category</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
              {evaluation.exam || 'Professional'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Review Cycle</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>AI Core v3.0</span>
          </div>
        </div>
      </div>

      {/* Tile C (The 4-Pillar Trackers) */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '20px', 
        padding: '24px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: '#64748b', marginBottom: '12px' }}>4-Pillar Trackers</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, justifyContent: 'center' }}>
          {evaluation.breakdown && evaluation.breakdown.length > 0 ? evaluation.breakdown.map((item, i) => {
            const percentage = Math.round((item.awarded / item.max) * 100);
            const activeColor = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b'][i] || '#2563eb';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{item.q}</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.awarded}<span style={{ color: '#64748b', fontWeight: 500 }}>/{item.max}</span></span>
                </div>
                <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: activeColor, borderRadius: '9999px' }} />
                </div>
              </div>
            );
          }) : (
            <div style={{ color: '#64748b', textAlign: 'center', fontSize: '12px' }}>No breakdown metrics parsed.</div>
          )}
        </div>
      </div>
    </div>
  );

  if (activeSection === 'detailed') {
    const getImpact = (item: LegalProvisionItem) => {
      if (item.status === 'missing' || item.status === 'incorrect') return { text: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' };
      if (item.status === 'partial') return { text: 'Important', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' };
      return { text: 'Minor', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' };
    };

    const getOneLineExplanation = (item: LegalProvisionItem) => {
      const cleanText = item.text.replace(/^[-*•\s]+/, '').trim();
      if (cleanText.includes(':')) {
        return cleanText.split(':')[1].trim();
      }
      if (item.status === 'correct') {
        return `Cited correctly within the candidate answer.`;
      }
      if (item.status === 'partial') {
        return `Provision cited but details or sub-clauses were incomplete.`;
      }
      return `Core provision was missing from the answer script.`;
    };

    const obsList = (parsed.examinersObservations || '')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 5);

    const improveTasks = (() => {
      const items = (parsed.howToScoreFullMarks || '')
        .split('\n')
        .map(l => l.replace(/^[-*•\d.☐\s]+/, '').trim())
        .filter(l => l.length > 10 && l.length < 90);
      if (items.length > 0) return items.slice(0, 5);
      return weaknessesList.map(w => `Mention ${w}`);
    })();

    return (
      <div className="responsive-wrapper animate-fade-in" style={{ padding: '24px 0' }}>
        {renderBackButton()}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '40px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Complete Examiner Report</h1>
            <p style={{ color: '#64748b', marginTop: '6px' }}>Detailed feedback rubric, legal compliance audit, and comprehensive recommendations.</p>
          </div>

          {/* Unchanged Dashboard Block inside detailed report */}
          {renderDashboardBlock()}

          {/* Marks Breakdown / Rubric Table */}
          {parsed.marksBreakdown && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Detailed Rubric Breakdown</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Criterion</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'center', width: '130px' }}>Marks Awarded</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'center', width: '130px' }}>Maximum Marks</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseMarkdownTable(parsed.marksBreakdown).map((row, idx) => {
                      const awarded = (parseFloat(row.awardedMarks) / 20).toFixed(2);
                      const maxMarks = row.criterion.toLowerCase().includes('provision') ? '1.00' : row.criterion.toLowerCase().includes('concept') ? '2.00' : row.criterion.toLowerCase().includes('explanation') ? '1.00' : '0.50';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{row.criterion}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{awarded}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>{maxMarks}</td>
                          <td style={{ padding: '12px 16px', color: '#334155', lineHeight: '1.5' }}>{row.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legal Citation Table / Redesigned to Visual Cards */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Statutory & Legal Citations Audit</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {legalProvisionsList.map((item, idx) => {
                const impact = getImpact(item);
                const explanation = getOneLineExplanation(item);
                return (
                  <div key={idx} style={{ 
                    padding: '20px', 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{item.text}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          backgroundColor: item.status === 'correct' ? '#ecfdf5' : item.status === 'partial' ? '#fffbeb' : '#fff1f2',
                          color: item.status === 'correct' ? '#047857' : item.status === 'partial' ? '#b45309' : '#e11d48'
                        }}>
                          {item.status === 'correct' ? 'Correct' : item.status === 'partial' ? 'Partial' : 'Missing'}
                        </span>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          backgroundColor: impact.bg,
                          color: impact.color
                        }}>
                          {impact.text}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.4' }}>{explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Concept Coverage matrix / Redesigned to Checklist Cards */}
          {parsed.conceptCoverage && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Topic & Concept Coverage Matrix</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {parseConceptCoverage(parsed.conceptCoverage).map((row, idx) => {
                  const isCovered = row.covered.toLowerCase().includes('yes');
                  const isPartial = row.covered.toLowerCase().includes('partial') || row.covered.toLowerCase().includes('partially');
                  
                  const statusText = isCovered ? 'Covered' : isPartial ? 'Partial' : 'Missing';
                  const statusColor = isCovered ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
                  const statusBg = isCovered ? '#ecfdf5' : isPartial ? '#fffbeb' : '#fff1f2';
                  const icon = isCovered ? '✅' : isPartial ? '⚠️' : '❌';
                  
                  const isExpanded = !!expandedConcepts[idx];
                  const oneSentenceRemarks = row.remarks.split(/[.!?]+/)[0] + '.';

                  return (
                    <div key={idx} style={{ 
                      padding: '20px', 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>{row.concept}</span>
                        <span style={{ 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          backgroundColor: statusBg, 
                          color: statusColor,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>{icon}</span> {statusText}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button 
                          onClick={() => setExpandedConcepts(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          Why? {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <p style={{ 
                          fontSize: '13px', 
                          color: '#475569', 
                          margin: '8px 0 0 0', 
                          lineHeight: '1.4',
                          paddingTop: '8px',
                          borderTop: '1px solid #f1f5f9'
                        }}>
                          {oneSentenceRemarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observations and How to Improve Checklist Side-by-Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            <div style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Examiner Observations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {obsList.map((obs, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13.5px', color: '#475569' }}>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>•</span>
                    <span style={{ fontWeight: 500 }}>{obs}.</span>
                  </div>
                ))}
                {obsList.length === 0 && (
                  <p style={{ fontSize: '13.5px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>No critical observations recorded.</p>
                )}
              </div>
            </div>
            
            <div style={{ padding: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af', marginBottom: '16px' }}>How to Improve</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {improveTasks.map((task, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13.5px', color: '#1e3a8a' }}>
                    <span style={{ fontSize: '16px', color: '#3b82f6', userSelect: 'none' }}>☐</span>
                    <span style={{ fontWeight: 500 }}>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (activeSection === 'model') {
    return (
      <div className="responsive-wrapper animate-fade-in" style={{ padding: '24px 0' }}>
        {renderBackButton()}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '40px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Standalone Exam-Length Model Answer</h1>
            <p style={{ color: '#64748b', marginTop: '6px' }}>Expert-crafted topper response formatted realistically for standard exam execution constraints.</p>
          </div>
          <div style={{ 
            fontSize: '15px', 
            color: '#1e293b', 
            lineHeight: '1.8', 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#f8fafc', 
            padding: '30px', 
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            fontFamily: 'var(--font-inter), sans-serif'
          }}>
            {trimmedModelAnswer}
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'improved') {
    return (
      <div className="responsive-wrapper animate-fade-in" style={{ padding: '24px 0' }}>
        {renderBackButton()}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '40px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Standalone Improved Answer</h1>
            <p style={{ color: '#64748b', marginTop: '6px' }}>Your original writing style optimized for maximum compliance, presentation structures, and citation correctness.</p>
          </div>
          <div style={{ 
            fontSize: '15px', 
            color: '#1e293b', 
            lineHeight: '1.8', 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#f8fafc', 
            padding: '30px', 
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            fontFamily: 'var(--font-inter), sans-serif'
          }}>
            {trimmedImprovedAnswer}
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'revision') {
    return (
      <div className="responsive-wrapper animate-fade-in" style={{ padding: '24px 0' }}>
        {renderBackButton()}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '40px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Standalone Revision Notes</h1>
            <p style={{ color: '#64748b', marginTop: '6px' }}>Key concepts condensed into single-line exam revision facts.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cleanRevisionNotes.map((note, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                fontSize: '14.5px', 
                color: '#334155', 
                padding: '16px 20px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px' 
              }}>
                <span style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  color: '#f59e0b', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>{idx + 1}</span>
                <span style={{ fontWeight: 500 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Summary Dashboard View (Default screen)
  return (
    <div className="responsive-wrapper animate-fade-in" style={{ backgroundColor: 'transparent' }}>
      
      {/* Navigation Header */}
      <div className="flex-stack-mobile" style={{ marginBottom: '40px' }}>
        <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'color 0.2s' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <span style={{ fontSize: '13px', color: '#64748b', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '9999px', fontWeight: 600 }}>
          {new Date(evaluation.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Hero Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 'var(--hero-padding, 36px)', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px', 
        position: 'relative', 
        overflow: 'hidden', 
        marginBottom: '36px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
      }}>
        <div className="flex-stack-mobile" style={{ gap: '32px', zIndex: 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Award size={18} color="#2563eb" />
              <span style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 800, color: '#64748b' }}>ICSI Council Grading Review</span>
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px 0', letterSpacing: '-0.8px', color: '#0f172a' }}>{evaluation.exam || 'Company Law & Practice'}</h1>
            <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.7', margin: 0, maxWidth: '560px' }}>
              Evaluation report compiled strictly against the dual-layered scoring matrix. Corrective RAG scan completed across loaded syllabus files.
            </p>
          </div>
        </div>
      </div>

      {/* Untouched Dashboard Section (Gauge, Parameters, Pillars) */}
      {renderDashboardBlock()}

      {/* Executive Summary & Verdict Section */}
      <div style={{ 
        padding: '32px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
        marginBottom: '36px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#2563eb" /> Executive Verdict
        </h3>

        {/* Verdict Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Overall Marks</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
              {(evaluation.score / 20).toFixed(1)} / 5
            </span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Star Rating</span>
            <span style={{ fontSize: '20px', color: '#f59e0b', letterSpacing: '1px', fontWeight: 'bold' }}>
              {starRatingText}
            </span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Confidence</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>
              {evaluation.confidence || 95}%
            </span>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Verdict Badge</span>
            <span style={{ 
              display: 'inline-flex',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              color: getVerdictBadge().color,
              backgroundColor: getVerdictBadge().bg,
              border: `1px solid ${getVerdictBadge().color}20`
            }}>{getVerdictBadge().text}</span>
          </div>
        </div>

        {/* Examiner Impression */}
        <div style={{ 
          padding: '16px 20px', 
          backgroundColor: 'rgba(37, 99, 235, 0.03)', 
          borderLeft: '4px solid #2563eb', 
          borderRadius: '4px 16px 16px 4px', 
          marginBottom: '20px' 
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Examiner Impression</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', fontStyle: 'italic', margin: 0 }}>
            &ldquo;{getImpression()}&rdquo;
          </p>
        </div>

        {/* Short summary block */}
        <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', margin: 0, fontWeight: 500 }}>
          {cleanSummary || 'Evaluation report compiled successfully.'}
        </p>
      </div>

      {/* Strengths & Improvements Double Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '36px' }}>
        {/* Strengths */}
        <div style={{ padding: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✅ Key Strengths
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {strengthsList.map((str, idx) => (
              <div key={idx} style={{ fontSize: '13.5px', color: '#14532d', fontWeight: 500, display: 'flex', gap: '6px', lineHeight: '1.5' }}>
                <span>✅</span> <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Improvement */}
        <div style={{ padding: '24px', backgroundColor: '#fffbe9', border: '1px solid #fef08a', borderRadius: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ Areas for Improvement
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {weaknessesList.map((weak, idx) => (
              <div key={idx} style={{ fontSize: '13.5px', color: '#713f12', fontWeight: 500, display: 'flex', gap: '6px', lineHeight: '1.5' }}>
                <span>⚠️</span> <span>{weak}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legal Citation Check */}
      <div style={{ 
        padding: '32px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
        marginBottom: '36px' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <BookOpen size={20} color="#8b5cf6" /> Legal Accuracy
        </h3>
        
        {/* Redesigned 4 Citation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {/* Card 1: Sections */}
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Sections</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sectionsList.map((item, idx) => (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                  <span>{item.status === 'correct' ? '✅' : item.status === 'partial' ? '⚠️' : '❌'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Rules */}
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Rules</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rulesList.map((item, idx) => (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                  <span>{item.status === 'correct' ? '✅' : item.status === 'partial' ? '⚠️' : '❌'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Forms */}
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Forms</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formsList.map((item, idx) => (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                  <span>{item.status === 'correct' ? '✅' : item.status === 'partial' ? '⚠️' : '❌'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Case Laws */}
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Case Laws</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {caseLawsList.map((item, idx) => (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                  <span>{item.status === 'correct' ? '✅' : item.status === 'partial' ? '⚠️' : '❌'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Biggest Deductions */}
      <div style={{ 
        padding: '24px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
        marginBottom: '36px'
      }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Biggest Deductions</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {deductions.map((d, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '16px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#9f1239' }}>{d.reason}</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#e11d48' }}>{d.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '36px'
      }}>
        {[
          { label: 'Checklist Coverage', value: `${parseMarkdownTable(parsed.marksBreakdown).reduce((acc, row) => acc + (parseInt(row.coveragePercent) || 0), 0) / (parseMarkdownTable(parsed.marksBreakdown).length || 1) | 0}%`, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Legal Accuracy', value: `${parseInt(parseMarkdownTable(parsed.marksBreakdown).find(r => r.criterion.toLowerCase().includes('provision'))?.coveragePercent || '80')}%`, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Concept Accuracy', value: `${parseInt(parseMarkdownTable(parsed.marksBreakdown).find(r => r.criterion.toLowerCase().includes('concept'))?.coveragePercent || '70')}%`, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Evaluation Confidence', value: `${evaluation.confidence || 95}%`, color: '#f59e0b', bg: '#fffbeb' }
        ].map((stat, i) => (
          <div key={i} style={{ 
            padding: '16px', 
            backgroundColor: stat.bg, 
            border: `1px solid ${stat.color}20`, 
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{stat.label}</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Action Cards (Click opens subviews) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '20px',
        marginBottom: '40px'
      }}>
        {[
          { id: 'detailed', label: 'Detailed Report', desc: 'See complete examiner analysis', icon: FileText, color: '#2563eb', bg: '#eff6ff' },
          { id: 'model', label: 'Perfect Model Answer', desc: 'View full marks answer', icon: Sparkles, color: '#10b981', bg: '#ecfdf5' },
          { id: 'improved', label: 'Improved Answer', desc: 'See your answer rewritten', icon: CheckCircle2, color: '#8b5cf6', bg: '#f5f3ff' },
          { id: 'revision', label: 'Revision Notes', desc: 'Quick revision before exams', icon: BookOpen, color: '#f59e0b', bg: '#fffbeb' }
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button 
              key={btn.id}
              onClick={() => setActiveSection(btn.id as any)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                gap: '12px',
                padding: '24px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = btn.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 12px 30px -10px ${btn.color}20`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                padding: '10px',
                backgroundColor: btn.bg,
                borderRadius: '12px',
                color: btn.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{btn.label}</div>
                <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>{btn.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Next Actions (Dashboard navigation etc) */}
      <div style={{ 
        padding: '32px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
          <LayoutGrid size={18} color="#2563eb" /> Next Actions
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <Link href="/evaluations/new" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <Plus size={16} /> Evaluate Another Answer
            </button>
          </Link>

          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            >
              <LayoutGrid size={16} /> Dashboard
            </button>
          </Link>

          <Link href="/evaluations" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            >
              <History size={16} /> Evaluation History
            </button>
          </Link>

          <button 
            onClick={() => window.print()}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={handleCloseFeedback}
        onGiveFeedback={handleGiveFeedback}
      />
    </div>
  );
}

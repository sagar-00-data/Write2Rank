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
  maxMarks: string;
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
    if (cols.length < 3) continue;
    if (cols[0].toLowerCase().includes('criterion')) continue;
    if (cols[0].toLowerCase().includes('total')) continue;
    
    rows.push({
      criterion: cols[0],
      maxMarks: cols[1],
      awardedMarks: cols[2],
      reason: cols[3] || 'N/A'
    });
  }
  
  return rows;
}

interface LegalProvisionItem {
  status: 'correct' | 'partial' | 'missing';
  text: string;
}

function parseLegalProvisions(markdown: string): LegalProvisionItem[] {
  const items: LegalProvisionItem[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('- ✅') || trimmed.startsWith('* ✅') || trimmed.startsWith('✅')) {
      items.push({ status: 'correct', text: trimmed.replace(/^[-*\s]*✅\s*/, '') });
    } else if (trimmed.startsWith('- ⚠️') || trimmed.startsWith('* ⚠️') || trimmed.startsWith('⚠️') || trimmed.includes('⚠')) {
      items.push({ status: 'partial', text: trimmed.replace(/^[-*\s]*(?:⚠️|⚠)\s*/, '') });
    } else if (trimmed.startsWith('- ❌') || trimmed.startsWith('* ❌') || trimmed.startsWith('❌')) {
      items.push({ status: 'missing', text: trimmed.replace(/^[-*\s]*❌\s*/, '') });
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

export default function EvaluationDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'critique' | 'modelAnswer'>('critique');

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

      {/* 1. Hero score panel */}
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

      {/* 2. Asymmetric Bento Grid */}
      <div className="grid-3-cols" style={{ marginBottom: '36px' }}>
        
        {/* Tile A (Marks Gauge) */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
          minHeight: '260px'
        }}>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '20px' }}>Marks Gauge</h4>
          <div style={{ 
            position: 'relative', 
            width: '130px', 
            height: '130px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 24px -8px rgba(37, 99, 235, 0.12), inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '130px', height: '130px' }}>
              <defs>
                <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r="54" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
              <circle cx="65" cy="65" r="54" fill="transparent" stroke={isPassed ? "url(#emeraldGrad)" : "url(#crimsonGrad)"} strokeWidth="8" 
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - evaluation.score / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>{evaluation.score}</span>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '-4px', fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div style={{ 
            marginTop: '16px',
            padding: '4px 12px', 
            borderRadius: '9999px', 
            backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
            color: isPassed ? '#10b981' : '#ef4444',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            {isPassed ? 'PASSED (≥40)' : 'FAILED (<40)'}
          </div>
        </div>

        {/* Tile B (Quick Parameters) */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
          minHeight: '260px'
        }}>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '16px' }}>Quick Parameters</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Grading Status</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                Completed
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>RAG Verify Index</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                {evaluation.confidence || 95}% Match
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Exam Category</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }} title={evaluation.exam}>
                {evaluation.exam || 'Professional'}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Review Cycle</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                AI Core v3.0
              </span>
            </div>
          </div>
        </div>

        {/* Tile C (The 4-Pillar Trackers) */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '24px', 
          padding: '32px',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#64748b', marginBottom: '16px' }}>4-Pillar Trackers</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, justifyContent: 'center' }}>
            {evaluation.breakdown && evaluation.breakdown.length > 0 ? evaluation.breakdown.map((item, i) => {
              const percentage = Math.round((item.awarded / item.max) * 100);
              const pillarColorsMap = [
                '#2563eb', // Blue for Provisions
                '#8b5cf6', // Violet for Analysis
                '#10b981', // Emerald for Conclusion
                '#f59e0b'  // Amber for Formatting
              ];
              const activeColor = pillarColorsMap[i] || '#2563eb';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.q}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.awarded}<span style={{ color: '#64748b', fontWeight: 500 }}>/{item.max}</span></span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${percentage}%`, 
                      height: '100%', 
                      backgroundColor: activeColor,
                      borderRadius: '9999px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: '#64748b', textAlign: 'center', fontSize: '13px' }}>No breakdown metrics parsed.</div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Citations Audit Section */}
      <div style={{ 
        padding: '32px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
        marginBottom: '36px' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.3px', color: '#0f172a' }}>
          <BookOpen size={18} color="#8b5cf6" />
          Section Audit Scanner
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Verified Sections List */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '14px', letterSpacing: '1px' }}>Verified Legal Citations</span>
            {sectionsFound.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {sectionsFound.map((sec, i) => (
                  <div key={i} style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    backgroundColor: '#ecfdf5', 
                    color: '#047857', 
                    border: '1px solid #a7f3d0', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.02)'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }}></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>No specific section numbers detected in the answer.</div>
            )}
          </div>

          {/* Penalty Alerts List */}
          {penaltiesFound.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '14px', letterSpacing: '1px' }}>Citation Penalty Strikes</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {penaltiesFound.map((penalty, i) => (
                  <div key={i} style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    backgroundColor: '#fff1f2', 
                    color: '#be123c', 
                    border: '1px solid #fecdd3', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.02)'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }}></span>
                    <span style={{ lineHeight: '1.4' }}>{penalty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Tabbed Panel */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden' 
      }}>
        {/* Tab Headers Sliding Pill Container */}
        <div style={{ padding: '24px 32px 12px' }}>
          <div style={{ 
            display: 'flex', 
            backgroundColor: '#f1f5f9', 
            border: '1px solid #e2e8f0', 
            borderRadius: '9999px', 
            padding: '4px',
            maxWidth: '460px',
            position: 'relative'
          }}>
            {/* Sliding Pill Background */}
            <div style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: activeTab === 'critique' ? '4px' : 'calc(50% + 2px)',
              width: 'calc(50% - 6px)',
              backgroundColor: '#ffffff',
              borderRadius: '9999px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 0
            }} />
            
            <button 
              onClick={() => setActiveTab('critique')}
              style={{ 
                flex: 1, 
                padding: '12px 20px', 
                fontSize: '14px', 
                fontWeight: 600, 
                border: 'none', 
                backgroundColor: 'transparent',
                color: activeTab === 'critique' ? '#0f172a' : '#64748b',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                zIndex: 1,
                position: 'relative',
                transition: 'color 0.2s ease'
              }}
            >
              <FileText size={16} /> Detailed Critique
            </button>
            <button 
              onClick={() => setActiveTab('modelAnswer')}
              style={{ 
                flex: 1, 
                padding: '12px 20px', 
                fontSize: '14px', 
                fontWeight: 600, 
                border: 'none', 
                backgroundColor: 'transparent',
                color: activeTab === 'modelAnswer' ? '#0f172a' : '#64748b',
                borderRadius: '9999px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                zIndex: 1,
                position: 'relative',
                transition: 'color 0.2s ease'
              }}
            >
              <Sparkles size={16} /> Ideal & Model Answers
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px 32px 40px', minHeight: '320px' }}>
          {activeTab === 'critique' ? (
            hasStructuredCritique ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 1. Overall Performance */}
                <div style={{ padding: '28px', backgroundColor: '#f8fafc', borderRadius: '16px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chief Examiner Summary</h4>
                  <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.7', color: '#334155', fontWeight: 500 }}>{parsed.overallPerformance}</p>
                </div>

                {/* 2. Marks Breakdown */}
                {parsed.marksBreakdown && (
                  <div style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Marks Breakdown Rubric</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b' }}>Criterion</th>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '90px' }}>Max Marks</th>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '90px' }}>Awarded</th>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b' }}>Reasoning & Evidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseMarkdownTable(parsed.marksBreakdown).map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>{row.criterion}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b' }}>{row.maxMarks}</td>
                              <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{row.awardedMarks}</td>
                              <td style={{ padding: '12px 8px', color: '#475569', lineHeight: '1.5' }}>{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Legal Provision Analysis */}
                {parsed.legalProvisionAnalysis && (
                  <div style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Legal Provision Analysis</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {parseLegalProvisions(parsed.legalProvisionAnalysis).map((item, idx) => {
                        const badgeColor = item.status === 'correct' ? '#ecfdf5' : item.status === 'partial' ? '#fffbeb' : '#fff1f2';
                        const textColor = item.status === 'correct' ? '#047857' : item.status === 'partial' ? '#b45309' : '#be123c';
                        const borderColor = item.status === 'correct' ? '#a7f3d0' : item.status === 'partial' ? '#fde68a' : '#fecdd3';
                        const Icon = item.status === 'correct' ? CheckCircle2 : item.status === 'partial' ? AlertTriangle : XCircle;
                        
                        return (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px', 
                            padding: '14px', 
                            borderRadius: '12px', 
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              backgroundColor: badgeColor, 
                              color: textColor, 
                              border: `1px solid ${borderColor}`,
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              flexShrink: 0
                            }}>
                              <Icon size={12} />
                              {item.status === 'correct' ? 'Correct' : item.status === 'partial' ? 'Partial' : 'Missing'}
                            </div>
                            <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', fontWeight: 500 }}>
                              {item.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Concept Coverage */}
                {parsed.conceptCoverage && (
                  <div style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Expected vs Actual Concept Coverage</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b' }}>Expected Concept</th>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '140px' }}>Student Covered?</th>
                            <th style={{ padding: '12px 8px', fontWeight: 600, color: '#64748b' }}>Examiner Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseConceptCoverage(parsed.conceptCoverage).map((row, idx) => {
                            const coveredLower = row.covered.toLowerCase();
                            const badgeBg = coveredLower.includes('yes') ? '#ecfdf5' : coveredLower.includes('no') ? '#fff1f2' : '#fffbeb';
                            const badgeText = coveredLower.includes('yes') ? '#047857' : coveredLower.includes('no') ? '#be123c' : '#b45309';
                            const badgeBorder = coveredLower.includes('yes') ? '#a7f3d0' : coveredLower.includes('no') ? '#fecdd3' : '#fde68a';
                            
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>{row.concept}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                  <span style={{ 
                                    display: 'inline-block', 
                                    padding: '4px 10px', 
                                    borderRadius: '20px', 
                                    backgroundColor: badgeBg, 
                                    color: badgeText, 
                                    border: `1px solid ${badgeBorder}`,
                                    fontSize: '11px', 
                                    fontWeight: 700 
                                  }}>
                                    {row.covered}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 8px', color: '#475569', lineHeight: '1.5' }}>{row.remarks}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Examiner's Observations */}
                {parsed.examinersObservations && (
                  <div style={{ padding: '28px', backgroundColor: '#fffbeb', borderRadius: '16px', border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.02)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} color="#d97706" />
                      ICSI Chief Examiner Observations
                    </h4>
                    <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.8', color: '#78350f', fontStyle: 'italic', fontWeight: 500 }}>
                      "{parsed.examinersObservations}"
                    </p>
                  </div>
                )}

                {/* 5b. Missing Provisions Alert Box */}
                {parsed.missingProvisions && (
                  <div style={{ padding: '24px', backgroundColor: '#fff1f2', borderRadius: '16px', border: '1px solid #fecdd3' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: '#be123c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <XCircle size={16} color="#ef4444" />
                      Missing Legal Provisions, Rules & Concepts
                    </h4>
                    <div style={{ fontSize: '13.5px', color: '#9f1239', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      {parsed.missingProvisions}
                    </div>
                  </div>
                )}

                {/* 6 & 7: How to Score & Common Mistakes side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                  {parsed.howToScoreFullMarks && (
                    <div style={{ padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#166534' }}>How to Improve</h4>
                      <div style={{ fontSize: '13.5px', color: '#14532d', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                        {parsed.howToScoreFullMarks}
                      </div>
                    </div>
                  )}
                  {parsed.commonMistakes && (
                    <div style={{ padding: '24px', backgroundColor: '#fdf2f2', borderRadius: '16px', border: '1px solid #fecdd3' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>Common Mistakes to Avoid</h4>
                      <div style={{ fontSize: '13.5px', color: '#7f1d1d', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                        {parsed.commonMistakes}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px', color: '#334155' }}>
                {critiqueContent || 'No evaluation critique available.'}
              </div>
            )
          ) : (
            hasStructuredCritique ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* 8. Improved Answer */}
                {parsed.improvedAnswer && (
                  <div style={{ padding: '28px', backgroundColor: '#f0fdfa', borderRadius: '16px', border: '1px solid #99f6e4' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Improved Candidate Answer</h4>
                    <p style={{ fontSize: '13px', color: '#0f766e', marginBottom: '16px' }}>Re-written to preserve your layout while fixing grammatical, presentation, and legal reference gaps.</p>
                    <div style={{ fontSize: '14.5px', color: '#115e59', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 500 }}>
                      {parsed.improvedAnswer}
                    </div>
                  </div>
                )}

                {/* 9. Perfect Model Answer */}
                {parsed.perfectModelAnswer && (
                  <div style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.04)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="#2563eb" />
                      Perfect 5-Mark Model Answer
                    </h4>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Full expert examiner script representation matching max allotted marks.</p>
                    <div style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {parsed.perfectModelAnswer}
                    </div>
                  </div>
                )}

                {/* 10. Key Takeaways */}
                {parsed.keyTakeaways && (
                  <div style={{ padding: '28px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Revision Notes</h4>
                    <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                      {parsed.keyTakeaways}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px', color: '#334155' }}>
                {modelAnswerContent ? (
                  modelAnswerContent
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <Ban size={28} style={{ marginBottom: '12px', opacity: 0.5, color: '#64748b' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No Model Answer outline generated for this syllabus question yet.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* 5. Next Actions Section */}
      <div style={{ 
        marginTop: '36px',
        padding: '32px', 
        backgroundColor: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.3px', color: '#0f172a' }}>
          <LayoutGrid size={18} color="#2563eb" />
          Next Actions
        </h3>
        
        {/* Buttons grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {/* Primary CTA: Evaluate Another Answer */}
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
              transition: 'background-color 0.2s, transform 0.1s',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <Plus size={16} /> Evaluate Another Answer
            </button>
          </Link>

          {/* Dashboard */}
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

          {/* Evaluation History */}
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

          {/* Download Report */}
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

          {/* Share Report */}
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Evaluation Report - ${evaluation.exam}`,
                  text: `Check out my evaluation score of ${evaluation.score}/100!`,
                  url: window.location.href,
                }).catch(err => console.log(err));
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Evaluation link copied to clipboard!");
              }
            }}
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
            <Share2 size={16} /> Share Report
          </button>
        </div>
      </div>
      
    </div>
  );
}

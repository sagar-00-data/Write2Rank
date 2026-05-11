import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Helper function for exponential backoff retry
async function callGeminiWithRetry(modelName: string, contents: any, maxRetries = 3) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: contents
      });
      return result;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('429');
      if (isRetryable && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const { answerText, questionText, examType } = await request.json();

    if (!answerText) {
      return NextResponse.json({ error: 'Missing answer text' }, { status: 400 });
    }

    // Specialized prompts for different exam types
    let prompt = '';

    if (examType.includes('CA')) {
      // Chartered Accountant specific evaluation
      prompt = `
      ACT AS AN EXPERT CHARTERED ACCOUNTANT EXAM EVALUATOR for ${examType}.
      
      You are evaluating a CA exam answer script. Follow ICAI (Institute of Chartered Accountants of India) evaluation standards.
      
      EVALUATION CRITERIA FOR CA EXAMS:
      1. CONCEPTUAL ACCURACY (40%): Correct application of accounting standards, auditing standards, tax laws, and financial reporting principles.
      2. LEGAL COMPLIANCE (25%): Proper citation of relevant sections, case laws, and statutory provisions.
      3. STRUCTURE & PRESENTATION (20%): Logical flow, proper headings, sub-headings, and professional formatting.
      4. PRACTICAL APPLICATION (15%): Real-world application, examples, and practical insights.
      
      ADDITIONAL CA-SPECIFIC GUIDELINES:
      - Check for compliance with relevant Accounting Standards (AS/Ind AS)
      - Verify references to Companies Act 2013 provisions
      - Evaluate tax computation accuracy (GST, Income Tax)
      - Assess audit procedure descriptions
      - Review financial statement preparation knowledge
      
      [QUESTION PAPER]:
      ${questionText || 'Not provided. Evaluate based on ICAI professional standards for ' + examType}
      
      [STUDENT ANSWER]:
      ${answerText}
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "score": number,
        "maxScore": 100,
        "confidence": number,
        "exam": "${examType}",
        "feedback": {
          "overall": "Detailed summary focusing on CA-specific strengths and areas for improvement",
          "strengths": ["string"],
          "weaknesses": ["string"]
        },
        "breakdown": [
          { "q": "Conceptual Accuracy", "topic": "Accounting Standards & Principles", "awarded": number, "max": 40, "comments": "string" },
          { "q": "Legal Compliance", "topic": "Statutory Provisions & Case Laws", "awarded": number, "max": 25, "comments": "string" },
          { "q": "Structure & Presentation", "topic": "Professional Formatting", "awarded": number, "max": 20, "comments": "string" },
          { "q": "Practical Application", "topic": "Real-world Examples", "awarded": number, "max": 15, "comments": "string" }
        ]
      }
      `;
    } else if (examType.includes('CS')) {
      // Company Secretary specific evaluation
      prompt = `
      ACT AS AN EXPERT COMPANY SECRETARY EXAM EVALUATOR for ${examType}.
      
      You are evaluating a CS exam answer script. Follow ICSI (Institute of Company Secretaries of India) evaluation standards.
      
      EVALUATION CRITERIA FOR CS EXAMS:
      1. LEGAL PROVISIONS (40%): Correct citation of Companies Act 2013, SEBI regulations, and corporate laws.
      2. SECRETARIAL PRACTICE (30%): Practical application of secretarial standards and compliance procedures.
      3. CORPORATE GOVERNANCE (20%): Understanding of governance principles and board processes.
      4. DRAFTING & COMMUNICATION (10%): Professional drafting of resolutions, notices, and reports.
      
      [QUESTION PAPER]:
      ${questionText || 'Not provided. Evaluate based on ICSI professional standards for ' + examType}
      
      [STUDENT ANSWER]:
      ${answerText}
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "score": number,
        "maxScore": 100,
        "confidence": number,
        "exam": "${examType}",
        "feedback": {
          "overall": "Summary focusing on corporate law and secretarial practice",
          "strengths": ["string"],
          "weaknesses": ["string"]
        },
        "breakdown": [
          { "q": "Legal Provisions", "topic": "Companies Act & Regulations", "awarded": number, "max": 40, "comments": "string" },
          { "q": "Secretarial Practice", "topic": "Compliance Procedures", "awarded": number, "max": 30, "comments": "string" },
          { "q": "Corporate Governance", "topic": "Governance Principles", "awarded": number, "max": 20, "comments": "string" },
          { "q": "Drafting & Communication", "topic": "Professional Drafting", "awarded": number, "max": 10, "comments": "string" }
        ]
      }
      `;
    } else {
      // Generic professional exam evaluation (original prompt)
      prompt = `
      ACT AS AN EXPERT PROFESSIONAL EXAM EVALUATOR for ${examType} exams (e.g., ICSI, ICAI).
      
      EVALUATION TASKS:
      1. Compare the [STUDENT ANSWER] below with the [QUESTION PAPER] (if provided).
      2. Grade the answer based on professional standards: Accuracy, Legal Terminology, and Structure.
      3. Award marks out of 100 total.
      
      [QUESTION PAPER]:
      ${questionText || 'Not provided. Evaluate based on general professional standards for ' + examType}
      
      [STUDENT ANSWER]:
      ${answerText}
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "score": number,
        "maxScore": 100,
        "confidence": number,
        "exam": "${examType}",
        "feedback": {
          "overall": "summary string",
          "strengths": ["string"],
          "weaknesses": ["string"]
        },
        "breakdown": [
          { "q": "Q1", "topic": "string", "awarded": number, "max": 20, "comments": "string" }
        ]
      }
      `;
    }

    try {
      const result = await callGeminiWithRetry('gemini-flash-latest', [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]);

      const feedback = result.text || '';

      // Attempt to parse JSON from response
      const jsonMatch = feedback.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Generate a unique ID
        const id = 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        // Add missing fields required by the frontend
        const enhancedResponse = {
          ...parsed,
          id,
          extractedText: answerText,
          status: 'completed',
          date: new Date().toISOString()
        };
        return NextResponse.json(enhancedResponse);
      }

      return NextResponse.json({
        error: "AI returned invalid format. Please try again.",
        raw: feedback
      }, { status: 500 });

    } catch (modelError: any) {
      console.error('Gemini Evaluation Error:', modelError);
      return NextResponse.json({
        error: `Gemini is busy. Please try again in a moment. (${modelError.message})`,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json({
      error: `System Error: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

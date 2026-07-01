import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { callModelWithRotation } from '@/lib/gemini-keys';
import { checkUserLimits, logUserUsage } from '@/lib/usage-tracker';

async function updateUserAnalytics(userId: string) {
  try {
    const { data: evals, error } = await supabaseAdmin
      .from('evaluations')
      .select('score, max_score, created_at, exam_type, ai_feedback')
      .eq('user_id', userId);

    if (error || !evals || evals.length === 0) return;

    const count = evals.length;
    const totalPercentage = evals.reduce((sum: number, e: any) => sum + (e.score / e.max_score) * 100, 0);
    const avgScore = Math.round((totalPercentage / count) * 100) / 100;

    const weakTopicsMap: Record<string, number> = {};
    const strongTopicsMap: Record<string, number> = {};

    evals.forEach((e: any) => {
      const breakdown = e.ai_feedback?.breakdown || [];
      breakdown.forEach((item: any) => {
        const topic = item.topic || 'General';
        const isStrong = (item.awarded / item.max) >= 0.75;
        if (isStrong) {
          strongTopicsMap[topic] = (strongTopicsMap[topic] || 0) + 1;
        } else {
          weakTopicsMap[topic] = (weakTopicsMap[topic] || 0) + 1;
        }
      });
    });

    const weakTopics = Object.entries(weakTopicsMap)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5);

    const strongTopics = Object.entries(strongTopicsMap)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 5);

    const trends = evals
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10)
      .map((e: any) => ({
        date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round((e.score / e.max_score) * 100)
      }));

    await supabaseAdmin
      .from('analytics')
      .upsert({
        user_id: userId,
        average_score: avgScore,
        weak_topics: weakTopics,
        strong_topics: strongTopics,
        evaluation_count: count,
        improvement_trends: trends,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

  } catch (err) {
    console.error('Error updating user analytics:', err);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { answerText, questionText, examType, userId } = await request.json();

    if (!answerText) {
      return NextResponse.json({ error: 'Missing answer text' }, { status: 400 });
    }

    const targetUserId = userId || '00000000-0000-0000-0000-000000000000';

    // Enforcement of Closed Beta user limits
    const limits = await checkUserLimits(targetUserId);
    if (!limits.allowed) {
      return NextResponse.json({ error: 'You have reached your beta evaluation limit.' }, { status: 403 });
    }

    // 5. Implement evaluation result caching
    try {
      const { data: cachedEval } = await supabaseAdmin
        .from('evaluations')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('question_text', questionText || '')
        .eq('answer_text', answerText)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedEval) {
        console.log('🎯 [Cache Hit] Returning cached evaluation:', cachedEval.id);
        const enhancedResponse = {
          ...cachedEval.ai_feedback,
          id: cachedEval.id,
          extractedText: answerText,
          status: 'completed',
          date: cachedEval.created_at
        };
        return NextResponse.json(enhancedResponse);
      }
    } catch (cacheErr) {
      console.warn('⚠️ Evaluation cache lookup failed:', cacheErr);
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
        - 
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
        const result = await callModelWithRotation(async (ai) => {
          return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              thinking_level: 'minimal',
              thinkingLevel: 'minimal'
            } as any
          });
        });
  
        const feedback = result.text || '';
  
        // Attempt to parse JSON from response
        const jsonMatch = feedback.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Generate a unique ID
          const id = 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
          
          // Save automatically to Supabase using admin client (bypasses RLS)
          try {
            const insertPayload = {
              id,
              user_id: targetUserId,
              question_text: questionText || '',
              answer_text: answerText,
              ocr_extracted_text: answerText,
              ai_feedback: parsed,
              score: parsed.score || 0,
              max_score: parsed.maxScore || 100,
              confidence: parsed.confidence || 95,
              exam_type: examType || 'General'
            };

            console.log(`📥 [DB Insert] Attempting to save text evaluation ID: ${id} for user: ${targetUserId}, exam: ${examType}`);

            const { data: insertData, error: dbError } = await supabaseAdmin
              .from('evaluations')
              .insert(insertPayload)
              .select();

            if (dbError) {
              console.error('❌ [DB Insert FAILED] Supabase error:', JSON.stringify(dbError, null, 2));
              console.error('❌ [DB Insert FAILED] Payload:', JSON.stringify({ ...insertPayload, ai_feedback: '[truncated]' }));
            } else {
              console.log(`✅ [DB Insert SUCCESS] Saved text evaluation ID: ${id}, rows: ${insertData?.length ?? 0}`);
              // Recalculate and update the analytics dashboard in real time
              await updateUserAnalytics(targetUserId);
            }
          } catch (dbErr) {
            console.error('Error in Supabase saving pipeline:', dbErr);
          }

        // Add missing fields required by the frontend
        const enhancedResponse = {
          ...parsed,
          id,
          extractedText: answerText,
          status: 'completed',
          date: new Date().toISOString()
        };

        const elapsed = Date.now() - startTime;
        await logUserUsage({
          user_id: targetUserId,
          subject: examType || 'General',
          question_length: questionText?.length || 0,
          answer_length: answerText?.length || 0,
          ocr_provider: 'None',
          gemini_model: 'gemini-3.5-flash',
          ocr_time_ms: 0,
          evaluation_time_ms: elapsed,
          total_time_ms: elapsed,
          status: 'success'
        });

        return NextResponse.json(enhancedResponse);
      }

      const elapsedFail = Date.now() - startTime;
      await logUserUsage({
        user_id: targetUserId,
        subject: examType || 'General',
        question_length: questionText?.length || 0,
        answer_length: answerText?.length || 0,
        ocr_provider: 'None',
        gemini_model: 'gemini-3.5-flash',
        ocr_time_ms: 0,
        evaluation_time_ms: elapsedFail,
        total_time_ms: elapsedFail,
        status: 'failure'
      });

      return NextResponse.json({
        error: "AI returned invalid format. Please try again.",
        raw: feedback
      }, { status: 500 });

    } catch (modelError: any) {
      console.error('Gemini Evaluation Error:', modelError);
      const errorMsg = modelError.message || '';
      const isQuota = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      const friendlyMsg = isQuota
        ? "⚠️ Gemini AI Free Tier quota has been fully exhausted across all rotated API keys. Please try upgrading your key or try again later."
        : `Gemini is busy. Please try again in a moment. (${modelError.message})`;

      const elapsedFail = Date.now() - startTime;
      await logUserUsage({
        user_id: targetUserId,
        subject: examType || 'General',
        question_length: questionText?.length || 0,
        answer_length: answerText?.length || 0,
        ocr_provider: 'None',
        gemini_model: 'gemini-3.5-flash',
        ocr_time_ms: 0,
        evaluation_time_ms: elapsedFail,
        total_time_ms: elapsedFail,
        status: 'failure'
      });

      return NextResponse.json({
        error: friendlyMsg,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    const elapsedFail = Date.now() - startTime;
    await logUserUsage({
      user_id: '00000000-0000-0000-0000-000000000000',
      subject: 'General',
      question_length: 0,
      answer_length: 0,
      ocr_provider: 'None',
      gemini_model: 'gemini-3.5-flash',
      ocr_time_ms: 0,
      evaluation_time_ms: elapsedFail,
      total_time_ms: elapsedFail,
      status: 'failure'
    });
    return NextResponse.json({
      error: `System Error: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

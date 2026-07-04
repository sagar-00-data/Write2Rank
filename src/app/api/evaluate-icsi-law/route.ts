import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { runCorrectiveRag, evaluateAnswerMultimodalStream } from '@/services/rag-core/services/rag-service';
import { logUserUsage } from '@/lib/usage-tracker';
import { getOrUpdateUserLimits, incrementEvaluationUsage } from '@/lib/limits';

async function updateCSUserAnalytics(userId: string) {
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
    const { questionText, answerText, base64Image, mimeType, userId } = await request.json();

    const targetUserId = userId || '00000000-0000-0000-0000-000000000000';

    // Verify user limits & status
    const limits = await getOrUpdateUserLimits(targetUserId);
    if (limits.status === 'Suspended' || (limits.evalLimit !== -1 && limits.evalsUsedToday >= limits.evalLimit)) {
      const reason = limits.status === 'Suspended' 
        ? 'Account suspended. Please contact founder.' 
        : `Daily evaluation limit reached (${limits.evalsUsedToday}/${limits.evalLimit}). Limit resets daily.`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`⚠️ ${reason}`));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Implement evaluation result caching (read-only, uses admin for consistency)
    try {
      const { data: cachedEval } = await supabaseAdmin
        .from('evaluations')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('question_text', questionText || '')
        .eq('answer_text', answerText || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedEval) {
        console.log('🎯 [Cache Hit] Returning cached evaluation stream:', cachedEval.id);
        const encoder = new TextEncoder();
        const markdown = cachedEval.ai_feedback?.markdown || cachedEval.ai_feedback?.overall || '';

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`---EVAL_ID:${cachedEval.id}---\n`));
            
            const breakdown = cachedEval.ai_feedback?.breakdown || [];
            const metricsBlock = `---METRICS_START---
Legal Provisions & Citations: ${breakdown[0]?.awarded || 0}/35
Analysis & Application: ${breakdown[1]?.awarded || 0}/35
Conclusion: ${breakdown[2]?.awarded || 0}/15
Secretarial Formatting: ${breakdown[3]?.awarded || 0}/15
Total Score: ${cachedEval.score}/100
---METRICS_END---\n`;
            controller.enqueue(encoder.encode(metricsBlock));
            controller.enqueue(encoder.encode(markdown));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
          },
        });
      }
    } catch (cacheErr) {
      console.warn('⚠️ Evaluation cache lookup failed:', cacheErr);
    }

    console.log('🤖 Running Corrective RAG search for ICSI Company Law...');
    const ragResult = await runCorrectiveRag(questionText || '', answerText || '');

    // Parse URL parameter to check for Founder Benchmark Mode
    let isBenchmarkMode = false;
    try {
      const { searchParams } = new URL(request.url);
      isBenchmarkMode = searchParams.get('isBenchmark') === 'true';
    } catch (e) {}

    // Generate a unique ID upfront to send to client
    const evalId = 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const encoder = new TextEncoder();

    if (isBenchmarkMode) {
      console.log('⚙️ [Founder Benchmark Mode] Initializing consistency evaluation runs...');
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`---EVAL_ID:${evalId}---\n`));
            controller.enqueue(encoder.encode(`### FOUNDER BENCHMARK MODE REPORT\n`));

            // Execute 3 runs in parallel
            const runPromises = Array.from({ length: 3 }).map(async (_, idx) => {
              const runStream = await evaluateAnswerMultimodalStream(
                questionText || '',
                base64Image || '',
                mimeType || 'image/jpeg',
                ragResult.context,
                answerText || ''
              );
              const runReader = runStream.getReader();
              let text = '';
              while (true) {
                const { done, value } = await runReader.read();
                if (done) break;
                text += new TextDecoder().decode(value);
              }
              // Extract the total score from metrics
              const totalScoreMatch = text.match(/Total Score:\s*(\d+)/i);
              const rubricScoreMatch = text.match(/Overall Marks:\s*([\d.]+)/i);
              const score = totalScoreMatch ? parseInt(totalScoreMatch[1], 10) : 0;
              const rubricScore = rubricScoreMatch ? parseFloat(rubricScoreMatch[1]) : (score / 20);
              return { rubricScore, text };
            });

            const results = await Promise.all(runPromises);
            const scores = results.map(r => r.rubricScore);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            
            // Calculate Standard Deviation
            const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            const isUnstable = stdDev > 0.25;

            const benchmarkReport = `
| Run | Rubric Mark Awarded (/5.0) |
| --- | --- |
| Run 1 | ${scores[0].toFixed(2)} |
| Run 2 | ${scores[1].toFixed(2)} |
| Run 3 | ${scores[2].toFixed(2)} |

**Consistency Metrics:**
- **Average Mark**: ${avg.toFixed(2)} / 5.0
- **Maximum Mark**: ${max.toFixed(2)}
- **Minimum Mark**: ${min.toFixed(2)}
- **Standard Deviation**: ${stdDev.toFixed(3)}
- **Stability Status**: ${isUnstable ? '⚠️ UNSTABLE (Deviation exceeds ±0.25 marks)' : '✅ STABLE'}

${isUnstable ? '> [!WARNING]\n> The prompt has been flagged as UNSTABLE. Please tune the scoring rules or check context alignment.' : ''}

---
### RUN 1 DETAILED REPORT
${results[0].text.replace(/---METRICS_START---[\s\S]*?---METRICS_END---/, '').trim()}
`;
            controller.enqueue(encoder.encode(benchmarkReport));
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL FIX: Collect the ENTIRE AI output BEFORE returning a response.
    // Previously the DB insert ran after controller.close() inside the stream
    // start() callback.  On Vercel, the serverless function is terminated the
    // moment the stream closes, so the await supabaseAdmin.insert() was killed
    // before it completed — silently dropping every evaluation.
    //
    // New approach:
    //   1. Read the full AI output into a buffer (server-side, synchronous).
    //   2. Parse scores and build the payload.
    //   3. INSERT into Supabase — and AWAIT it fully.
    //   4. Only then construct a ReadableStream from the buffer and return it.
    // ─────────────────────────────────────────────────────────────────────────

    // Step 1 — drain the AI stream into a string buffer
    const ocrStream = await evaluateAnswerMultimodalStream(
      questionText || '',
      base64Image || '',
      mimeType || 'image/jpeg',
      ragResult.context,
      answerText || ''
    );

    const reader = ocrStream.getReader();
    let fullGeneratedText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullGeneratedText += new TextDecoder().decode(value);
    }

    // Step 2 — parse scores
    let extractedAnswer = answerText;
    const extractedTextMatch = fullGeneratedText.match(/---EXTRACTED_TEXT_START---([\s\S]*?)---EXTRACTED_TEXT_END---/);
    if (extractedTextMatch) {
      extractedAnswer = extractedTextMatch[1].trim();
    }

    const cleanMarkdown = fullGeneratedText
      .replace(/---EXTRACTED_TEXT_START---[\s\S]*?---EXTRACTED_TEXT_END---/, '')
      .trim();

    const provisionsMatch  = cleanMarkdown.match(/Legal Provisions & Citations:\s*(\d+)/i);
    const analysisMatch    = cleanMarkdown.match(/Analysis & Application:\s*(\d+)/i);
    const conclusionMatch  = cleanMarkdown.match(/Conclusion:\s*(\d+)/i);
    const formattingMatch  = cleanMarkdown.match(/Secretarial Formatting:\s*(\d+)/i);
    const totalScoreMatch  = cleanMarkdown.match(/Total Score:\s*(\d+)/i);

    const scoreProvisions = provisionsMatch ? (parseInt(provisionsMatch[1], 10) || 0) : 0;
    const scoreAnalysis   = analysisMatch   ? (parseInt(analysisMatch[1],   10) || 0) : 0;
    const scoreConclusion = conclusionMatch ? (parseInt(conclusionMatch[1], 10) || 0) : 0;
    const scoreFormatting = formattingMatch ? (parseInt(formattingMatch[1], 10) || 0) : 0;

    let totalScore = totalScoreMatch
      ? (parseInt(totalScoreMatch[1], 10) || 0)
      : scoreProvisions + scoreAnalysis + scoreConclusion + scoreFormatting;
    totalScore = Math.max(0, Math.min(100, isNaN(totalScore) ? 0 : totalScore));

    const aiFeedbackObj = {
      markdown: cleanMarkdown,
      breakdown: [
        { q: 'Legal Provisions',    topic: 'Companies Act & Case Laws',   awarded: scoreProvisions, max: 35, comments: 'Verification of cited sections' },
        { q: 'Analysis & Application', topic: 'Facts Parsing',            awarded: scoreAnalysis,   max: 35, comments: 'Application of law to facts' },
        { q: 'Conclusion',          topic: 'Legal Stance',                awarded: scoreConclusion, max: 15, comments: 'Definitive conclusion review' },
        { q: 'Secretarial Formatting', topic: 'Professional Structure',   awarded: scoreFormatting, max: 15, comments: 'Provisions -> Analysis -> Conclusion formatting' },
      ],
      crag_attempts: ragResult.attempts,
    };

    // Step 3 — INSERT into Supabase (fully awaited BEFORE response is sent)
    const insertPayload = {
      id: evalId,
      user_id: targetUserId,
      question_text: questionText || '',
      answer_text: extractedAnswer || answerText || '',
      ocr_extracted_text: extractedAnswer || answerText || '',
      ai_feedback: aiFeedbackObj,
      score: totalScore,
      max_score: 100,
      confidence: 95,
      exam_type: 'CS Executive - Company Law',
    };

    console.log(`📥 [DB Insert] Saving evaluation ${evalId} for user ${targetUserId}`);
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('evaluations')
      .insert(insertPayload)
      .select();

    if (insertError) {
      console.error('❌ [DB Insert FAILED]', JSON.stringify(insertError));
      console.error('❌ [DB Insert FAILED] payload:', JSON.stringify({ ...insertPayload, ai_feedback: '[omitted]' }));
    } else {
      console.log(`✅ [DB Insert OK] id=${evalId} rows=${insertData?.length ?? 0}`);
      // Fire-and-forget secondary updates (analytics, usage) — these are non-critical
      Promise.all([
        incrementEvaluationUsage(targetUserId),
        updateCSUserAnalytics(targetUserId),
        logUserUsage({
          user_id: targetUserId,
          subject: 'CS Executive - Company Law',
          question_length: questionText?.length || 0,
          answer_length: (extractedAnswer || answerText)?.length || 0,
          ocr_provider: fullGeneratedText.includes('OCR.Space') ? 'OCR.Space' : 'Gemini Vision',
          gemini_model: 'gemini-2.5-flash',
          ocr_time_ms: 0,
          evaluation_time_ms: Date.now() - startTime,
          total_time_ms: Date.now() - startTime,
          status: 'success',
        }),
      ]).catch((e) => console.error('Secondary post-save operations failed:', e));
    }

    // Step 4 — stream the already-buffered text back to the client
    const responseText = `---EVAL_ID:${evalId}---\n${fullGeneratedText}`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(responseText));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (err: any) {
    console.error('CRAG Evaluation API Route Error:', err);
    const elapsedFail = Date.now() - startTime;
    await logUserUsage({
      user_id: '00000000-0000-0000-0000-000000000000',
      subject: 'CS Executive - Company Law',
      question_length: 0,
      answer_length: 0,
      ocr_provider: 'Gemini Vision',
      gemini_model: 'gemini-3.5-flash',
      ocr_time_ms: 0,
      evaluation_time_ms: elapsedFail,
      total_time_ms: elapsedFail,
      status: 'failure'
    });
    return NextResponse.json({
      error: `Evaluation pipeline failed. Root cause: ${err.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

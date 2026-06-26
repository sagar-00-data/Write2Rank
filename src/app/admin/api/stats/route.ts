import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch Users
    let totalUsers = 0;
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        totalUsers = count;
      }
    } catch (e) {
      console.error('Error fetching users count:', e);
    }

    // 2. Fetch User Usage Logs
    let userLogs: any[] = [];
    try {
      const { data, error } = await supabase
        .from('user_usage_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data) {
        userLogs = data;
      }
    } catch (e) {
      console.error('Error fetching user usage logs:', e);
    }

    // 3. Fetch Gemini Usage Logs
    let geminiLogs: any[] = [];
    try {
      const { data, error } = await supabase
        .from('gemini_usage_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        geminiLogs = data;
      }
    } catch (e) {
      console.error('Error fetching gemini usage logs:', e);
    }

    // 4. Fetch RAG chunks
    let ragChunksCount = 0;
    let documentsIndexed: string[] = [];
    try {
      const { data, error } = await supabase
        .from('icsi_knowledge_embeddings')
        .select('metadata');
      if (!error && data) {
        ragChunksCount = data.length;
        const docs = new Set<string>();
        data.forEach((row: any) => {
          if (row.metadata?.source_file) {
            docs.add(row.metadata.source_file);
          }
        });
        documentsIndexed = Array.from(docs);
      }
    } catch (e) {
      console.error('Error fetching RAG embeddings:', e);
    }

    // --- AGGREGATION & COMPUTATION ---
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Platform
    const evalsToday = userLogs.filter((l) => new Date(l.timestamp) >= startOfToday).length;
    const activeUsersTodaySet = new Set(
      userLogs
        .filter((l) => new Date(l.timestamp) >= startOfToday)
        .map((l) => l.user_id)
    );
    const activeUsersToday = activeUsersTodaySet.size;

    // OCR Metrics
    const ocrLogsToday = userLogs.filter(
      (l) => l.ocr_provider !== 'None' && new Date(l.timestamp) >= startOfToday
    );
    const ocrRequestsToday = ocrLogsToday.length;

    const ocrRuns = userLogs.filter((l) => l.ocr_provider !== 'None');
    const successfulOcrRuns = ocrRuns.filter((l) => l.status === 'success');
    const ocrSuccessRate =
      ocrRuns.length > 0 ? Math.round((successfulOcrRuns.length / ocrRuns.length) * 100) : 100;

    const successfulRuns = userLogs.filter((l) => l.status === 'success');
    const totalOcrTime = successfulRuns.reduce((acc, l) => acc + (l.ocr_time_ms || 0), 0);
    const avgOcrTime = successfulRuns.length > 0 ? Math.round(totalOcrTime / successfulRuns.length) : 0;

    const ocrFailures = userLogs.filter(
      (l) => l.ocr_provider !== 'None' && l.status === 'failure'
    ).length;

    // AI Metrics
    const geminiRequests = geminiLogs.length;
    const tokensUsed = geminiLogs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);
    const totalEvalTime = successfulRuns.reduce((acc, l) => acc + (l.evaluation_time_ms || 0), 0);
    const avgEvalTime = successfulRuns.length > 0 ? Math.round(totalEvalTime / successfulRuns.length) : 0;
    const failedEvaluations = userLogs.filter((l) => l.status === 'failure').length;

    // Costs
    const todayGeminiCost = geminiLogs
      .filter((l) => new Date(l.created_at) >= startOfToday)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || 0), 0);

    const monthlyGeminiCost = geminiLogs
      .filter((l) => new Date(l.created_at) >= startOfMonth)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || 0), 0);

    // Let's assume OCR Space calls are free or cost a nominal amount (e.g. $0)
    const ocrCost = 0; 
    const estimatedMonthlyTotal = monthlyGeminiCost + ocrCost;

    // RAG Status
    // Assume successful retrievals are equal to evaluations that used the RAG service (law exams)
    const ragEvals = userLogs.filter((l) => l.subject?.toLowerCase().includes('law'));
    const successfulRetrievals = ragEvals.filter((l) => l.status === 'success').length;
    const failedRetrievals = ragEvals.filter((l) => l.status === 'failure').length;

    // API Keys Health Check
    const keysSet = new Set<string>();
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(',').forEach((k) => {
        const trimmed = k.trim();
        if (trimmed) keysSet.add(trimmed);
      });
    }
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) keysSet.add(key.trim());
    }
    if (process.env.GEMINI_API_KEY) {
      keysSet.add(process.env.GEMINI_API_KEY.trim());
    }
    const keysList = Array.from(keysSet);

    // Errors
    const ocrErrors = userLogs
      .filter((l) => l.ocr_provider !== 'None' && l.status === 'failure')
      .map((l) => ({
        time: l.timestamp,
        message: `OCR error during evaluation for user ${l.user_id.substring(0, 8)}`,
      }));

    const geminiErrors: any[] = [];
    const ragErrors: any[] = [];
    
    // Aggregate recent user log errors
    userLogs
      .filter((l) => l.status === 'failure')
      .slice(0, 10)
      .forEach((l) => {
        const errObj = {
          time: l.timestamp,
          message: `Evaluation failed: Subject "${l.subject}" | Model: ${l.gemini_model || 'Unknown'}`,
        };
        if (l.subject?.toLowerCase().includes('law')) {
          ragErrors.push(errObj);
        } else {
          geminiErrors.push(errObj);
        }
      });

    // Chart Data Preparation (last 7 days of evaluations, active users, and API calls)
    const dailyStatsMap = new Map<string, { date: string; evaluations: number; apiCalls: number; activeUsers: Set<string> }>();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dailyStatsMap.set(dateStr, { date: dateStr, evaluations: 0, apiCalls: 0, activeUsers: new Set<string>() });
    }

    userLogs.forEach((l) => {
      const dateStr = new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (dailyStatsMap.has(dateStr)) {
        const stats = dailyStatsMap.get(dateStr)!;
        stats.evaluations++;
        if (l.user_id) {
          stats.activeUsers.add(l.user_id);
        }
      }
    });

    geminiLogs.forEach((l) => {
      const dateStr = new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (dailyStatsMap.has(dateStr)) {
        const stats = dailyStatsMap.get(dateStr)!;
        stats.apiCalls++;
      }
    });

    const chartData = Array.from(dailyStatsMap.values()).map((s) => ({
      date: s.date,
      evaluations: s.evaluations,
      apiCalls: s.apiCalls,
      activeUsers: s.activeUsers.size,
    }));

    return NextResponse.json({
      platform: {
        totalUsers,
        activeUsersToday,
        totalEvaluations: userLogs.length,
        evalsToday,
      },
      ocr: {
        ocrRequestsToday,
        ocrSuccessRate,
        avgOcrTime,
        ocrFailures,
      },
      ai: {
        geminiRequests,
        tokensUsed,
        avgEvaluationTime: avgEvalTime,
        failedEvaluations,
      },
      cost: {
        todayGeminiCost,
        monthlyGeminiCost,
        ocrCost,
        estimatedMonthlyTotal,
      },
      rag: {
        documentsIndexed: documentsIndexed.length,
        documentsList: documentsIndexed,
        chunks: ragChunksCount,
        embeddings: ragChunksCount, // Each chunk has a vector embedding
        successfulRetrievals,
        failedRetrievals,
      },
      apiKeys: {
        activeKeys: keysList.length,
        healthyKeys: keysList.length, // Currently simple count of keys
        exhaustedKeys: 0,
        rotationStatus: keysList.length > 1 ? 'Active (Round-Robin)' : 'Single Key',
        keys: keysList.map((k) => ({
          masked: k.substring(0, 6) + '...' + k.substring(k.length - 4),
          status: 'Healthy',
        })),
      },
      errors: {
        ocrErrors: ocrErrors.slice(0, 5),
        geminiErrors: geminiErrors.slice(0, 5),
        ragErrors: ragErrors.slice(0, 5),
        buildErrors: [], // No dynamic build failures to expose
      },
      chartData,
    });
  } catch (err: any) {
    console.error('Failed to aggregate admin statistics:', err);
    return NextResponse.json(
      { error: 'Failed to aggregate statistics.' },
      { status: 500 }
    );
  }
}

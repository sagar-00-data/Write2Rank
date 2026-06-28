import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Safe query helper — never throws, returns empty array on any failure
async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn('[Stats API] Query warning:', error.message || error);
      return (Array.isArray([] as unknown as T) ? [] : null) as unknown as T;
    }
    return data ?? ([] as unknown as T);
  } catch (e: any) {
    console.warn('[Stats API] Query exception:', e.message);
    return ([] as unknown as T);
  }
}

async function safeCount(fn: () => Promise<{ count: number | null; error: any }>): Promise<number> {
  try {
    const { count, error } = await fn();
    if (error) {
      console.warn('[Stats API] Count warning:', error.message || error);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    // ──────────────────────────────────────────────────────────────
    // 1. FETCH RAW DATA
    // ──────────────────────────────────────────────────────────────
    const [userLogs, geminiLogs, totalUsers] = await Promise.all([
      safeQuery<any[]>(() =>
        supabaseServer
          .from('user_usage_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5000)
      ),
      safeQuery<any[]>(() =>
        supabaseServer
          .from('gemini_usage_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5000)
      ),
      safeCount(() =>
        supabaseServer
          .from('users')
          .select('*', { count: 'exact', head: true })
      ),
    ]);

    // RAG chunks (best effort)
    let ragChunksCount = 0;
    let documentsIndexed: string[] = [];
    try {
      const { data: ragData } = await supabaseServer
        .from('icsi_knowledge_embeddings')
        .select('metadata')
        .limit(10000);
      if (ragData) {
        ragChunksCount = ragData.length;
        const docs = new Set<string>();
        ragData.forEach((row: any) => {
          if (row.metadata?.source_file) docs.add(row.metadata.source_file);
        });
        documentsIndexed = Array.from(docs);
      }
    } catch { /* optional table */ }

    // ──────────────────────────────────────────────────────────────
    // 2. DATE BOUNDARIES
    // ──────────────────────────────────────────────────────────────
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfToday.getDate() - 1);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    // ──────────────────────────────────────────────────────────────
    // 3. FILTER LOGS BY DATE
    // ──────────────────────────────────────────────────────────────
    const logsToday = userLogs.filter(l => new Date(l.timestamp) >= startOfToday);
    const logsYesterday = userLogs.filter(l => {
      const t = new Date(l.timestamp);
      return t >= startOfYesterday && t < startOfToday;
    });
    const logsThisWeek = userLogs.filter(l => new Date(l.timestamp) >= startOfWeek);

    const successfulEvals = userLogs.filter(l => l.status === 'success');
    const failedEvals = userLogs.filter(l => l.status === 'failure');

    // ──────────────────────────────────────────────────────────────
    // 4. PLATFORM LATENCY
    // ──────────────────────────────────────────────────────────────
    const evalTimes = successfulEvals.map(l => l.evaluation_time_ms).filter(t => t > 0);
    const ocrTimes = successfulEvals.map(l => l.ocr_time_ms).filter(t => t > 0);
    const totalTimes = successfulEvals.map(l => l.total_time_ms).filter(t => t > 0);

    const avgEvaluationTime = evalTimes.length > 0 ? Math.round(evalTimes.reduce((s, v) => s + v, 0) / evalTimes.length) : 0;
    const avgOcrTime = ocrTimes.length > 0 ? Math.round(ocrTimes.reduce((s, v) => s + v, 0) / ocrTimes.length) : 0;
    const avgResponseTime = totalTimes.length > 0 ? Math.round(totalTimes.reduce((s, v) => s + v, 0) / totalTimes.length) : 0;
    const fastestEvaluation = totalTimes.length > 0 ? (Math.min(...totalTimes) / 1000).toFixed(2) : '0.00';
    const slowestEvaluation = totalTimes.length > 0 ? (Math.max(...totalTimes) / 1000).toFixed(2) : '0.00';

    // ──────────────────────────────────────────────────────────────
    // 5. USER ACTIVITY
    // ──────────────────────────────────────────────────────────────
    const activeUsersTodaySet = new Set(logsToday.map(l => l.user_id));
    const activeUsersToday = activeUsersTodaySet.size;

    // ──────────────────────────────────────────────────────────────
    // 6. OCR STATS
    // ──────────────────────────────────────────────────────────────
    const ocrRuns = userLogs.filter(l => l.ocr_provider && l.ocr_provider !== 'None');
    const ocrRunsToday = logsToday.filter(l => l.ocr_provider && l.ocr_provider !== 'None');
    const ocrRunsThisMonth = userLogs.filter(l => l.ocr_provider && l.ocr_provider !== 'None' && new Date(l.timestamp) >= startOfMonth);

    const geminiOcrRunsToday = ocrRunsToday.filter(l =>
      l.ocr_provider?.toLowerCase().includes('gemini') || l.ocr_provider?.toLowerCase().includes('vision')
    ).length;
    const geminiOcrRunsThisMonth = ocrRunsThisMonth.filter(l =>
      l.ocr_provider?.toLowerCase().includes('gemini') || l.ocr_provider?.toLowerCase().includes('vision')
    ).length;
    const ocrSpaceFallbackCount = ocrRuns.filter(l => l.ocr_provider?.toLowerCase().includes('space')).length;

    const successfulOcrRuns = ocrRuns.filter(l => l.status === 'success');
    const ocrSuccessRate = ocrRuns.length > 0 ? Math.round((successfulOcrRuns.length / ocrRuns.length) * 100) : 100;
    const ocrFailureRate = 100 - ocrSuccessRate;

    // ──────────────────────────────────────────────────────────────
    // 7. COST CALCULATION
    // ──────────────────────────────────────────────────────────────
    const todayGeminiCost = geminiLogs
      .filter(l => new Date(l.created_at) >= startOfToday)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || '0'), 0);

    const monthlyGeminiCost = geminiLogs
      .filter(l => new Date(l.created_at) >= startOfMonth)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || '0'), 0);

    const totalTokensUsed = geminiLogs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);
    const avgTokensPerEval = userLogs.length > 0 ? Math.round(totalTokensUsed / userLogs.length) : 0;
    const totalCostAllTime = geminiLogs.reduce((acc, l) => acc + parseFloat(l.estimated_cost || '0'), 0);
    const avgCostPerEval = userLogs.length > 0 ? totalCostAllTime / userLogs.length : 0;

    // ──────────────────────────────────────────────────────────────
    // 8. API KEY POOL
    // ──────────────────────────────────────────────────────────────
    const keysSet = new Set<string>();
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(',').forEach(k => { const t = k.trim(); if (t) keysSet.add(t); });
    }
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) keysSet.add(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keysSet.add(process.env.GEMINI_API_KEY.trim());

    const keysList = Array.from(keysSet);
    const keySlotData = keysList.map((k, index) => {
      const masked = k.substring(0, 6) + '...' + k.substring(k.length - 4);
      const keyCalls = geminiLogs.filter(l => l.api_key_used === masked);
      const todayCalls = keyCalls.filter(l => new Date(l.created_at) >= startOfToday);
      const isActive = index === (geminiLogs.length % Math.max(keysList.length, 1));
      const rotationCount = keyCalls.length;
      const has429 = keyCalls.some(l => l.is_429);
      return {
        slot: `Key ${index + 1}`,
        masked,
        status: has429 ? 'Rate Limited' : 'Healthy',
        todayRequests: todayCalls.length,
        estimatedRemaining: Math.max(1500 - todayCalls.length, 0),
        isActive,
        lastUsedTime: keyCalls[0]?.created_at || null,
        rotationCount,
        totalTokens: keyCalls.reduce((s, l) => s + (l.total_tokens || 0), 0),
      };
    });

    // ──────────────────────────────────────────────────────────────
    // 9. ERROR AGGREGATION
    // ──────────────────────────────────────────────────────────────
    const errorMap: Record<string, { message: string; count: number; lastOccurred: string; type: string; module: string; severity: string }> = {};
    let ocrErrorCount = 0;
    let evalErrorCount = 0;

    failedEvals.forEach(l => {
      const isOcr = l.ocr_provider && l.ocr_provider !== 'None';
      const errorMsg = l.error_message
        || (isOcr ? `OCR extraction failed (${l.ocr_provider})` : `AI evaluation failed — ${l.subject || 'General'}`);
      const type = isOcr ? 'OCR' : 'AI';
      if (isOcr) ocrErrorCount++; else evalErrorCount++;

      if (!errorMap[errorMsg]) {
        errorMap[errorMsg] = { message: errorMsg, count: 0, lastOccurred: l.timestamp, type, module: type, severity: 'High' };
      }
      errorMap[errorMsg].count++;
      if (new Date(l.timestamp) > new Date(errorMap[errorMsg].lastOccurred)) {
        errorMap[errorMsg].lastOccurred = l.timestamp;
      }
    });

    const errorList = Object.values(errorMap).sort((a, b) => b.count - a.count);

    // ──────────────────────────────────────────────────────────────
    // 10. LIVE ACTIVITY FEED
    // ──────────────────────────────────────────────────────────────
    const liveActivity: Array<{ id: string; time: string; event: string; type: string; module: string }> = [];
    userLogs.slice(0, 20).forEach((l, idx) => {
      const time = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (l.status === 'success') {
        liveActivity.push({
          id: `evt_${idx}_eval`,
          time,
          event: `✓ Evaluation completed — ${l.subject || 'General'} in ${l.total_time_ms ? (l.total_time_ms / 1000).toFixed(1) : '?'}s`,
          type: 'success',
          module: 'Evaluator',
        });
        if (l.ocr_provider && l.ocr_provider !== 'None') {
          liveActivity.push({
            id: `evt_${idx}_ocr`,
            time,
            event: `📷 OCR extraction — ${l.ocr_provider} (${l.ocr_time_ms || 0}ms)`,
            type: 'info',
            module: 'OCR',
          });
        }
      } else {
        liveActivity.push({
          id: `evt_${idx}_err`,
          time,
          event: `✗ Evaluation failed — ${l.subject || 'General'} ${l.error_message ? `(${l.error_message.slice(0, 60)})` : ''}`,
          type: 'error',
          module: 'Evaluator',
        });
      }
    });

    // ──────────────────────────────────────────────────────────────
    // 11. CHART DATA — Last 7 days
    // ──────────────────────────────────────────────────────────────
    const dailyStatsMap = new Map<string, {
      date: string; label: string;
      evaluations: number; ocrRequests: number; apiCalls: number;
      latencySum: number; successCount: number; errorCount: number; cost: number;
    }>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dailyStatsMap.set(key, { date: key, label, evaluations: 0, ocrRequests: 0, apiCalls: 0, latencySum: 0, successCount: 0, errorCount: 0, cost: 0 });
    }

    userLogs.forEach(l => {
      const key = new Date(l.timestamp).toISOString().split('T')[0];
      if (dailyStatsMap.has(key)) {
        const s = dailyStatsMap.get(key)!;
        s.evaluations++;
        if (l.status === 'success') { s.successCount++; s.latencySum += (l.total_time_ms || 0); }
        else { s.errorCount++; }
        if (l.ocr_provider && l.ocr_provider !== 'None') s.ocrRequests++;
      }
    });

    geminiLogs.forEach(l => {
      const key = new Date(l.created_at).toISOString().split('T')[0];
      if (dailyStatsMap.has(key)) {
        const s = dailyStatsMap.get(key)!;
        s.apiCalls++;
        s.cost += parseFloat(l.estimated_cost || '0');
      }
    });

    const chartData = Array.from(dailyStatsMap.values()).map(s => ({
      date: s.label,
      evaluations: s.evaluations,
      ocrRequests: s.ocrRequests,
      apiCalls: s.apiCalls,
      avgLatency: s.successCount > 0 ? parseFloat((s.latencySum / s.successCount / 1000).toFixed(2)) : 0,
      errorsCount: s.errorCount,
      cost: parseFloat(s.cost.toFixed(6)),
    }));

    // ──────────────────────────────────────────────────────────────
    // 12. SYSTEM HEALTH
    // ──────────────────────────────────────────────────────────────
    const recentFailRate = logsToday.length > 5
      ? (logsToday.filter(l => l.status === 'failure').length / logsToday.length) * 100
      : 0;

    const overallHealth = recentFailRate > 50 ? 'Red' : recentFailRate > 20 ? 'Yellow' : 'Green';
    const geminiHealth = keysList.length === 0 ? 'Red' : keySlotData.some(k => k.status === 'Rate Limited') ? 'Yellow' : 'Green';
    const ocrHealth = ocrFailureRate > 30 ? 'Yellow' : 'Green';
    const ragHealth = ragChunksCount > 0 ? 'Green' : 'Yellow';

    // ──────────────────────────────────────────────────────────────
    // 13. AI INSIGHTS
    // ──────────────────────────────────────────────────────────────
    const insights: Array<{ text: string; type: 'info' | 'warning' | 'success' | 'critical' }> = [];

    // Eval volume change
    const todayCount = logsToday.length;
    const yesterdayCount = logsYesterday.length;
    if (yesterdayCount > 0) {
      const pctChange = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      if (pctChange > 0) {
        insights.push({ text: `Evaluation volume up ${pctChange}% vs yesterday (${todayCount} today, ${yesterdayCount} yesterday).`, type: 'success' });
      } else if (pctChange < 0) {
        insights.push({ text: `Evaluation volume down ${Math.abs(pctChange)}% vs yesterday (${todayCount} today, ${yesterdayCount} yesterday).`, type: 'info' });
      } else {
        insights.push({ text: `Evaluation volume steady at ${todayCount} evaluations today.`, type: 'info' });
      }
    } else if (todayCount > 0) {
      insights.push({ text: `${todayCount} evaluation${todayCount > 1 ? 's' : ''} processed today — first usage detected.`, type: 'success' });
    }

    // API key warnings
    keySlotData.forEach(k => {
      if (k.estimatedRemaining < 100) {
        insights.push({ text: `${k.slot} (${k.masked}) is approaching its daily quota — only ~${k.estimatedRemaining} requests remaining.`, type: 'warning' });
      }
      if (k.status === 'Rate Limited') {
        insights.push({ text: `${k.slot} (${k.masked}) has been rate limited (429). Rotation is handling this automatically.`, type: 'critical' });
      }
    });

    // OCR fallbacks
    if (ocrSpaceFallbackCount > 0) {
      insights.push({ text: `OCR.Space fallback triggered ${ocrSpaceFallbackCount} time${ocrSpaceFallbackCount > 1 ? 's' : ''} — Gemini Vision may be experiencing issues.`, type: 'warning' });
    }

    // Cost warning
    if (monthlyGeminiCost > 1.0) {
      insights.push({ text: `Monthly API spend has reached $${monthlyGeminiCost.toFixed(4)} — approaching paid tier threshold.`, type: 'warning' });
    } else {
      insights.push({ text: `Monthly API cost is $${monthlyGeminiCost.toFixed(4)} — well within free tier budget.`, type: 'success' });
    }

    // RAG health
    if (ragChunksCount === 0) {
      insights.push({ text: 'RAG knowledge base appears empty — ICSI paragraph embeddings may not be indexed yet.', type: 'warning' });
    } else {
      insights.push({ text: `RAG knowledge index healthy: ${ragChunksCount} chunks from ${documentsIndexed.length} document${documentsIndexed.length !== 1 ? 's' : ''}.`, type: 'success' });
    }

    // No data yet
    if (userLogs.length === 0) {
      insights.push({ text: 'No evaluation telemetry recorded yet. Run your first evaluation to start collecting metrics.', type: 'info' });
    }

    // ──────────────────────────────────────────────────────────────
    // 14. TODAY SUMMARY
    // ──────────────────────────────────────────────────────────────
    const todaySuccessRate = logsToday.length > 0
      ? Math.round((logsToday.filter(l => l.status === 'success').length / logsToday.length) * 100)
      : 100;

    return NextResponse.json({
      platform: {
        totalEvaluations: userLogs.length,
        evalsToday: logsToday.length,
        evalsYesterday: logsYesterday.length,
        evalsThisWeek: logsThisWeek.length,
        avgEvaluationTime,
        avgResponseTime,
        successfulEvaluations: successfulEvals.length,
        failedEvaluations: failedEvals.length,
        totalUsers,
        activeUsersToday,
      },
      ocr: {
        geminiOcrRequestsToday: geminiOcrRunsToday,
        geminiOcrRequestsThisMonth: geminiOcrRunsThisMonth,
        ocrSuccessRate,
        ocrFailureRate,
        avgOcrTime,
        ocrSpaceFallbackCount,
        mostCommonOcrErrors: errorList.filter(e => e.type === 'OCR').slice(0, 3),
        ocrQueueStatus: ocrRunsToday.length > 50 ? 'Busy' : 'Idle',
        totalOcrRuns: ocrRuns.length,
      },
      apiKeys: {
        activeKeys: keysList.length,
        healthyKeys: keySlotData.filter(k => k.status === 'Healthy').length,
        exhaustedKeys: keySlotData.filter(k => k.status === 'Rate Limited').length,
        rotationStatus: keysList.length > 1 ? `Round-Robin (${keysList.length} keys)` : 'Single Key Mode',
        keys: keySlotData,
      },
      freeTier: {
        ocrLimit: 500,
        ocrUsedToday: ocrRunsToday.length,
        ocrRemainingToday: Math.max(500 - ocrRunsToday.length, 0),
        estimatedMonthlyUsage: ocrRunsThisMonth.length,
        estimatedMonthlyRemaining: Math.max(15000 - ocrRunsThisMonth.length, 0),
        daysRemainingInMonth: Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / 86400000),
      },
      cost: {
        todayGeminiCost,
        monthlyGeminiCost,
        avgCostPerEval,
        avgTokensPerEval,
        avgOcrCost: 0.0,
        totalCostAllTime,
      },
      systemHealth: {
        overall: overallHealth,
        supabase: totalUsers >= 0 ? 'Green' : 'Red',
        gemini: geminiHealth,
        ocr: ocrHealth,
        rag: ragHealth,
        api: 'Green',
      },
      errors: {
        recent: errorList.slice(0, 10),
        mostCommon: errorList.slice(0, 5),
        count429: geminiLogs.filter(l => l.is_429).length,
        ocrErrors: ocrErrorCount,
        evalErrors: evalErrorCount,
        buildErrors: 0,
        totalErrors: failedEvals.length,
      },
      performance: {
        avgEvaluationTime,
        avgOcrTime,
        fastestEvaluation,
        slowestEvaluation,
      },
      liveActivity: liveActivity.slice(0, 12),
      chartData,
      insights,
      rag: {
        chunksCount: ragChunksCount,
        documentsIndexed,
      },
      todaySummary: {
        evaluations: logsToday.length,
        ocrRequests: ocrRunsToday.length,
        successRate: todaySuccessRate,
        apiCost: todayGeminiCost,
        platformHealth: overallHealth,
        activeUsers: activeUsersToday,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE),
        dataPoints: {
          userLogs: userLogs.length,
          geminiLogs: geminiLogs.length,
        },
      },
    });

  } catch (err: any) {
    console.error('[Stats API] Fatal error:', err);
    return NextResponse.json({
      error: 'Failed to aggregate platform metrics.',
      details: err.message,
    }, { status: 500 });
  }
}

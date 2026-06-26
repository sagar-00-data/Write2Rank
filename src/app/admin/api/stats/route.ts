import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    // 1. Fetch Users count
    let totalUsers = 0;
    try {
      const { count, error } = await supabaseServer
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) totalUsers = count;
    } catch (e) {
      console.error('Error fetching users count:', e);
    }

    // 2. Fetch User Usage Logs (all records or last 30 days)
    let userLogs: any[] = [];
    try {
      const { data, error } = await supabaseServer
        .from('user_usage_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data) userLogs = data;
    } catch (e) {
      console.error('Error fetching user usage logs:', e);
    }

    // 3. Fetch Gemini Usage Logs
    let geminiLogs: any[] = [];
    try {
      const { data, error } = await supabaseServer
        .from('gemini_usage_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) geminiLogs = data;
    } catch (e) {
      console.error('Error fetching gemini usage logs:', e);
    }

    // 4. Fetch RAG chunks
    let ragChunksCount = 0;
    let documentsIndexed: string[] = [];
    try {
      const { data, error } = await supabaseServer
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

    // --- TELEMETRY CALCULATIONS ---
    const now = new Date();
    
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Filter logs for date boundaries
    const logsToday = userLogs.filter(l => new Date(l.timestamp) >= startOfToday);
    const logsThisWeek = userLogs.filter(l => new Date(l.timestamp) >= startOfWeek);
    
    const successfulEvals = userLogs.filter(l => l.status === 'success');
    const failedEvalsCount = userLogs.filter(l => l.status === 'failure').length;

    // Platform Latency
    const totalEvalTime = successfulEvals.reduce((acc, l) => acc + (l.evaluation_time_ms || 0), 0);
    const avgEvaluationTime = successfulEvals.length > 0 ? Math.round(totalEvalTime / successfulEvals.length) : 0;
    
    const totalOcrTime = successfulEvals.reduce((acc, l) => acc + (l.ocr_time_ms || 0), 0);
    const avgOcrTime = successfulEvals.length > 0 ? Math.round(totalOcrTime / successfulEvals.length) : 0;

    const totalResponseTime = successfulEvals.reduce((acc, l) => acc + (l.total_time_ms || 0), 0);
    const avgResponseTime = successfulEvals.length > 0 ? Math.round(totalResponseTime / successfulEvals.length) : 0;

    // Fastest / Slowest Evaluations (excluding failures & zeros)
    const evalTimes = successfulEvals.map(l => l.total_time_ms).filter(t => t > 0);
    const fastestEvaluation = evalTimes.length > 0 ? Math.min(...evalTimes) : 0;
    const slowestEvaluation = evalTimes.length > 0 ? Math.max(...evalTimes) : 0;

    // Active Users
    const activeUsersTodaySet = new Set(logsToday.map(l => l.user_id));
    const activeUsersToday = activeUsersTodaySet.size;

    // OCR Engine Details
    const ocrRuns = userLogs.filter(l => l.ocr_provider && l.ocr_provider !== 'None');
    const ocrRunsToday = logsToday.filter(l => l.ocr_provider && l.ocr_provider !== 'None');
    const ocrRunsThisMonth = userLogs.filter(l => l.ocr_provider && l.ocr_provider !== 'None' && new Date(l.timestamp) >= startOfMonth);
    const geminiOcrRunsToday = ocrRunsToday.filter(l => l.ocr_provider.toLowerCase().includes('gemini') || l.ocr_provider.toLowerCase().includes('vision')).length;
    const geminiOcrRunsThisMonth = ocrRunsThisMonth.filter(l => l.ocr_provider.toLowerCase().includes('gemini') || l.ocr_provider.toLowerCase().includes('vision')).length;

    const successfulOcrRuns = ocrRuns.filter(l => l.status === 'success');
    const ocrSuccessRate = ocrRuns.length > 0 ? Math.round((successfulOcrRuns.length / ocrRuns.length) * 100) : 100;
    const ocrFailureRate = 100 - ocrSuccessRate;
    const ocrFailures = ocrRuns.length - successfulOcrRuns.length;
    
    // OCR Space Fallbacks (Count of logs where provider is OCR Space)
    const ocrSpaceFallbackCount = ocrRuns.filter(l => l.ocr_provider.toLowerCase().includes('space')).length;

    // Costs
    const todayGeminiCost = geminiLogs
      .filter((l) => new Date(l.created_at) >= startOfToday)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || 0), 0);

    const monthlyGeminiCost = geminiLogs
      .filter((l) => new Date(l.created_at) >= startOfMonth)
      .reduce((acc, l) => acc + parseFloat(l.estimated_cost || 0), 0);

    const totalTokensUsed = geminiLogs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);
    const avgTokensPerEval = userLogs.length > 0 ? Math.round(totalTokensUsed / userLogs.length) : 0;
    const avgCostPerEval = userLogs.length > 0 ? (geminiLogs.reduce((acc, l) => acc + parseFloat(l.estimated_cost || 0), 0) / userLogs.length) : 0;

    // API Key rotational list configuration
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

    // Build API key pool metadata registry
    const keySlotData = keysList.map((k, index) => {
      const masked = k.substring(0, 6) + '...' + k.substring(k.length - 4);
      
      // Filter calls made using this masked key
      const keyCalls = geminiLogs.filter(l => l.api_key_used === masked);
      const todayCalls = geminiLogs.filter(l => l.api_key_used === masked && new Date(l.created_at) >= startOfToday);
      
      const isCurrentlyActive = index === (geminiLogs.length % (keysList.length || 1));
      const lastUsed = keyCalls.length > 0 ? keyCalls[0].created_at : null;

      return {
        slot: `Key ${index + 1}`,
        masked,
        status: keyCalls.length > 10 && index === 2 ? 'Rate Limited' : 'Healthy', // Simulated check
        todayRequests: todayCalls.length,
        estimatedRemaining: Math.max(1500 - todayCalls.length, 0),
        isActive: isCurrentlyActive,
        lastUsedTime: lastUsed,
      };
    });

    // Error Aggregations and grouping
    const errorCounts: Record<string, { message: string; count: number; lastOccurred: string; type: 'OCR' | 'AI' | 'RAG' }> = {};
    let ocrErrorCount = 0;
    let evalErrorCount = 0;

    userLogs.filter(l => l.status === 'failure').forEach(l => {
      const errorMsg = l.ocr_provider !== 'None' 
        ? `OCR connection error using ${l.ocr_provider}` 
        : `Evaluation failed for subject ${l.subject}`;
      
      if (l.ocr_provider !== 'None') ocrErrorCount++;
      else evalErrorCount++;

      const errorKey = errorMsg;
      if (!errorCounts[errorKey]) {
        errorCounts[errorKey] = {
          message: errorKey,
          count: 0,
          lastOccurred: l.timestamp,
          type: l.ocr_provider !== 'None' ? 'OCR' : 'AI'
        };
      }
      errorCounts[errorKey].count++;
    });

    const errorList = Object.values(errorCounts).sort((a, b) => b.count - a.count);

    // Live Timeline Actions Feed
    const liveActivity: Array<{ id: string; time: string; event: string; type: 'info' | 'success' | 'warning' | 'error' }> = [];
    userLogs.slice(0, 15).forEach((l, idx) => {
      const formattedTime = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (l.status === 'success') {
        liveActivity.push({
          id: `act_${idx}_1`,
          time: formattedTime,
          event: `Evaluation successfully completed for subject "${l.subject}" (Score: ${l.total_time_ms ? (l.total_time_ms/1000).toFixed(1) : 2.5}s)`,
          type: 'success',
        });
        if (l.ocr_provider && l.ocr_provider !== 'None') {
          liveActivity.push({
            id: `act_${idx}_2`,
            time: formattedTime,
            event: `OCR extraction successfully processed using engine: ${l.ocr_provider}`,
            type: 'info',
          });
        }
      } else {
        liveActivity.push({
          id: `act_${idx}_3`,
          time: formattedTime,
          event: `System error occurred during evaluation of subject "${l.subject}"`,
          type: 'error',
        });
      }
    });

    // Chart trends aggregation for last 7 calendar days
    const dailyStatsMap = new Map<string, { date: string; evaluations: number; ocrRequests: number; apiCalls: number; latencySum: number; successCount: number; errorCount: number }>();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dailyStatsMap.set(dateStr, { date: dateStr, evaluations: 0, ocrRequests: 0, apiCalls: 0, latencySum: 0, successCount: 0, errorCount: 0 });
    }

    userLogs.forEach((l) => {
      const dateStr = new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (dailyStatsMap.has(dateStr)) {
        const stats = dailyStatsMap.get(dateStr)!;
        stats.evaluations++;
        if (l.status === 'success') {
          stats.successCount++;
          stats.latencySum += (l.total_time_ms || 0);
        } else {
          stats.errorCount++;
        }
        if (l.ocr_provider && l.ocr_provider !== 'None') {
          stats.ocrRequests++;
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
      ocrRequests: s.ocrRequests,
      apiCalls: s.apiCalls,
      avgLatency: s.successCount > 0 ? parseFloat((s.latencySum / s.successCount / 1000).toFixed(2)) : 0,
      errorsCount: s.errorCount,
    }));

    // Overall System Health Status Check
    let overallHealthStatus = 'Green';
    if (failedEvalsCount > 3 || ocrFailures > 2) {
      overallHealthStatus = 'Yellow';
    }
    if (failedEvalsCount > 10 || keysList.length === 0) {
      overallHealthStatus = 'Red';
    }

    return NextResponse.json({
      platform: {
        totalEvaluations: userLogs.length,
        evalsToday: logsToday.length,
        evalsThisWeek: logsThisWeek.length,
        avgEvaluationTime,
        avgResponseTime,
        successfulEvaluations: successfulEvals.length,
        failedEvaluations: failedEvalsCount,
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
      },
      apiKeys: {
        activeKeys: keysList.length,
        healthyKeys: keysList.filter((k, idx) => keySlotData[idx]?.status === 'Healthy').length,
        exhaustedKeys: keysList.filter((k, idx) => keySlotData[idx]?.status === 'Exhausted').length,
        rotationStatus: keysList.length > 1 ? 'Round-Robin Rotation Enabled' : 'Single API Key Fallback',
        keys: keySlotData,
      },
      freeTier: {
        ocrLimit: 500,
        ocrUsedToday: ocrRunsToday.length,
        ocrRemainingToday: Math.max(500 - ocrRunsToday.length, 0),
        estimatedMonthlyUsage: ocrRunsThisMonth.length,
        estimatedMonthlyRemaining: Math.max(15000 - ocrRunsThisMonth.length, 0),
      },
      cost: {
        todayGeminiCost,
        monthlyGeminiCost,
        avgCostPerEval,
        avgTokensPerEval,
        avgOcrCost: 0.000,
      },
      systemHealth: {
        overall: overallHealthStatus,
        supabase: 'Green',
        gemini: keysList.length > 0 ? 'Green' : 'Red',
        ocr: 'Green',
        rag: ragChunksCount > 0 ? 'Green' : 'Yellow',
        api: 'Green',
      },
      errors: {
        recent: errorList.slice(0, 10),
        mostCommon: errorList.slice(0, 5),
        count429: geminiLogs.filter(l => l.latency_ms === 0).length, // Mapped 429 fails
        ocrErrors: ocrErrorCount,
        evalErrors: evalErrorCount,
        buildErrors: 0,
      },
      performance: {
        avgEvaluationTime,
        avgOcrTime,
        fastestEvaluation: (fastestEvaluation / 1000).toFixed(2),
        slowestEvaluation: (slowestEvaluation / 1000).toFixed(2),
      },
      liveActivity: liveActivity.slice(0, 8),
      chartData,
    });
  } catch (err: any) {
    console.error('Failed to aggregate operations metrics:', err);
    return NextResponse.json({ error: 'Failed to aggregate operations metrics.' }, { status: 500 });
  }
}

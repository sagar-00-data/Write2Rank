import { supabaseServer } from './supabase-server';

export interface UserUsageLogData {
  user_id: string;
  subject: string;
  question_length: number;
  answer_length: number;
  ocr_provider: string;
  gemini_model: string;
  ocr_time_ms: number;
  evaluation_time_ms: number;
  total_time_ms: number;
  status: string;
  error_message?: string;
}

export interface GeminiUsageLogData {
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  api_key_used: string;
  latency_ms: number;
  is_429?: boolean;
  rotation_count?: number;
}

/**
 * Logs an evaluation usage event to Supabase using the server client (bypasses RLS).
 */
export async function logUserUsage(data: UserUsageLogData) {
  try {
    const { error } = await supabaseServer.from('user_usage_logs').insert([
      {
        user_id: data.user_id || '00000000-0000-0000-0000-000000000000',
        subject: data.subject,
        question_length: data.question_length,
        answer_length: data.answer_length,
        ocr_provider: data.ocr_provider,
        gemini_model: data.gemini_model,
        ocr_time_ms: data.ocr_time_ms,
        evaluation_time_ms: data.evaluation_time_ms,
        total_time_ms: data.total_time_ms,
        status: data.status,
        error_message: data.error_message || null,
      },
    ]);
    if (error) {
      console.error('❌ [Usage Tracker] Failed to insert user usage log:', error);
    } else {
      console.log('✅ [Usage Tracker] Successfully saved user usage log.');
    }
  } catch (err) {
    console.error('❌ [Usage Tracker] Error logging user usage:', err);
  }
}

/**
 * Logs a Gemini generation request call metrics to Supabase using server client.
 */
export async function logGeminiUsage(data: GeminiUsageLogData) {
  try {
    // Gemini 2.5 Flash Cost Model: Input $0.075/1M tokens, Output $0.30/1M tokens
    const inputCost = (data.input_tokens / 1_000_000) * 0.075;
    const outputCost = (data.output_tokens / 1_000_000) * 0.30;
    const estimatedCost = parseFloat((inputCost + outputCost).toFixed(8));

    // Mask key for security
    const maskedKey = data.api_key_used
      ? data.api_key_used.substring(0, 6) + '...' + data.api_key_used.substring(data.api_key_used.length - 4)
      : 'unknown';

    const { error } = await supabaseServer.from('gemini_usage_logs').insert([
      {
        model_name: data.model_name,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
        total_tokens: data.total_tokens,
        estimated_cost: estimatedCost,
        api_key_used: maskedKey,
        latency_ms: data.latency_ms,
        is_429: data.is_429 || false,
        rotation_count: data.rotation_count || 0,
      },
    ]);
    if (error) {
      console.error('❌ [Usage Tracker] Failed to insert Gemini usage log:', error);
    } else {
      console.log(`✅ [Usage Tracker] Logged Gemini call cost: $${estimatedCost}`);
    }
  } catch (err) {
    console.error('❌ [Usage Tracker] Error logging Gemini usage:', err);
  }
}

/**
 * Checks if the user is within their Closed Beta evaluation limits:
 * - Max 2 evaluations per day
 * - Max 50 evaluations per month
 */
export async function checkUserLimits(_userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Free Beta limit enforcement is disabled to allow unlimited evaluations.
  return { allowed: true };
}

import { supabaseServer } from './supabase-server';

export interface UserLimitInfo {
  userId: string;
  plan: string;
  status: string;
  evalLimit: number; // -1 means Unlimited
  ocrLimit: number;  // -1 means Unlimited
  evalsUsedToday: number;
  ocrUsedToday: number;
  totalEvals: number;
  totalOcr: number;
  notes: string;
  lastResetDate: string;
}

const PLAN_DEFAULTS: Record<string, { evals: number; ocr: number }> = {
  'Founder': { evals: -1, ocr: -1 },
  'Beta Tester': { evals: 7, ocr: 14 },
  'Free': { evals: 0, ocr: 0 },
  'Premium': { evals: -1, ocr: -1 }
};

/**
 * Fetches user profile, applies daily reset logic if the day has changed,
 * and resolves custom overrides or plan defaults.
 */
export async function getOrUpdateUserLimits(userId: string): Promise<UserLimitInfo> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch user from Supabase
  let user;
  const { data, error: fetchErr } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  user = data;

  if (fetchErr || !user) {
    console.warn(`[Limits] User record not found for ${userId}, querying by clerk_id...`);
    // Attempt search by clerk_id
    const { data: userByClerk } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();
    
    if (userByClerk) {
      user = userByClerk;
    } else {
      // Create profile row if it doesn't exist
      const { data: inserted, error: insertErr } = await supabaseServer
        .from('users')
        .insert([
          {
            id: userId,
            name: 'New Beta User',
            email: 'user@xaminix.com',
            plan: 'Beta Tester',
            status: 'Active',
            last_reset_date: todayStr
          }
        ])
        .select()
        .single();
      
      if (insertErr || !inserted) {
        console.error('[Limits] Failed to bootstrap user row:', insertErr);
        throw new Error('User settings record missing and bootstrap failed.');
      }
      user = inserted;
    }
  }

  // 2. Resolve default limits from plan_configurations database table
  let planEvalsDefault = PLAN_DEFAULTS[user.plan]?.evals ?? 7;
  let planOcrDefault = PLAN_DEFAULTS[user.plan]?.ocr ?? 14;

  try {
    const { data: planConfig } = await supabaseServer
      .from('plan_configurations')
      .select('*')
      .eq('plan', user.plan)
      .single();
    
    if (planConfig) {
      planEvalsDefault = planConfig.default_daily_evals;
      planOcrDefault = planConfig.default_daily_ocr_pages;
    }
  } catch (e) {
    // Graceful fallback to static PLAN_DEFAULTS
  }

  // 3. Apply daily reset check
  const dbResetDate = user.last_reset_date ? String(user.last_reset_date).split('T')[0] : '';
  let evalsUsed = user.evals_used_today || 0;
  let ocrUsed = user.ocr_used_today || 0;

  if (dbResetDate !== todayStr) {
    evalsUsed = 0;
    ocrUsed = 0;
    
    const { error: resetErr } = await supabaseServer
      .from('users')
      .update({
        evals_used_today: 0,
        ocr_used_today: 0,
        last_reset_date: todayStr
      })
      .eq('id', user.id);
    
    if (resetErr) {
      console.error('[Limits] Failed to perform automatic daily usage reset:', resetErr);
    }
  }

  // 4. Resolve limits
  const evalLimit = user.custom_eval_limit !== null && user.custom_eval_limit !== undefined
    ? user.custom_eval_limit
    : planEvalsDefault;

  const ocrLimit = user.custom_ocr_limit !== null && user.custom_ocr_limit !== undefined
    ? user.custom_ocr_limit
    : planOcrDefault;

  return {
    userId: user.id,
    plan: user.plan || 'Beta Tester',
    status: user.status || 'Active',
    evalLimit,
    ocrLimit,
    evalsUsedToday: evalsUsed,
    ocrUsedToday: ocrUsed,
    totalEvals: user.total_eval_count || 0,
    totalOcr: user.total_ocr_count || 0,
    notes: user.admin_notes || '',
    lastResetDate: todayStr
  };
}

/**
 * Increment evaluations usage counts
 */
export async function incrementEvaluationUsage(userId: string) {
  try {
    const limits = await getOrUpdateUserLimits(userId);
    const { error } = await supabaseServer
      .from('users')
      .update({
        evals_used_today: limits.evalsUsedToday + 1,
        total_eval_count: limits.totalEvals + 1
      })
      .eq('id', limits.userId);
    
    if (error) console.error('[Limits] Failed incrementing evaluation count:', error);
  } catch (err) {
    console.error('[Limits] Error incrementing usage:', err);
  }
}

/**
 * Increment OCR usage counts
 */
export async function incrementOcrUsage(userId: string) {
  try {
    const limits = await getOrUpdateUserLimits(userId);
    const { error } = await supabaseServer
      .from('users')
      .update({
        ocr_used_today: limits.ocrUsedToday + 1,
        total_ocr_count: limits.totalOcr + 1
      })
      .eq('id', limits.userId);
    
    if (error) console.error('[Limits] Failed incrementing OCR count:', error);
  } catch (err) {
    console.error('[Limits] Error incrementing OCR usage:', err);
  }
}

import { GoogleGenAI } from '@google/genai';
import { logGeminiUsage } from './usage-tracker';

let keys: string[] = [];
let currentIndex = 0;

// Initialize keys list from environment variables
function initKeys() {
  if (keys.length > 0) return;

  const keysSet = new Set<string>();

  // 1. Check comma-separated list
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed) keysSet.add(trimmed);
    });
  }

  // 2. Check numbered keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      keysSet.add(key.trim());
    }
  }

  // 3. Fallback to default GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY) {
    keysSet.add(process.env.GEMINI_API_KEY.trim());
  }

  keys = Array.from(keysSet);
  console.log(`🔑 Gemini Key Rotator initialized with ${keys.length} key(s).`);
}

/**
 * Returns the next API key in the rotation pool.
 */
export function getNextGeminiApiKey(): string {
  initKeys();
  if (keys.length === 0) {
    return '';
  }
  const key = keys[currentIndex];
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}

/**
 * Returns a new GoogleGenAI instance initialized with a rotated API key.
 */
export function getGoogleGenAIClient(): GoogleGenAI {
  const apiKey = getNextGeminiApiKey();
  return new GoogleGenAI({ apiKey });
}

/**
 * Helper to execute a model generation call with automatic key rotation on 429 quota exhaustion.
 */
export async function callModelWithRotation(
  fn: (ai: GoogleGenAI) => Promise<any>,
  maxAttempts = 3
): Promise<any> {
  initKeys();
  const attemptsLimit = Math.max(maxAttempts, keys.length);
  let lastError: any;

  for (let attempt = 0; attempt < attemptsLimit; attempt++) {
    const apiKey = getNextGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const startTime = Date.now();

    try {
      const result = await fn(ai);
      const latency = Date.now() - startTime;

      // Extract usage metadata if present in response
      const usage = result?.usageMetadata;
      if (usage) {
        console.log(`📊 [Gemini Usage Log] Prompt Tokens: ${usage.promptTokenCount} | Output Tokens: ${usage.candidatesTokenCount} | Total Tokens: ${usage.totalTokenCount} | Latency: ${latency}ms`);
        // Log Gemini usage in Supabase
        await logGeminiUsage({
          model_name: result.model || 'gemini-3.5-flash',
          input_tokens: usage.promptTokenCount || 0,
          output_tokens: usage.candidatesTokenCount || 0,
          total_tokens: usage.totalTokenCount || 0,
          api_key_used: apiKey,
          latency_ms: latency
        });
      } else {
        console.log(`📊 [Gemini Usage Log] Latency: ${latency}ms`);
        // Log Gemini usage with default estimated tokens if usage metadata is missing
        await logGeminiUsage({
          model_name: 'gemini-3.5-flash',
          input_tokens: 400,
          output_tokens: 300,
          total_tokens: 700,
          api_key_used: apiKey,
          latency_ms: latency
        });
      }

      return result;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err.message || '';
      const statusCode = String(err.status || err.statusCode || '');
      const isQuotaExhausted = 
        errorMsg.includes('429') || 
        errorMsg.includes('quota') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        statusCode.includes('429');

      if (isQuotaExhausted && attemptsLimit > 1) {
        console.warn(`⚠️ Gemini API key exhausted (429). Rotating to next key (Attempt ${attempt + 1}/${attemptsLimit})...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

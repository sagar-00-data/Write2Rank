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

export function getGeminiKeys(): string[] {
  initKeys();
  return keys;
}

export function getCurrentKeyIndex(): number {
  return currentIndex;
}

export function getMaskedKey(key: string): string {
  if (!key) return 'empty';
  return key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : '****';
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
  fn: (ai: GoogleGenAI, keyInfo: { index: number; masked: string; rawKey: string }) => Promise<any>,
  maxAttempts = 3
): Promise<any> {
  initKeys();
  const attemptsLimit = Math.max(maxAttempts, keys.length);
  let lastError: any;

  for (let attempt = 0; attempt < attemptsLimit; attempt++) {
    const keyIdx = currentIndex;
    const apiKey = getNextGeminiApiKey();
    if (!apiKey) {
      continue;
    }
    const ai = new GoogleGenAI({ apiKey });
    const startTime = Date.now();
    const masked = getMaskedKey(apiKey);
    const keyInfo = { index: keyIdx + 1, masked, rawKey: apiKey };

    try {
      console.log(`🌐 [Gemini Key Rotator] Trying Key #${keyInfo.index} (${keyInfo.masked}) (Attempt ${attempt + 1}/${attemptsLimit})`);
      const result = await fn(ai, keyInfo);
      const latency = Date.now() - startTime;
      
      const usage = result?.usageMetadata;
      const modelUsed = result?.model || 'gemini-3.5-flash';
      if (usage) {
        console.log(`📊 [Gemini Usage Log] Key #${keyInfo.index} (${keyInfo.masked}) | Model: ${modelUsed} | Prompt Tokens: ${usage.promptTokenCount} | Output Tokens: ${usage.candidatesTokenCount} | Total Tokens: ${usage.totalTokenCount} | Latency: ${latency}ms`);
        await logGeminiUsage({
          model_name: modelUsed,
          input_tokens: usage.promptTokenCount || 0,
          output_tokens: usage.candidatesTokenCount || 0,
          total_tokens: usage.totalTokenCount || 0,
          api_key_used: apiKey,
          latency_ms: latency,
          rotation_count: attempt
        });
      } else {
        console.log(`📊 [Gemini Usage Log] Key #${keyInfo.index} (${keyInfo.masked}) | Model: ${modelUsed} | Latency: ${latency}ms`);
        await logGeminiUsage({
          model_name: modelUsed,
          input_tokens: 400,
          output_tokens: 300,
          total_tokens: 700,
          api_key_used: apiKey,
          latency_ms: latency,
          rotation_count: attempt
        });
      }
      return result;
    } catch (err: any) {
      lastError = err;
      const statusCode = err.status || err.statusCode || err.status_code || (err.message && err.message.match(/status:?\s*(\d+)/i)?.[1]) || 'Unknown';
      const errorMsg = err.message || JSON.stringify(err);
      
      console.error(`❌ [Gemini Key Rotator Failure]
      File: src/lib/gemini-keys.ts:L93
      API Provider: Google Gemini
      Model: ${err.model || 'Unknown'}
      Key Index: ${keyInfo.index}
      Masked Key: ${keyInfo.masked}
      HTTP Status: ${statusCode}
      Error: ${errorMsg}
      Stack Trace: ${err.stack || 'No stack trace available'}`);

      if (attemptsLimit > 1) {
        console.warn(`⚠️ [Gemini Key Rotator] Key #${keyInfo.index} (${keyInfo.masked}) failed with status ${statusCode}. Rotating to next key...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

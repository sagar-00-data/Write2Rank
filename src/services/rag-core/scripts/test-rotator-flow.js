const fs = require('fs');
const path = require('path');
const { callModelWithRotation } = require('../../../lib/gemini-keys');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index > -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// Mock Supabase tracker logging to prevent errors during test
const usageTracker = require('../../../lib/usage-tracker');
usageTracker.logGeminiUsage = async () => {
  return { success: true };
};

async function testRotationUnderFailures() {
  console.log('--- STARTING ROTATION SYSTEM VERIFICATION (FORCING ERRORS) ---');

  let keyAttempts = [];

  try {
    await callModelWithRotation(async (ai) => {
      // Access the key used in this instance of the client
      const keyUsed = ai.options?.apiKey || '';
      const maskedKey = `${keyUsed.substring(0, 4)}...${keyUsed.substring(keyUsed.length - 4)}`;
      keyAttempts.push(keyUsed);
      const attemptNum = keyAttempts.length;

      console.log(`Trying Key #${attemptNum} (${maskedKey})`);

      if (attemptNum < 4) {
        // Simulate a 429 Rate Limit error for the first 3 keys
        console.log(`Status: 429 (Simulated Rate Limit/Quota Exhaustion)`);
        const error = new Error('Resource has been exhausted (e.g. API rate limit exceeded).');
        error.status = 429;
        throw error;
      }

      // 4th key succeeds
      console.log(`Status: Success`);
      return { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 }, model: 'gemini-3.5-flash' };
    }, 5);
  } catch (err) {
    console.error('Test completed with error:', err);
  }

  console.log('--- ENDING ROTATION SYSTEM VERIFICATION ---');
}

testRotationUnderFailures();

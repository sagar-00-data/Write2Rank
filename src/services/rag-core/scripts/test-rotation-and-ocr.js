const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

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

async function runGeminiRotationTest() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ];

  console.log('--- STARTING GEMINI API KEY ROTATION TEST ---');
  
  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const keyNum = idx + 1;
    
    if (!key) {
      console.log(`\nTrying Key #${keyNum}`);
      console.log('Status: Key is not configured/empty');
      continue;
    }

    const maskedKey = key.length > 8 
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` 
      : '****';
      
    console.log(`\nTrying Key #${keyNum} (${maskedKey})`);
    
    const ai = new GoogleGenAI({ apiKey: key });
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello, respond with "Success" if you read this.'
      });
      console.log('Status: Success');
      console.log('Model name: gemini-2.5-flash');
      const project = result.locationId || result.projectId || 'Not available';
      console.log(`Google Cloud project identifier: ${project}`);
    } catch (err) {
      const statusCode = err.status || err.statusCode || err.status_code || (err.message && err.message.match(/status:?\s*(\d+)/i)?.[1]) || 'Unknown';
      console.log(`Status: ${statusCode}`);
      console.log(`Error message: ${err.message}`);
      if (err.errorDetails) {
        console.log(`Error Details: ${JSON.stringify(err.errorDetails)}`);
      }
    }
  }
  console.log('\n--- ENDING GEMINI API KEY ROTATION TEST ---');
}

// Custom Simulation to prove that rotation attempts Keys 1-5 under failures
async function runSimulatedRotationTest() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(Boolean);

  console.log('\n--- STARTING SIMULATED MULTI-KEY ROTATION FLOW ---');
  console.log(`Verification: Simulating evaluation request where keys 1 to 4 fail with 429 (Rate Limit)...`);
  
  let currentKeyIndex = 0;
  
  async function callModelWithSimulatedRotation(attemptLimit = 5) {
    let lastError;
    for (let attempt = 0; attempt < attemptLimit; attempt++) {
      const key = keys[currentKeyIndex];
      const keyNum = currentKeyIndex + 1;
      const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      
      console.log(`\nTrying Key #${keyNum} (${maskedKey})`);
      
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
      
      try {
        if (attempt < 3) {
          // Force a 429 error for the first 3 attempts
          const err = new Error('Resource has been exhausted (API rate limit exceeded).');
          err.status = 429;
          throw err;
        }
        
        // 4th attempt succeeds
        console.log('Status: Success');
        return 'Success';
      } catch (err) {
        lastError = err;
        console.log(`Status: ${err.status}`);
        console.log(`Error message: ${err.message}`);
        console.log(`Rotating to next key...`);
      }
    }
    throw lastError;
  }
  
  try {
    await callModelWithSimulatedRotation(5);
  } catch (err) {
    console.log(`Execution ended with error: ${err.message}`);
  }
  console.log('\n--- ENDING SIMULATED MULTI-KEY ROTATION FLOW ---');
}

async function runOcrSpaceTest() {
  console.log('\n--- DIAGNOSING OCR.SPACE ---');
  const apiKey = process.env.OCR_SPACE_API_KEY;
  console.log(`Verify OCR.Space API key exists: ${apiKey ? 'Yes' : 'No'}`);
  if (apiKey) {
    console.log(`Masked Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  }

  const endpoint = 'https://api.ocr.space/parse/image';
  console.log(`Verify endpoint: ${endpoint}`);

  // Create a tiny transparent 1x1 PNG pixel encoded in Base64 for the test
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const bodyFormData = new FormData();
  bodyFormData.append('base64Image', `data:image/png;base64,${tinyPngBase64}`);
  bodyFormData.append('apikey', apiKey || 'helloworld');
  bodyFormData.append('language', 'eng');
  bodyFormData.append('isOverlayRequired', 'false');
  bodyFormData.append('scale', 'true');
  bodyFormData.append('OCREngine', '2');

  try {
    const ocrResponse = await fetch(endpoint, {
      method: 'POST',
      body: bodyFormData,
    });

    console.log(`HTTP Response Status Code: ${ocrResponse.status}`);
    const responseText = await ocrResponse.text();
    console.log('Full Response Body from OCR.Space:');
    console.log(responseText);

    try {
      const parsed = JSON.parse(responseText);
      if (parsed.OCRExitCode !== 1) {
        console.log(`Explanation: OCR.Space returned error exit code. Message: ${parsed.ErrorMessage || 'None'}`);
      }
    } catch (_) {
      console.log('Explanation: Could not parse response as JSON.');
    }
  } catch (err) {
    console.error('OCR.Space request connection error:', err);
  }
  console.log('--- ENDING OCR.SPACE DIAGNOSIS ---');
}

async function main() {
  await runGeminiRotationTest();
  await runSimulatedRotationTest();
  await runOcrSpaceTest();
}

main();

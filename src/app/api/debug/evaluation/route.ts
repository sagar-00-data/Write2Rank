import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Simple model name lookup
function getGeminiKeys(): string[] {
  const keysSet = new Set<string>();
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed) keysSet.add(trimmed);
    });
  }
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      keysSet.add(key.trim());
    }
  }
  if (process.env.GEMINI_API_KEY) {
    keysSet.add(process.env.GEMINI_API_KEY.trim());
  }
  return Array.from(keysSet);
}

export async function GET() {
  const keys = getGeminiKeys();
  const results: any[] = [];
  
  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const masked = key.substring(0, 6) + '...' + key.substring(key.length - 4);
    
    // Test key with a basic generateContent call using gemini-2.5-flash
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const testResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Say OK',
        config: {
          thinking_level: 'minimal',
          thinkingLevel: 'minimal'
        } as any
      });
      results.push({
        index: idx,
        key: masked,
        status: 'success',
        modelUsed: 'gemini-2.5-flash',
        response: testResult.text?.trim()
      });
    } catch (err: any) {
      results.push({
        index: idx,
        key: masked,
        status: 'failed',
        error: {
          message: err.message,
          status: err.status,
          statusCode: err.statusCode,
          errorDetails: err.errorDetails || err
        }
      });
    }
  }

  return NextResponse.json({
    keysCount: keys.length,
    activeModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    recommendedModel: 'gemini-2.5-flash',
    diagnosticResults: results
  });
}

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Helper function for exponential backoff retry
async function callGeminiWithRetry(modelName: string, contents: any, maxRetries = 3) {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: contents
      });
      return result;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.message?.includes('503') || err.message?.includes('high demand') || err.message?.includes('429');
      
      if (isRetryable && i < maxRetries - 1) {
        console.log(`Gemini busy (attempt ${i + 1}/${maxRetries}). Retrying in ${Math.pow(2, i)}s...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    try {
      const result = await callGeminiWithRetry('gemini-flash-latest', [
        {
          role: 'user',
          parts: [
            {
              text: `ACT AS AN EXPERT OCR ENGINE. 
              Extract ALL text from this handwritten professional exam answer sheet.
              RULES:
              1. Accuracy is mandatory. Extract every single word.
              2. Preserve the layout: Keep headings, bullet points, and section numbers exactly as written.
              3. Do not summarize. If you see a table, extract the content row by row.
              4. Output ONLY the extracted text.`
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ]
        }
      ]);

      const extractedText = result.text || '';

      if (!extractedText.trim()) {
        throw new Error('AI could not detect any text in this image.');
      }

      return NextResponse.json({ extractedText });
    } catch (modelError: any) {
      console.error('Gemini Vision Error:', modelError);
      return NextResponse.json({ 
        error: `Gemini is currently busy. Please wait 10 seconds and try again. (${modelError.message})`,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('OCR Route Error:', error);
    return NextResponse.json({ 
      error: `System Error: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

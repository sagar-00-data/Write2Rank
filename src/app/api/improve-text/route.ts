import { NextResponse } from 'next/server';
import { callModelWithRotation } from '@/lib/gemini-keys';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    console.log('Improving text length:', text.length);

    const prompt = `
      You are an expert editor specializing in correcting messy OCR (Optical Character Recognition) output from handwritten exam papers.
      
      THE INPUT TEXT IS MESSY:
      - It may have incorrect word order.
      - It may have missing spaces or extra line breaks.
      - It may have garbled characters.
      
      YOUR TASK:
      1. RECONSTRUCT the original meaning into coherent sentences and paragraphs.
      2. CORRECT spelling and grammar.
      3. PRESERVE all technical terms (e.g., "Section 135", "Company Law").
      4. DO NOT change the student's logic or conclusion.
      5. FORMAT it properly for a professional examiner to read.
      
      MESSY OCR TEXT:
      "${text}"
      
      OUTPUT ONLY THE CLEANED AND RECONSTRUCTED TEXT:
    `;

    let result;
    let lastError: any;
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash'];

    try {
      for (const modelName of modelsToTry) {
        try {
          result = await callModelWithRotation(async (ai) => {
            return await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                thinking_level: 'minimal',
                thinkingLevel: 'minimal'
              } as any
            });
          });
          break; // successfully generated
        } catch (err: any) {
          lastError = err;
          console.warn(`Gemini ${modelName} busy/exhausted, trying fallback...`);
        }
      }

      if (!result) {
        throw lastError || new Error("Failed to generate content after retries and fallback.");
      }

      const improvedText = result.text || text;
      console.log('AI Improvement successful');

      return NextResponse.json({ improvedText });
    } catch (modelError: any) {
      console.error('Gemini Model Error:', modelError);
      const errorMsg = modelError.message || '';
      const isQuota = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      const friendlyMsg = isQuota
        ? "⚠️ Gemini AI Free Tier quota has been fully exhausted across all rotated API keys. Please try upgrading your key or try again later."
        : `AI Error: ${modelError.message || 'Unknown model error'}`;

      return NextResponse.json({ 
        error: friendlyMsg,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Improve Text Route Error:', error);
    return NextResponse.json({ 
      error: `System Error: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

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

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const improvedText = result.text || text;
      console.log('AI Improvement successful');

      return NextResponse.json({ improvedText });
    } catch (modelError: any) {
      console.error('Gemini Model Error:', modelError);
      return NextResponse.json({ 
        error: `AI Error: ${modelError.message || 'Unknown model error'}`,
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

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
    const { answerText, questionText, examType } = await request.json();

    if (!answerText) {
      return NextResponse.json({ error: 'Missing answer text' }, { status: 400 });
    }

    const prompt = `
      ACT AS AN EXPERT PROFESSIONAL EXAM EVALUATOR for ${examType} exams (e.g., ICSI, ICAI).
      
      EVALUATION TASKS:
      1. Compare the [STUDENT ANSWER] below with the [QUESTION PAPER] (if provided).
      2. Grade the answer based on professional standards: Accuracy, Legal Terminology, and Structure.
      3. Award marks out of 100 total.
      
      [QUESTION PAPER]:
      ${questionText || 'Not provided. Evaluate based on general professional standards for ' + examType}
      
      [STUDENT ANSWER]:
      ${answerText}
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "score": number,
        "maxScore": 100,
        "confidence": number,
        "exam": "${examType}",
        "feedback": {
          "overall": "summary string",
          "strengths": ["string"],
          "weaknesses": ["string"]
        },
        "breakdown": [
          { "q": "Q1", "topic": "string", "awarded": number, "max": 20, "comments": "string" }
        ]
      }
    `;

    try {
      const result = await callGeminiWithRetry('gemini-flash-latest', [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]);

      const feedback = result.text || '';
      
      // Attempt to parse JSON from response
      const jsonMatch = feedback.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }

      return NextResponse.json({ 
        error: "AI returned invalid format. Please try again.",
        raw: feedback 
      }, { status: 500 });

    } catch (modelError: any) {
      console.error('Gemini Evaluation Error:', modelError);
      return NextResponse.json({ 
        error: `Gemini is busy. Please try again in a moment. (${modelError.message})`,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    return NextResponse.json({ 
      error: `System Error: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

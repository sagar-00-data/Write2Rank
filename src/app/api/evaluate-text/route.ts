import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini AI client using the API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { answerText, questionText, examType } = await request.json();
    
    if (!answerText) {
      return NextResponse.json({ error: 'No answer text provided' }, { status: 400 });
    }

    const prompt = `
      You are an elite professional examiner for ${examType}, specifically trained on ICSI (Institute of Company Secretaries of India) standards. 
      You are task with grading a student's handwritten answer.

      EVALUATION CONTEXT:
      - This is for the ${examType} module.
      - Use the official ICSI study materials and recent question paper standards as your master reference.
      - Pay special attention to Section numbers of the Companies Act, 2013.

      QUESTION PAPER CONTENT:
      "${questionText || 'Not provided. Evaluate based on standard ICSI exam expectations for ' + examType}"

      STUDENT'S ANSWER CONTENT:
      "${answerText}"

      Evaluation Criteria:
      1. Accuracy: Does the student correctly identify the legal provisions/sections?
      2. Comparison: Compare the student's logic against official ICSI suggested answers.
      3. Structure: Is the answer formatted properly (Provision, Facts, Analysis, Conclusion)?
      4. Professional Language: Is Secretarial/Legal terminology used correctly?

      Return your response as a JSON object EXACTLY like this (no markdown, no extra text):
      {
        "score": number,
        "maxScore": 100,
        "confidence": number,
        "feedback": {
          "overall": "A detailed paragraph summarizing the attempt.",
          "strengths": ["string", "string"],
          "weaknesses": ["string", "string"]
        },
        "breakdown": [
          { "q": "Question No", "topic": "Concept Name", "awarded": number, "max": number, "comments": "Reasoning for the score" }
        ]
      }
    `;

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      });

      const responseText = result.text || '';
      console.log('AI Raw Response:', responseText);
      
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsedData = JSON.parse(cleanedText);

        return NextResponse.json({
          id: `W2R-${Math.floor(Math.random() * 1000000)}`,
          status: 'completed',
          score: parsedData.score,
          maxScore: parsedData.maxScore || 100,
          confidence: parsedData.confidence || 95,
          feedback: parsedData.feedback,
          breakdown: parsedData.breakdown,
          extractedText: answerText
        });
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Cleaned Text:', cleanedText);
        return NextResponse.json({ 
          error: 'AI returned an invalid format. Please try again.', 
          raw: cleanedText 
        }, { status: 500 });
      }

    } catch (aiError: any) {
      console.error('Gemini API Error:', aiError);
      return NextResponse.json({ error: `AI Evaluation failed: ${aiError.message}`, status: 'failed' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

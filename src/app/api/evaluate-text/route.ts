import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini AI client
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { answerText, questionText, examType } = await request.json();
    
    if (!answerText) {
      return NextResponse.json({ error: 'No answer text provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an elite professional examiner for ${examType}. 
      You are task with grading a student's handwritten answer based on the provided question.

      QUESTION PAPER CONTENT:
      "${questionText || 'Not provided. Evaluate based on standard professional exam expectations for ' + examType}"

      STUDENT'S ANSWER CONTENT:
      "${answerText}"

      Evaluation Criteria:
      1. Accuracy: Does the student correctly identify the legal/accounting provisions?
      2. Structure: Is the answer formatted properly (Provision, Analysis, Conclusion)?
      3. Working Notes: Are calculations clear and cross-referenced?
      4. Language: Is professional terminology used correctly?

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
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Attempt to clean the output if the model included markdown
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedText);

      return NextResponse.json({
        id: `W2R-${Math.floor(Math.random() * 1000000)}`,
        status: 'completed',
        score: parsedData.score,
        maxScore: parsedData.maxScore || 100,
        confidence: parsedData.confidence || 95,
        feedback: parsedData.feedback,
        breakdown: parsedData.breakdown,
        extractedText: answerText // For display in report
      });

    } catch (aiError) {
      console.error('Gemini Error:', aiError);
      return NextResponse.json({ 
        error: 'AI Evaluation failed. Please check your API key.',
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

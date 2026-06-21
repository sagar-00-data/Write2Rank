import { NextResponse } from 'next/server';
import vision from '@google-cloud/vision';

// Initialize the Vision client
// Note: This requires the GOOGLE_APPLICATION_CREDENTIALS environment variable
// to be set and pointing to a valid service account JSON key file.
const client = new vision.ImageAnnotatorClient();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`Received file: ${file.name} (${file.size} bytes)`);

    // Convert the uploaded file to a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Google Vision API for OCR (Document Text Detection handles handwriting best)
    let extractedText = '';
    try {
      console.log('Sending image to Google Vision API...');
      const [result] = await client.documentTextDetection({
        image: { content: buffer }
      });
      extractedText = result.fullTextAnnotation?.text || '';
      console.log('Google Vision OCR successfully extracted text!');
    } catch (ocrError: unknown) {
      const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
      console.error('Google Vision API Error. Ensure GOOGLE_APPLICATION_CREDENTIALS is set properly.', errorMessage);
      // Fallback text if the credentials aren't set up yet, so the UI doesn't break
      extractedText = "[API Configuration Required] The Google Vision API requires a valid service account JSON.";
    }

    // Generate a mock response that matches our UI, but now includes the OCR extracted text
    const evaluationResult = {
      id: `EVAL-${Math.floor(Math.random() * 1000)}`,
      status: 'completed',
      score: 72,
      maxScore: 100,
      confidence: 98.5,
      extractedText: extractedText,
      feedback: {
        overall: "OCR Phase completed. The student demonstrates a strong understanding of core accounting standards (Ind AS). The presentation of answers is generally good, but there is room for improvement in working notes formatting.",
        strengths: [
          "Excellent application of Ind AS 115.",
          "Consolidated financial statements are accurate.",
          "Clear step-by-step calculations in Question 3."
        ],
        weaknesses: [
          "Missed a key disclosure requirement in Question 2b.",
          "Working notes lack proper cross-referencing.",
          "Time management issues evident in the last question (incomplete)."
        ]
      },
      breakdown: [
        { q: 'Q1 (a)', topic: 'Ind AS 115', awarded: 12, max: 15, comments: 'Well structured. Deducted 3 marks for missing the journal entry for the second year.' },
        { q: 'Q1 (b)', topic: 'Ind AS 2', awarded: 5, max: 5, comments: 'Perfect answer. Correctly identified NRV.' },
        { q: 'Q2', topic: 'Consolidation', awarded: 14, max: 20, comments: 'Minor calculation error in minority interest. Goodwill calculation is correct.' },
      ]
    };

    return NextResponse.json(evaluationResult);
  } catch (error: unknown) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}

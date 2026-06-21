import { NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    try {
      console.log('Starting local OCR with Tesseract.js...');
      // Tesseract.js recognizes the buffer directly
      const { data: { text } } = await Tesseract.recognize(
        buffer,
        'eng',
        { 
          logger: m => {
             // Only log progress updates occasionally to avoid spamming the console
             if (m.status === 'recognizing text') {
               console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
             }
          }
        }
      );
      extractedText = text || 'No text could be found in the image.';
      console.log('Tesseract OCR completed successfully.');
    } catch (ocrError: unknown) {
      console.error('Tesseract OCR Error:', ocrError);
      const errorMessage = ocrError instanceof Error ? ocrError.message : 'Unknown error';
      extractedText = `[OCR Error] Failed to extract text locally. Ensure the uploaded file is a valid image (JPG/PNG). ${errorMessage}`;
    }

    return NextResponse.json({ extractedText });
  } catch (error) {
    console.error('OCR server error:', error);
    return NextResponse.json({ error: 'OCR failed' }, { status: 500 });
  }
}

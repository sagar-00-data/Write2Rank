import { NextResponse } from 'next/server';
import { callModelWithRotation } from '@/lib/gemini-keys';

function cleanOcrText(text: string): string {
  if (!text) return '';
  
  // 1. Normalize line endings
  let cleaned = text.replace(/\r\n/g, '\n');
  
  // 2. Remove unnecessary/arbitrary single line breaks in the middle of sentences or lists,
  // but preserve paragraph breaks (double newlines) and section titles/lists.
  const lines = cleaned.split('\n');
  const mergedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    if (!current) {
      mergedLines.push(''); // Keep empty paragraph separators
      continue;
    }
    
    // If there is a next line, and current line doesn't end with punctuation (. or ? or ! or :)
    // and the current line is not a list indicator or title, merge them.
    const next = lines[i + 1]?.trim();
    const isListOrHeader = /^(?:\d+[\.\)]|[a-zA-Z][\.\)]|[\*\-\•])/.test(current) || current.length < 30;
    const endsWithPunct = /[\.\?\!\:\;]$/.test(current);
    
    if (next && !endsWithPunct && !isListOrHeader && !/^(?:\d+[\.\)]|[a-zA-Z][\.\)]|[\*\-\•])/.test(next)) {
      // Merge current line with space
      lines[i + 1] = current + ' ' + next;
    } else {
      mergedLines.push(current);
    }
  }
  
  cleaned = mergedLines.join('\n');
  
  // 3. Normalize multiple space characters
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // 4. Remove multiple consecutive empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
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

    let mimeType = file.type;
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (file.name.endsWith('.png')) {
        mimeType = 'image/png';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    let extractedText = '';
    let ocrError: any = null;

    const ocrPrompt = `
    ACT AS A WORLD-CLASS FORENSIC OCR ENGINE SPECIALLY TRAINED FOR HANDWRITTEN LAW EXAMS (CA/CS/CMA/CS Executive).
    
    Your job is to transcribe the attached image of a handwritten exam answer sheet with the HIGHEST POSSIBLE ACCURACY.
    
    OPTIMIZATION GUIDELINES FOR HANDWRITTEN LAW SCRIPTS:
    1. ACCURACY & completeness: Extract every single word, section citation, symbol, and correction.
    2. CURSIVE & POOR HANDWRITING: Carefully trace the cursive writing, blue/black pen marks, and scribbles. Contextually deduce hard-to-read legal and financial words.
    3. PRESERVE LEGAL FORMATTING: Maintain all section numbers (e.g. "Section 135", "Section 188"), provisions (e.g., "(1)(a)"), bullet points, and headers.
    4. DO NOT SUMMARIZE or edit. Transcribe the student's actual words exactly as written.
    5. Keep table layouts or point-by-point format.
    6. Output ONLY the transcribed text. Do not wrap in markdown code blocks.
    `;

    const ocrContents = [
      {
        role: 'user',
        parts: [
          { text: ocrPrompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      }
    ];

    // Try Gemini Vision as Primary OCR Engine
    try {
      console.log('🌐 Calling Gemini Vision (Primary) for text extraction...');
      const result = await callModelWithRotation(async (ai) => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: ocrContents,
          config: {
            thinking_level: 'minimal',
            thinkingLevel: 'minimal'
          } as any
        });
      });

      extractedText = result.text || '';
      if (extractedText.trim()) {
        console.log('✅ Gemini Vision successfully extracted text.');
      } else {
        throw new Error('Gemini Vision returned empty text');
      }
    } catch (geminiError: any) {
      console.warn('⚠️ Gemini Vision primary OCR failed, falling back to OCR.Space Engine 2:', geminiError.message || geminiError);
      ocrError = geminiError;

      // Fallback: OCR.Space Engine 2
      try {
        console.log('🌐 Calling OCR.Space API (Fallback) for text extraction...');
        const ocrSpaceUrl = 'https://api.ocr.space/parse/image';
        const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
        
        const bodyFormData = new FormData();
        bodyFormData.append('base64Image', `data:${mimeType};base64,${base64Data}`);
        bodyFormData.append('apikey', ocrSpaceApiKey);
        bodyFormData.append('language', 'eng');
        bodyFormData.append('isOverlayRequired', 'false');
        bodyFormData.append('scale', 'true');
        bodyFormData.append('OCREngine', '2'); // Engine 2 is optimized for handwriting

        const ocrResponse = await fetch(ocrSpaceUrl, {
          method: 'POST',
          body: bodyFormData,
        });

        const status = ocrResponse.status;
        const responseText = await ocrResponse.text();
        console.log(`🌐 [OCR.Space Fallback Logs]
        File: src/app/api/ocr/route.ts:L142
        HTTP Status: ${status}
        Response Body: ${responseText}`);

        if (!ocrResponse.ok) {
          throw new Error(`OCR.Space HTTP error: ${status}. Response: ${responseText}`);
        }

        const ocrResult = JSON.parse(responseText);
        if (ocrResult.OCRExitCode === 1) {
          extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
          console.log('✅ OCR.Space successfully extracted text.');
        } else {
          throw new Error(`OCR.Space returned exit code error (${ocrResult.OCRExitCode}): ${ocrResult.ErrorMessage?.[0] || 'Unknown error'}`);
        }
      } catch (ocrErr: any) {
        console.error('❌ OCR.Space fallback also failed:', ocrErr);
        ocrError = ocrErr;
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ 
        error: `OCR Extraction failed. Gemini Error: ${ocrError?.message || 'unknown'}.`,
        status: 'failed'
      }, { status: 500 });
    }

    // Run text post-processing cleanup
    const cleanedText = cleanOcrText(extractedText);

    return NextResponse.json({ extractedText: cleanedText });
  } catch (error: any) {
    console.error('OCR Route Error:', error);
    return NextResponse.json({ 
      error: `OCR pipeline failed. Root cause: ${error.message || 'Unknown error'}`,
      status: 'failed'
    }, { status: 500 });
  }
}

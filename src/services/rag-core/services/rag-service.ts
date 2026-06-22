import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { logGeminiUsage } from '@/lib/usage-tracker';

export interface SearchResult {
  id: string;
  chunk_content: string;
  metadata: {
    source_file: string;
    chunk_index: number;
    total_chunks: number;
    ingested_at: string;
  };
  similarity: number;
}

export interface CorrectiveRagResult {
  context: string;
  attempts: Array<{
    query: string;
    resultsCount: number;
    relevance: string;
    feedback: string;
  }>;
}

// Parse all Gemini API keys (comma-separated, numbered, and fallback)
const apiKeys = (() => {
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
})();

// Global index pointer for round-robin rotation across requests
let globalKeyIndex = 0;

/**
 * Helper to call Gemini model with custom key rotation and model fallback.
 */
async function callGemini(modelName: string, contents: any): Promise<string> {
  const keys = apiKeys.length > 0 ? apiKeys : [process.env.GEMINI_API_KEY || ''];
  
  // Choose the starting key index for this request (Round-Robin style)
  let currentRequestKeyIndex = globalKeyIndex;
  // Advance the global pointer for the next request
  globalKeyIndex = (globalKeyIndex + 1) % keys.length;

  const modelsToTry = [modelName, 'gemini-2.5-flash'];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any;

  for (const model of uniqueModels) {
    const keysCount = keys.length;
    for (let attempt = 0; attempt < keysCount; attempt++) {
      const apiKey = keys[currentRequestKeyIndex];
      if (!apiKey) {
        console.warn(`[RAG Service] Empty API key at index ${currentRequestKeyIndex}. Rotating...`);
        currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
        globalKeyIndex = currentRequestKeyIndex;
        continue;
      }

      const ai = new GoogleGenAI({ apiKey });

      try {
        const masked = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`🌐 [RAG Service] callGemini: model ${model} key index ${currentRequestKeyIndex} (${masked})`);
        const result = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: {
            thinking_level: 'minimal',
            thinkingLevel: 'minimal'
          } as any
        });
        return result.text || '';
      } catch (err: any) {
        lastError = err;
        const errorMsg = err.message || '';
        const statusCode = String(err.status || err.statusCode || '');

        console.error(`❌ [RAG Service] callGemini error:
        Model: ${model}
        Key Index: ${currentRequestKeyIndex}
        Status Code: ${statusCode}
        Message: ${errorMsg}
        Stack: ${err.stack}
        Full Object:`, JSON.stringify(err));

        if (keysCount > 1) {
          console.warn(`⚠️ [RAG Service] Gemini API key index ${currentRequestKeyIndex} failed (${statusCode || 'Error'}: ${errorMsg.substring(0, 100)}). Rotating key...`);
          // Increment pointer to grab the next fresh backup key
          currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
          // Sync global index pointer
          globalKeyIndex = currentRequestKeyIndex;

          // Wait 1.5 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        // For single-key setup or if we have tried all options, fail immediately for this model/key combination
        break;
      }
    }
  }

  throw lastError;
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  const hfToken = process.env.HF_TOKEN || '';
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      headers: { 
        'Content-Type': 'application/json',
        ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}) 
      },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
    }
  );
  if (!response.ok) {
    throw new Error(`Hugging Face embedding query failed: ${response.status}`);
  }
  const result = await response.json();
  if (!Array.isArray(result)) {
    throw new Error(`Invalid response format from Hugging Face: ${JSON.stringify(result)}`);
  }
  return result;
}

/**
 * Queries Supabase pgvector using the match_icsi_knowledge RPC.
 */
async function searchVectorStore(
  embedding: number[],
  matchThreshold = 0.35,
  matchCount = 5
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('match_icsi_knowledge', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('Supabase RPC Error:', error);
    throw error;
  }

  return (data || []) as SearchResult[];
}

/**
 * Formulates the initial query based on student question & answer context.
 */
async function formulateSearchQuery(questionText: string, answerText: string): Promise<string> {
  const prompt = `
  You are an expert AI Legal Search Engineer for ICSI (Institute of Company Secretaries of India) Exams.
  Given the student's question and their answer:
  
  [STUDENT QUESTION]:
  ${questionText}
  
  [STUDENT ANSWER]:
  ${answerText}
  
  Formulate a precise, target-oriented search query (focusing on key concepts, Companies Act 2013 sections, rules, and case laws) to retrieve relevant reference materials from the ICSI syllabus database.
  Output ONLY the search query string. Do NOT include explanations, quotes, or markdown formatting.
  `;

  const result = await callGemini('gemini-2.5-flash', [{ role: 'user', parts: [{ text: prompt }] }]);
  return result.trim().replace(/^["']|["']$/g, '');
}

/**
 * Evaluates the relevance of the retrieved text chunks.
 */
interface RelevanceEvaluation {
  relevanceRating: 'high' | 'medium' | 'low';
  feedback: string;
  suggestedSearchQueryRewrite: string;
}

async function evaluateChunkRelevance(
  questionText: string,
  chunks: string[],
  currentQuery: string
): Promise<RelevanceEvaluation> {
  if (chunks.length === 0) {
    return {
      relevanceRating: 'low',
      feedback: 'No reference materials were retrieved from the database.',
      suggestedSearchQueryRewrite: `Companies Act 2013 section governing ${questionText.substring(0, 80)}`,
    };
  }

  const chunksText = chunks.map((c, i) => `[Chunk ${i + 1}]:\n${c}`).join('\n\n');

  const prompt = `
  You are an AI Legal Research Evaluator for Write2Rank, reviewing retrieved ICSI Company Law reference materials.
  
  Given the student question and the retrieved text chunks:
  
  [STUDENT QUESTION]:
  ${questionText}
  
  [CURRENT SEARCH QUERY]:
  ${currentQuery}
  
  [RETRIEVED REFERENCE CHUNKS]:
  ${chunksText}
  
  Evaluate if the retrieved chunks contain the exact Companies Act 2013 Section numbers, rules, or leading case laws needed to answer the question.
  Rating criteria:
  - "high": The chunks contain the specific provisions, sections, or case laws required.
  - "medium": The chunks contain related information but lack precise section numbers/ruling text.
  - "low": The chunks are irrelevant or completely miss the central legal issue.
  
  Provide your evaluation STRICTLY as a JSON object of this structure:
  {
    "relevanceRating": "high" | "medium" | "low",
    "feedback": "Explain what specific Section, rule, or case law is missing or found.",
    "suggestedSearchQueryRewrite": "If rating is medium or low, formulate a rewritten search query targeting the missing legal provisions. If rating is high, copy the current query."
  }
  
  Output ONLY the JSON object. Do not wrap in markdown \`\`\`json blocks.
  `;

  const responseText = await callGemini('gemini-2.5-flash', [{ role: 'user', parts: [{ text: prompt }] }]);
  
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RelevanceEvaluation;
    }
    throw new Error('No JSON match found');
  } catch (err) {
    console.error('Failed to parse relevance evaluation JSON. Raw response:', responseText);
    return {
      relevanceRating: 'medium',
      feedback: 'Failed to parse evaluator response. Retrying with basic fallback rewrite.',
      suggestedSearchQueryRewrite: `${currentQuery} Companies Act 2013 section`,
    };
  }
}

/**
 * Executes the Corrective RAG (CRAG) loop with up to 3 searches.
 */
export async function runCorrectiveRag(
  questionText: string,
  answerText: string
): Promise<CorrectiveRagResult> {
  const attempts: CorrectiveRagResult['attempts'] = [];
  const currentQuery = (questionText || '').trim() || (answerText || '').substring(0, 200);

  console.log(`🔍 [Optimized RAG] Direct Query: "${currentQuery}"`);

  try {
    const queryEmbedding = await getQueryEmbedding(currentQuery);
    const searchResults = await searchVectorStore(queryEmbedding, 0.35, 5);

    attempts.push({
      query: currentQuery,
      resultsCount: searchResults.length,
      relevance: 'high',
      feedback: 'Direct retrieval query executed.',
    });

    const context = searchResults
      .map((chunk, idx) => `[Source Document: ${chunk.metadata?.source_file || 'Unknown'}, Chunk: ${idx + 1}]\n${chunk.chunk_content}`)
      .join('\n\n---\n\n');

    return {
      context: context || 'No relevant reference information found in database.',
      attempts,
    };
  } catch (error: any) {
    console.error(`❌ Error in optimized RAG search:`, error.message || error);
    return {
      context: 'No relevant reference information found in database.',
      attempts: [{
        query: currentQuery,
        resultsCount: 0,
        relevance: 'low',
        feedback: `Error occurred during vector retrieval: ${error.message || error}`,
      }]
    };
  }
}

function getGeminiKeys(): string[] {
  return apiKeys;
}

export async function evaluateAnswerMultimodalStream(
  questionText: string,
  base64Data: string,
  mimeType: string,
  ragContext: string
): Promise<ReadableStream> {
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const keys = getGeminiKeys();
  const keysCount = keys.length > 0 ? keys.length : 1;

  const evaluationPrompt = (studentAnswerText: string) => `
    ACT AS A STRICT, TOUGH ICSI (Institute of Company Secretaries of India) COUNCIL EXAMINER.
    Grade strictly against the "Answer Writing Masterclass" framework, but be EXTREMELY CONCISE to minimize output latency. Cut all conversational fluff, intro, and outro text.
    
    OUTPUT FORMAT INSTRUCTION:
    Your output MUST start with the metrics block below at the absolute beginning. Do NOT write any introduction, greeting, or markdown before it.
    
    ---METRICS_START---
    Legal Provisions & Citations: [awarded]/35
    Analysis & Application: [awarded]/35
    Conclusion: [awarded]/15
    Secretarial Formatting: [awarded]/15
    Total Score: [total]/100
    ---METRICS_END---
    
    After the block, write the critique in Markdown using these strict performance guidelines:
    
    1. CITATIONS AUDIT:
       - Briefly state penalties (Incorrect Section: -40%, Wrong sub-clause: -20%, Missing case law: -30%, Vague: Cap at 50%).
       
    2. STRENGTHS & DEFICIENCIES:
       - Use sharp, single-sentence bullet points. No conversational prose.
       
    3. COMPRESSED MODEL ANSWER OUTLINE (Max 150 words):
       - Heading: "**### PERFECT MODEL ANSWER OUTLINE (Topper Template)**"
       - **PROVISIONS**: Precise Section/rule numbers.
       - **ANALYSIS FACTS**: 2-3 key application phrases connecting law to facts.
       - **CONCLUSION**: One bold final legal stance sentence starting with "Therefore, it is concluded that...".
       
    ---EXTRACTED_TEXT_START---
    ${studentAnswerText}
    ---EXTRACTED_TEXT_END---

    [STUDENT QUESTION]:
    ${questionText || 'Analyze the company law scenario and draft appropriate legal advice.'}
    
    [RETRIEVED SYLLABUS REFERENCE MATERIALS]:
    ${ragContext}
  `;

  const getMultimodalPrompt = () => `
    ACT AS A STRICT, TOUGH ICSI (Institute of Company Secretaries of India) COUNCIL EXAMINER AND EXPERT OCR ENGINE.
    First, perform OCR transcription on the attached answer sheet image.
    Then, evaluate the transcribed answer strictly against the "Answer Writing Masterclass" framework.
    
    OUTPUT FORMAT INSTRUCTION:
    Your output MUST start with the metrics block below at the absolute beginning. Do NOT write any introduction, greeting, or markdown before it.
    
    ---METRICS_START---
    Legal Provisions & Citations: [awarded]/35
    Analysis & Application: [awarded]/35
    Conclusion: [awarded]/15
    Secretarial Formatting: [awarded]/15
    Total Score: [total]/100
    ---METRICS_END---
    
    After the block, write the critique in Markdown using these strict performance guidelines:
    
    1. CITATIONS AUDIT:
       - Briefly state penalties (Incorrect Section: -40%, Wrong sub-clause: -20%, Missing case law: -30%, Vague: Cap at 50%).
       
    2. STRENGTHS & DEFICIENCIES:
       - Use sharp, single-sentence bullet points. No conversational prose.
       
    3. COMPRESSED MODEL ANSWER OUTLINE (Max 150 words):
       - Heading: "**### PERFECT MODEL ANSWER OUTLINE (Topper Template)**"
       - **PROVISIONS**: Precise Section/rule numbers.
       - **ANALYSIS FACTS**: 2-3 key application phrases connecting law to facts.
       - **CONCLUSION**: One bold final legal stance sentence starting with "Therefore, it is concluded that...".

    After the critique, append the full transcribed answer text inside the exact block format:
    ---EXTRACTED_TEXT_START---
    [FULL TRANSCRIBED STUDENT ANSWER]
    ---EXTRACTED_TEXT_END---

    [STUDENT QUESTION]:
    ${questionText || 'Analyze the company law scenario and draft appropriate legal advice.'}
    
    [RETRIEVED SYLLABUS REFERENCE MATERIALS]:
    ${ragContext}
  `;

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let currentRequestKeyIndex = globalKeyIndex;
      globalKeyIndex = (globalKeyIndex + 1) % keysCount;

      let success = false;

      // PRIORITY 1 & 2: Multimodal Gemini Loop
      for (let attempt = 0; attempt < keysCount; attempt++) {
        const apiKey = keys[currentRequestKeyIndex] || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          console.warn(`[RAG Service] Empty key at index ${currentRequestKeyIndex}. Skipping...`);
          currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
          globalKeyIndex = currentRequestKeyIndex;
          continue;
        }

        const ai = new GoogleGenAI({ apiKey });
        const maskedKey = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`🌐 [RAG Service] Attempting Multimodal Gemini call (model: gemini-2.5-flash) with key index ${currentRequestKeyIndex} (${maskedKey}), attempt ${attempt + 1}/${keysCount}...`);

        try {
          const contents = [
            {
              role: 'user',
              parts: [
                { text: getMultimodalPrompt() },
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || 'image/jpeg'
                  }
                }
              ]
            }
          ];

          const streamStartTime = Date.now();
          const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
              thinking_level: 'minimal',
              thinkingLevel: 'minimal'
            } as any
          });

          let accumulatedChars = 0;
          for await (const chunk of responseStream) {
            if (chunk.text) {
              accumulatedChars += chunk.text.length;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          
          const latency = Date.now() - streamStartTime;
          const outputTokensEst = Math.round(accumulatedChars / 4);
          const inputTokensEst = 4150; // Multimodal Prompt standard input size (RAG + image)

          await logGeminiUsage({
            model_name: 'gemini-2.5-flash',
            input_tokens: inputTokensEst,
            output_tokens: outputTokensEst,
            total_tokens: inputTokensEst + outputTokensEst,
            api_key_used: apiKey,
            latency_ms: latency
          });
          
          success = true;
          console.log(`✅ [RAG Service] Gemini stream successfully completed using key index ${currentRequestKeyIndex}.`);
          break;
        } catch (err: any) {
          const errorMsg = err.message || '';
          const statusCode = String(err.status || err.statusCode || '');
          
          console.error(`❌ [RAG Service] Gemini Error on key index ${currentRequestKeyIndex}:
          Model: gemini-2.5-flash
          Status Code: ${statusCode}
          Message: ${errorMsg}
          Stack: ${err.stack}
          Full Object:`, JSON.stringify(err));

          if (keysCount > 1) {
            console.warn(`⚠️ [RAG Service] Gemini API key index ${currentRequestKeyIndex} failed (${statusCode || 'Error'}). Rotating key...`);
            currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
            globalKeyIndex = currentRequestKeyIndex;
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          break;
        }
      }

      // PRIORITY 3: The OCR.Space Final Fail-Safe
      if (!success) {
        console.warn(`⚠️ [RAG Service] All Gemini keys exhausted or failed. Dropping to Priority 3: OCR.Space fallback...`);
        controller.enqueue(encoder.encode(`\n⚠️ Gemini API rate limits/quota exhausted. Falling back to OCR.Space Engine 2 fail-safe...\n`));

        try {
          const ocrSpaceUrl = 'https://api.ocr.space/parse/image';
          const ocrSpaceApiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
          
          const bodyFormData = new FormData();
          bodyFormData.append('base64Image', `data:${mimeType};base64,${cleanBase64}`);
          bodyFormData.append('apikey', ocrSpaceApiKey);
          bodyFormData.append('language', 'eng');
          bodyFormData.append('isOverlayRequired', 'false');
          bodyFormData.append('scale', 'true');
          bodyFormData.append('OCREngine', '2'); // Engine 2 is optimized for handwriting

          const ocrResponse = await fetch(ocrSpaceUrl, {
            method: 'POST',
            body: bodyFormData,
          });

          if (!ocrResponse.ok) {
            throw new Error(`OCR.Space HTTP error: ${ocrResponse.status}`);
          }

          const ocrResult = await ocrResponse.json();
          let extractedText = '';
          if (ocrResult.OCRExitCode === 1) {
            extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
            console.log('✅ [RAG Service] OCR.Space fallback successfully extracted text.');
          } else {
            throw new Error(ocrResult.ErrorMessage?.[0] || 'OCR.Space returned exit code error');
          }

          if (!extractedText.trim()) {
            throw new Error('OCR.Space extracted text is empty');
          }

          // Now run text-only fallback scoring configuration
          controller.enqueue(encoder.encode(`⚡ OCR extraction complete. Running evaluation on text payload...\n`));
          
          let textSuccess = false;
          // Loop keys rotation for text evaluation
          for (let attempt = 0; attempt < keysCount; attempt++) {
            const apiKey = keys[currentRequestKeyIndex] || process.env.GEMINI_API_KEY || '';
            if (!apiKey) {
              currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
              globalKeyIndex = currentRequestKeyIndex;
              continue;
            }

            const ai = new GoogleGenAI({ apiKey });
            const maskedKey = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
            console.log(`🌐 [RAG Service] Running text-only Gemini evaluation (model: gemini-2.5-flash) with key index ${currentRequestKeyIndex} (${maskedKey})...`);
            
            try {
              const streamStartTime = Date.now();
              const textContents = [{ role: 'user', parts: [{ text: evaluationPrompt(extractedText) }] }];
              const responseStream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: textContents,
                config: {
                  thinking_level: 'minimal',
                  thinkingLevel: 'minimal'
                } as any
              });

              let accumulatedChars = 0;
              for await (const chunk of responseStream) {
                if (chunk.text) {
                  accumulatedChars += chunk.text.length;
                  controller.enqueue(encoder.encode(chunk.text));
                }
              }
              const latency = Date.now() - streamStartTime;
              const outputTokensEst = Math.round(accumulatedChars / 4);
              const inputTokensEst = 3500; // Average input tokens for text RAG prompt

              await logGeminiUsage({
                model_name: 'gemini-2.5-flash',
                input_tokens: inputTokensEst,
                output_tokens: outputTokensEst,
                total_tokens: inputTokensEst + outputTokensEst,
                api_key_used: apiKey,
                latency_ms: latency
              });

              textSuccess = true;
              break;
            } catch (err: any) {
              const errorMsg = err.message || '';
              const statusCode = String(err.status || err.statusCode || '');
              
              console.error(`❌ [RAG Service] Fallback Text Gemini Error on key index ${currentRequestKeyIndex}:
              Model: gemini-2.5-flash
              Status Code: ${statusCode}
              Message: ${errorMsg}
              Stack: ${err.stack}
              Full Object:`, JSON.stringify(err));

              if (keysCount > 1) {
                console.warn(`⚠️ [RAG Service] Gemini API key index ${currentRequestKeyIndex} failed during text-only fallback. Rotating key...`);
                currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
                globalKeyIndex = currentRequestKeyIndex;
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
              }
              throw err;
            }
          }

          if (!textSuccess) {
            throw new Error('Text-only evaluation failed to execute with all keys.');
          }

        } catch (ocrErr: any) {
          console.error(`❌ [RAG Service] Fallback failed:`, ocrErr);
          const errorMsg = ocrErr.message || ocrErr;
          controller.enqueue(encoder.encode(`\n❌ Fatal Error: Evaluation pipeline collapsed. Reason: ${errorMsg}`));
        }
      }

      controller.close();
    }
  });
}

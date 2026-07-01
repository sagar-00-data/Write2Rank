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
    document_name?: string;
    source_category?: string;
    related_sections?: string[];
    keywords?: string[];
    [key: string]: any;
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

const embeddingCache = new Map<string, number[]>();

async function getQueryEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.trim();
  if (embeddingCache.has(cacheKey)) {
    console.log('🎯 [Embedding Cache Hit] Returning cached embedding.');
    return embeddingCache.get(cacheKey)!;
  }

  const keys = apiKeys.length > 0 ? apiKeys : [process.env.GEMINI_API_KEY || ''];
  const apiKey = keys[globalKeyIndex % keys.length] || '';
  
  if (!apiKey) {
    throw new Error('No Gemini API key available for embedding');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log(`🧬 [RAG Service] Generating query embedding using gemini-embedding-2...`);
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: cacheKey,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Empty embedding returned from Gemini API');
    }

    embeddingCache.set(cacheKey, values);
    return values;
  } catch (error) {
    console.error('❌ [RAG Service] Gemini embedding generation failed:', error);
    throw error;
  }
}

/**
 * Fallback keyword-based search on database chunks when embedding fails or times out.
 */
async function searchVectorStoreKeywordFallback(queryText: string, matchCount = 5): Promise<SearchResult[]> {
  console.log(`🔍 [RAG Service] Running database keyword search fallback for: "${queryText.substring(0, 50)}..."`);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'write', 'answer', 'question', 'explain', 'draft', 'provision', 'provisions', 'section', 'act']);
  
  const keywords = queryText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);

  if (keywords.length === 0) {
    return [];
  }

  const orConditions = keywords.map(kw => `chunk_content.ilike.%${kw}%`).join(',');
  const { data, error } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('id, chunk_content, metadata')
    .or(orConditions)
    .limit(matchCount);

  if (error) {
    console.error('Keyword fallback search error:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    chunk_content: row.chunk_content,
    metadata: row.metadata || {},
    similarity: 0.5
  }));
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
      .map((chunk, idx) => {
        const docName = chunk.metadata?.source_file || chunk.metadata?.document_name || 'Unknown';
        const category = chunk.metadata?.source_category || 'Unknown';
        const related = (chunk.metadata?.related_sections || []).join(', ') || 'None';
        const kws = (chunk.metadata?.keywords || []).join(', ') || 'None';
        return `[Source Document: ${docName}, Category: ${category}, Related Sections: ${related}, Keywords: ${kws}, Chunk: ${idx + 1}]\n${chunk.chunk_content}`;
      })
      .join('\n\n---\n\n');

    return {
      context: context || 'No relevant reference information found in database.',
      attempts,
    };
  } catch (error: any) {
    console.warn(`⚠️ Vector search failed, trying keyword fallback search... Error:`, error.message || error);
    try {
      const fallbackResults = await searchVectorStoreKeywordFallback(currentQuery, 5);
      attempts.push({
        query: currentQuery,
        resultsCount: fallbackResults.length,
        relevance: 'medium',
        feedback: `Keyword fallback retrieval query executed due to: ${error.message || error}`,
      });

      const context = fallbackResults
        .map((chunk, idx) => {
          const docName = chunk.metadata?.source_file || chunk.metadata?.document_name || 'Unknown';
          const category = chunk.metadata?.source_category || 'Unknown';
          const related = (chunk.metadata?.related_sections || []).join(', ') || 'None';
          const kws = (chunk.metadata?.keywords || []).join(', ') || 'None';
          return `[Source Document: ${docName}, Category: ${category}, Related Sections: ${related}, Keywords: ${kws}, Chunk: ${idx + 1}]\n${chunk.chunk_content}`;
        })
        .join('\n\n---\n\n');

      return {
        context: context || 'No relevant reference information found in database.',
        attempts,
      };
    } catch (fallbackError: any) {
      console.error(`❌ Keyword fallback search also failed:`, fallbackError.message || fallbackError);
      return {
        context: 'No relevant reference information found in database.',
        attempts: [{
          query: currentQuery,
          resultsCount: 0,
          relevance: 'low',
          feedback: `Error occurred during retrieval & fallback: ${error.message || error} | ${fallbackError.message || fallbackError}`,
        }]
      };
    }
  }
}

function getGeminiKeys(): string[] {
  return apiKeys;
}

export async function evaluateAnswerMultimodalStream(
  questionText: string,
  base64Data: string,
  mimeType: string,
  ragContext: string,
  answerText?: string
): Promise<ReadableStream> {
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const keys = getGeminiKeys();
  const keysCount = keys.length;
  const evaluationPrompt = (studentAnswerText: string) => `
    ACT AS THE CHIEF EXAMINER OF ICSI (Institute of Company Secretaries of India), AN AI EVALUATION ARCHITECT, PSYCHOMETRIC ASSESSMENT EXPERT, LEGAL EDUCATION SPECIALIST, AND SENIOR PROMPT ENGINEER.
    
    Your objective is to evaluate a professional company secretary exam answer sheet specifically optimized for a standard 5-mark descriptive Company Law theory question. Be deterministic, objective, and fair. Do NOT use subjective grading.

    ==================================================
    THE SCORING ENGINE REDESIGN (Dual-Layered)
    ==================================================
    Follow these stages internally before outputting the final result:

    STAGE 1: QUESTION BLUEPRINT
    Analyze the [STUDENT QUESTION] to generate an internal Question Blueprint based on retrieved contexts:
    - Topic & Chapter
    - Expected Sections
    - Expected Rules & Forms
    - Expected Definitions
    - Expected Concepts & Key statutory requirements
    - Expected Exceptions
    - Expected Answer Structure

    STAGE 2: POINT CLASSIFICATION
    Generate a checklist of expected points and classify each point into one of three categories:
    - MANDATORY (Core Sections, Core Concepts, Statutory Requirements): High weight. Missing this incurs heavy penalties.
    - IMPORTANT (Secondary Rules, Forms, Timelines, Exceptions): Medium weight. Missing this incurs moderate penalties.
    - SUPPORTING (Examples, Minor procedural details, Additional explanation, Concluding statements): Low weight. Missing this incurs minimal penalties.

    STAGE 3: RAG VERIFICATION
    Cross-verify all expected legal details against [RETRIEVED SYLLABUS REFERENCE MATERIALS]. Trust RAG retrieved context over general memory.

    STAGE 4: WEIGHTED COVERAGE ANALYSIS
    Compare the student's answer against the classified checklist.
    Determine:
    - Total Expected vs. Covered MANDATORY points
    - Total Expected vs. Covered IMPORTANT points
    - Total Expected vs. Covered SUPPORTING points
    Calculate Coverage % and Legal/Concept Accuracy. Reward substantially correct knowledge. Do NOT expect identical wording to the model answer. Reward if the concept is substantially correct even with different wording.
    Penalize incorrect legal citations (e.g. hallucinating sections/rules or citing wrong rules) twice as heavily as simple omissions.

    STAGE 5: MATHEMATICAL SCORING & EXAMINER CALIBRATION
    Compute the scores mathematically out of 5 maximum marks:
    - Legal Provision (Max 1.0 Mark): Based on Legal Provision checklist coverage.
    - Concept Coverage (Max 2.0 Marks): Based on Concept checklist coverage.
    - Explanation & Analysis (Max 1.0 Mark): Explanation quality, logical flow, accuracy.
    - Conclusion (Max 0.5 Mark): Presence of correct concluding statement.
    - Presentation (Max 0.5 Mark): Structure, headings, bullets, professional flow.
    
    EXAMINER CALIBRATION & CONSISTENCY:
    Run an internal calibration pass. Ask: "Would an experienced ICSI examiner realistically award these marks? Is the mark too harsh? Too generous?" Adjust only when justified by checklist coverage evidence. Target stability deviation of ±0.25 marks across evaluations.
    Determine an Evaluation Confidence level: High (if coverage is clear, certainty is high, RAG matches well), Medium, or Low.

    ==================================================
    OUTPUT FORMAT INSTRUCTION
    ==================================================
    Your output MUST start with the metrics block below at the absolute beginning. Normalize the scores to 100 max marks for database/tracker compatibility (multiply the 5-mark rubric scores by 20 to get the normalized values). Do NOT write any introduction, greeting, or markdown before it.

    ---METRICS_START---
    Legal Provisions & Citations: [awarded Legal Provision marks normalized to 35, e.g. (Provision Score / 1.0) * 35]/35
    Analysis & Application: [awarded (Concept Coverage + Explanation & Analysis) normalized to 35, e.g. ((Concept + Explanation) / 3.0) * 35]/35
    Conclusion: [awarded Conclusion normalized to 15, e.g. (Conclusion Score / 0.5) * 15]/15
    Secretarial Formatting: [awarded Presentation normalized to 15, e.g. (Presentation Score / 0.5) * 15]/15
    Total Score: [Total Score normalized to 100, e.g. (Total Rubric Score / 5.0) * 100]/100
    ---METRICS_END---

    After the block, write the feedback in Markdown matching these headers exactly:

    ### 1. OVERALL PERFORMANCE
    Overall Marks: [Awarded Rubric Total Score, e.g. 3.75] / 5.0
    Evaluation Confidence: [High/Medium/Low]
    [A natural, experienced examiner summary of the student's performance. Highlight main strengths and key area of concern in legal phrasing.]

    ### 2. MARKS BREAKDOWN
    | Criterion | Expected | Covered | Coverage % | Marks Awarded / Max | Reason for Award / Deduction |
    | --- | --- | --- | --- | --- | --- |
    | Legal Provision | [Count] | [Count] | [Coverage %] | [Marks] / 1.0 | [Detail reasoning based on Mandatory vs Important checklist items covered/missed, or incorrect citation penalties] |
    | Concept Coverage | [Count] | [Count] | [Coverage %] | [Marks] / 2.0 | [Detail reasoning based on checklist concept coverage] |
    | Explanation & Analysis | [Count] | [Count] | [Coverage %] | [Marks] / 1.0 | [Assess understanding depth, explanation quality, and logical flow] |
    | Conclusion | [Count] | [Count] | [Coverage %] | [Marks] / 0.5 | [Verify concluding statement correctness] |
    | Presentation | [Count] | [Count] | [Coverage %] | [Marks] / 0.5 | [Rate professional structure, bullets, and readability] |
    | **Total Score** | **-** | **-** | **-** | **[Total Score] / 5.0** | **Final mathematically calculated sum of the marks.** |

    ### 3. LEGAL PROVISION ANALYSIS
    Provide a bulleted list where each item starts with either ✅ (Correctly Mentioned), ⚠️ (Partially Mentioned), or ❌ (Missing) indicating status. Identify specific Companies Act Sections, Companies Rules, definitions, forms, and authorities from the checklist.

    ### 4. CONCEPT COVERAGE
    | Expected Concept | Student Covered? | Remarks |
    | --- | --- | --- |
    | [Concept from Checklist] | [Yes/No/Partial] | [Remarks on what was written or missed] |

    ### 5. EXAMINER'S OBSERVATIONS
    [Write naturally as an experienced ICSI Examiner. Highlight general observations about the candidate's understanding of the subject, application skills, and secretarial approach. Avoid robotic bullet points. Focus on legal interpretation and depth.]

    ### 6. MISSING LEGAL PROVISIONS, RULES, AND CONCEPTS
    Provide a bulleted list of omissions:
    - **Missing Sections**: [List or None]
    - **Missing Rules / Forms**: [List or None]
    - **Missing Concepts**: [List or None]

    ### 7. HOW TO IMPROVE
    [Provide concrete, actionable advice on what to add or correct to get full marks for this specific question. Mention specific sections, rules, and statutory requirements.]

    ### 8. IMPROVED CANDIDATE ANSWER
    [Generate an improved version of the student's own answer. Retain their structure/formatting where possible, but correct legal and secretarial deficiencies, add rules, and improve flow.]

    ### 9. PERFECT 5-MARK MODEL ANSWER
    [Generate a complete, high-quality topper-grade model answer suitable for a 5-mark question. Write the full text with clear sections: PROVISIONS, ANALYSIS, and CONCLUSION.]

    ### 10. REVISION NOTES
    [Provide 5 to 10 bulleted revision points covering the core legal concepts tested in this question.]

    ---EXTRACTED_TEXT_START---
    ${studentAnswerText}
    ---EXTRACTED_TEXT_END---

    [STUDENT QUESTION]:
    ${questionText || 'Analyze the company law scenario and draft appropriate legal advice.'}

    [RETRIEVED SYLLABUS REFERENCE MATERIALS]:
    ${ragContext}
  `;

  const getMultimodalPrompt = () => `
    ACT AS THE CHIEF EXAMINER OF ICSI (Institute of Company Secretaries of India), AN AI EVALUATION ARCHITECT, PSYCHOMETRIC ASSESSMENT EXPERT, LEGAL EDUCATION SPECIALIST, SENIOR PROMPT ENGINEER, AND EXPERT OCR ENGINE.
    First, perform OCR transcription on the attached answer sheet image.
    Then, evaluate the transcribed answer sheet strictly against the dual-layered weighted scoring pipeline and calibrated 5-mark descriptive theory rubric.
    
    ==================================================
    THE SCORING ENGINE REDESIGN (Dual-Layered)
    ==================================================
    Follow these stages internally before outputting the final result:

    STAGE 1: QUESTION BLUEPRINT
    Analyze the [STUDENT QUESTION] to generate an internal Question Blueprint based on retrieved contexts:
    - Topic & Chapter
    - Expected Sections
    - Expected Rules & Forms
    - Expected Definitions
    - Expected Concepts & Key statutory requirements
    - Expected Exceptions
    - Expected Answer Structure

    STAGE 2: POINT CLASSIFICATION
    Generate a checklist of expected points and classify each point into one of three categories:
    - MANDATORY (Core Sections, Core Concepts, Statutory Requirements): High weight. Missing this incurs heavy penalties.
    - IMPORTANT (Secondary Rules, Forms, Timelines, Exceptions): Medium weight. Missing this incurs moderate penalties.
    - SUPPORTING (Examples, Minor procedural details, Additional explanation, Concluding statements): Low weight. Missing this incurs minimal penalties.

    STAGE 3: RAG VERIFICATION
    Cross-verify all expected legal details against [RETRIEVED SYLLABUS REFERENCE MATERIALS]. Trust RAG retrieved context over general memory.

    STAGE 4: WEIGHTED COVERAGE ANALYSIS
    Compare the student's answer against the classified checklist.
    Determine:
    - Total Expected vs. Covered MANDATORY points
    - Total Expected vs. Covered IMPORTANT points
    - Total Expected vs. Covered SUPPORTING points
    Calculate Coverage % and Legal/Concept Accuracy. Reward substantially correct knowledge. Do NOT expect identical wording to the model answer. Reward if the concept is substantially correct even with different wording.
    Penalize incorrect legal citations (e.g. hallucinating sections/rules or citing wrong rules) twice as heavily as simple omissions.

    STAGE 5: MATHEMATICAL SCORING & EXAMINER CALIBRATION
    Compute the scores mathematically out of 5 maximum marks:
    - Legal Provision (Max 1.0 Mark): Based on Legal Provision checklist coverage.
    - Concept Coverage (Max 2.0 Marks): Based on Concept checklist coverage.
    - Explanation & Analysis (Max 1.0 Mark): Explanation quality, logical flow, accuracy.
    - Conclusion (Max 0.5 Mark): Presence of correct concluding statement.
    - Presentation (Max 0.5 Mark): Structure, headings, bullets, professional flow.
    
    EXAMINER CALIBRATION & CONSISTENCY:
    Run an internal calibration pass. Ask: "Would an experienced ICSI examiner realistically award these marks? Is the mark too harsh? Too generous?" Adjust only when justified by checklist coverage evidence. Target stability deviation of ±0.25 marks across evaluations.
    Determine an Evaluation Confidence level: High (if coverage is clear, certainty is high, RAG matches well), Medium, or Low.

    ==================================================
    OUTPUT FORMAT INSTRUCTION
    ==================================================
    Your output MUST start with the metrics block below at the absolute beginning. Normalize the scores to 100 max marks for database/tracker compatibility (multiply the 5-mark rubric scores by 20 to get the normalized values). Do NOT write any introduction, greeting, or markdown before it.

    ---METRICS_START---
    Legal Provisions & Citations: [awarded Legal Provision marks normalized to 35, e.g. (Provision Score / 1.0) * 35]/35
    Analysis & Application: [awarded (Concept Coverage + Explanation & Analysis) normalized to 35, e.g. ((Concept + Explanation) / 3.0) * 35]/35
    Conclusion: [awarded Conclusion normalized to 15, e.g. (Conclusion Score / 0.5) * 15]/15
    Secretarial Formatting: [awarded Presentation normalized to 15, e.g. (Presentation Score / 0.5) * 15]/15
    Total Score: [Total Score normalized to 100, e.g. (Total Rubric Score / 5.0) * 100]/100
    ---METRICS_END---

    After the block, write the feedback in Markdown matching these headers exactly:

    ### 1. OVERALL PERFORMANCE
    Overall Marks: [Awarded Rubric Total Score, e.g. 3.75] / 5.0
    Evaluation Confidence: [High/Medium/Low]
    [A natural, experienced examiner summary of the student's performance. Highlight main strengths and key area of concern in legal phrasing.]

    ### 2. MARKS BREAKDOWN
    | Criterion | Expected | Covered | Coverage % | Marks Awarded / Max | Reason for Award / Deduction |
    | --- | --- | --- | --- | --- | --- |
    | Legal Provision | [Count] | [Count] | [Coverage %] | [Marks] / 1.0 | [Detail reasoning based on Mandatory vs Important checklist items covered/missed, or incorrect citation penalties] |
    | Concept Coverage | [Count] | [Count] | [Coverage %] | [Marks] / 2.0 | [Detail reasoning based on checklist concept coverage] |
    | Explanation & Analysis | [Count] | [Count] | [Coverage %] | [Marks] / 1.0 | [Assess understanding depth, explanation quality, and logical flow] |
    | Conclusion | [Count] | [Count] | [Coverage %] | [Marks] / 0.5 | [Verify concluding statement correctness] |
    | Presentation | [Count] | [Count] | [Coverage %] | [Marks] / 0.5 | [Rate professional structure, bullets, and readability] |
    | **Total Score** | **-** | **-** | **-** | **[Total Score] / 5.0** | **Final mathematically calculated sum of the marks.** |

    ### 3. LEGAL PROVISION ANALYSIS
    Provide a bulleted list where each item starts with either ✅ (Correctly Mentioned), ⚠️ (Partially Mentioned), or ❌ (Missing) indicating status. Identify specific Companies Act Sections, Companies Rules, definitions, forms, and authorities from the checklist.

    ### 4. CONCEPT COVERAGE
    | Expected Concept | Student Covered? | Remarks |
    | --- | --- | --- |
    | [Concept from Checklist] | [Yes/No/Partial] | [Remarks on what was written or missed] |

    ### 5. EXAMINER'S OBSERVATIONS
    [Write naturally as an experienced ICSI Examiner. Highlight general observations about the candidate's understanding of the subject, application skills, and secretarial approach. Avoid robotic bullet points. Focus on legal interpretation and depth.]

    ### 6. MISSING LEGAL PROVISIONS, RULES, AND CONCEPTS
    Provide a bulleted list of omissions:
    - **Missing Sections**: [List or None]
    - **Missing Rules / Forms**: [List or None]
    - **Missing Concepts**: [List or None]

    ### 7. HOW TO IMPROVE
    [Provide concrete, actionable advice on what to add or correct to get full marks for this specific question. Mention specific sections, rules, and statutory requirements.]

    ### 8. IMPROVED CANDIDATE ANSWER
    [Generate an improved version of the student's own answer. Retain their structure/formatting where possible, but correct legal and secretarial deficiencies, add rules, and improve flow.]

    ### 9. PERFECT 5-MARK MODEL ANSWER
    [Generate a complete, high-quality topper-grade model answer suitable for a 5-mark question. Write the full text with clear sections: PROVISIONS, ANALYSIS, and CONCLUSION.]

    ### 10. REVISION NOTES
    [Provide 5 to 10 bulleted revision points covering the core legal concepts tested in this question.]

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

      // Fast-track: if answerText is already extracted and provided, perform direct text-only evaluation stream
      if (answerText && answerText.trim()) {
        console.log('⚡ [RAG Service] Found pre-extracted answerText. Fast-tracking to text-only evaluation stream...');
        for (let attempt = 0; attempt < keysCount; attempt++) {
          const apiKey = keys[currentRequestKeyIndex] || process.env.GEMINI_API_KEY || '';
          if (!apiKey) {
            currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
            globalKeyIndex = currentRequestKeyIndex;
            continue;
          }

          const ai = new GoogleGenAI({ apiKey });
          const maskedKey = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
          console.log(`🌐 [RAG Service] Direct Text-only Evaluation (model: gemini-2.5-flash) with key index ${currentRequestKeyIndex} (${maskedKey})...`);

          try {
            const streamStartTime = Date.now();
            const textContents = [{ role: 'user', parts: [{ text: evaluationPrompt(answerText) }] }];
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
            const inputTokensEst = 3500;

            await logGeminiUsage({
              model_name: 'gemini-2.5-flash',
              input_tokens: inputTokensEst,
              output_tokens: outputTokensEst,
              total_tokens: inputTokensEst + outputTokensEst,
              api_key_used: apiKey,
              latency_ms: latency
            });

            success = true;
            break;
          } catch (err: any) {
            const errorMsg = err.message || '';
            const statusCode = String(err.status || err.statusCode || '');
            console.error(`❌ [RAG Service] Text evaluation error on key index ${currentRequestKeyIndex}: ${errorMsg}`);
            
            if (keysCount > 1) {
              currentRequestKeyIndex = (currentRequestKeyIndex + 1) % keysCount;
              globalKeyIndex = currentRequestKeyIndex;
              await new Promise(resolve => setTimeout(resolve, 1500));
              continue;
            }
            break;
          }
        }
        
        if (success) {
          controller.close();
          return;
        }
      }

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

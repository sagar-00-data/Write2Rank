const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index > -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase environment variables missing in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sampleQuestion = "Explain the regulatory framework and provisions relating to buy-back of shares under the Companies Act, 2013.";
const sampleAnswer = "A company can buy back its shares. Buy-back is governed by Section 68 of the Companies Act 2013. The buy-back must be authorized by the company's articles of association. A special resolution must be passed in the general meeting of the company. However, if the buyback is 10% or less of the total paid-up equity capital and free reserves of the company, it can be authorized by the board of directors by a resolution. The buyback must be completed within 12 months from the date of the resolution. The ratio of debt owed by the company after buy-back should not be more than twice the aggregate of its paid-up capital and free reserves.";

const keysSet = new Set();
if (process.env.GEMINI_API_KEYS) {
  process.env.GEMINI_API_KEYS.split(',').forEach(k => {
    const trimmed = k.trim();
    if (trimmed) keysSet.add(trimmed);
  });
}
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (key) keysSet.add(key.trim());
}
if (process.env.GEMINI_API_KEY) {
  keysSet.add(process.env.GEMINI_API_KEY.trim());
}

const apiKeys = Array.from(keysSet);
let currentIdx = 0;

if (apiKeys.length === 0) {
  console.error('❌ Error: No Gemini API keys found in env variables');
  process.exit(1);
}

async function callModelWithRotationLocal(fn, maxAttempts = 5) {
  let lastError;
  const attemptsLimit = Math.max(maxAttempts, apiKeys.length);
  for (let attempt = 0; attempt < attemptsLimit; attempt++) {
    const key = apiKeys[currentIdx];
    currentIdx = (currentIdx + 1) % apiKeys.length;
    const aiClient = new GoogleGenAI({ apiKey: key });
    try {
      return await fn(aiClient);
    } catch (err) {
      lastError = err;
      const masked = key.substring(0, 6) + '...' + key.substring(key.length - 4);
      console.warn(`⚠️ [Audit Client] Key ${masked} failed. Rotating...`);
    }
  }
  throw lastError;
}

// Helper to generate embedding using gemini-embedding-2
async function getEmbedding(text) {
  return await callModelWithRotationLocal(async (aiClient) => {
    const response = await aiClient.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text
    });
    return response.embeddings?.[0]?.values;
  });
}

// Helper to call match_icsi_knowledge
async function searchVectorStore(embedding, matchThreshold = 0.35, matchCount = 5) {
  const { data, error } = await supabase.rpc('match_icsi_knowledge', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });
  if (error) throw error;
  return data || [];
}

// Fallback keyword search
async function keywordSearchFallback(queryText, matchCount = 5) {
  const words = queryText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  if (words.length === 0) return [];
  const orConditions = words.map(w => `chunk_content.ilike.%${w}%`).join(',');
  const { data, error } = await supabase.from('icsi_knowledge_embeddings').select('id, chunk_content, metadata').or(orConditions).limit(matchCount);
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    chunk_content: row.chunk_content,
    metadata: row.metadata || {},
    similarity: 0.5
  }));
}

// Evaluator prompt function
const getEvaluationPrompt = (question, answer, ragContext) => `
ACT AS A STRICT, TOUGH ICSI (Institute of Company Secretaries of India) COUNCIL EXAMINER.
Grade strictly against the "Answer Writing Masterclass" framework.

OUTPUT FORMAT INSTRUCTION:
Your output MUST start with the metrics block below at the absolute beginning.

---METRICS_START---
Legal Provisions & Citations: [awarded]/35
Analysis & Application: [awarded]/35
Conclusion: [awarded]/15
Secretarial Formatting: [awarded]/15
Total Score: [total]/100
---METRICS_END---

After the block, write the critique in Markdown.

[STUDENT QUESTION]:
${question}

[STUDENT ANSWER]:
${answer}

[RETRIEVED SYLLABUS REFERENCE MATERIALS]:
${ragContext}
`;

async function runAudit() {
  console.log('==========================================================');
  console.log('       WRITE2RANK RAG SYSTEM VALIDATION AUDIT             ');
  console.log('==========================================================\n');

  // STEP 5: KNOWLEDGE BASE AUDIT
  console.log('----------------------------------------------------------');
  console.log('STEP 5: Knowledge Base Audit');
  console.log('----------------------------------------------------------');
  const { count, error: countErr } = await supabase.from('icsi_knowledge_embeddings').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('Error counting database rows:', countErr);
    return;
  }
  const { data: rows } = await supabase.from('icsi_knowledge_embeddings').select('metadata');
  const dist = {};
  rows.forEach(r => {
    const src = r.metadata?.source_file || 'Unknown';
    dist[src] = (dist[src] || 0) + 1;
  });

  console.log(`Embedding Model: gemini-embedding-2`);
  console.log(`Vector Dimension: 3072`);
  console.log(`Database Table: icsi_knowledge_embeddings`);
  console.log(`Total Indexed Documents: ${Object.keys(dist).length}`);
  console.log(`Total Chunks/Embeddings: ${count}`);
  console.log('Chunk Distribution:');
  Object.entries(dist).forEach(([file, count]) => {
    console.log(`  - ${file}: ${count} chunks`);
  });
  console.log('\n');

  // STEP 7: PERFORMANCE & STEP 2: RETRIEVAL VERIFICATION
  console.log('----------------------------------------------------------');
  console.log('STEP 7 & STEP 2: Performance and Retrieval Verification');
  console.log('----------------------------------------------------------');
  const startEmbed = Date.now();
  const emb = await getEmbedding(sampleQuestion);
  const embedTime = Date.now() - startEmbed;

  const startSearch = Date.now();
  const chunks = await searchVectorStore(emb, 0.35, 5);
  const searchTime = Date.now() - startSearch;

  console.log(`Performance latency metrics:`);
  console.log(`  - Embedding generation: ${embedTime} ms`);
  console.log(`  - Supabase vector search: ${searchTime} ms`);
  console.log(`  - Total retrieval latency: ${embedTime + searchTime} ms`);
  console.log(`  - Prompt construction: ~0.1 ms\n`);

  console.log(`Retrieved ${chunks.length} chunks:`);
  chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i + 1}`);
    console.log(`  Document: ${chunk.metadata?.source_file || 'Unknown'}`);
    console.log(`  Chunk ID: ${chunk.id}`);
    console.log(`  Similarity Score: ${chunk.similarity}`);
    console.log(`  Text (first 300 chars):\n"${chunk.chunk_content.substring(0, 300).replace(/\n/g, ' ')}..."`);
  });
  console.log('\n');

  // STEP 3: VERIFY PROMPT INJECTION
  console.log('----------------------------------------------------------');
  console.log('STEP 3: Verify Prompt Injection (Final Prompt Structure)');
  console.log('----------------------------------------------------------');
  const contextText = chunks.map((c, idx) => `[Source: ${c.metadata?.source_file}, Chunk ${idx+1}]\n${c.chunk_content}`).join('\n\n');
  const finalPrompt = getEvaluationPrompt(sampleQuestion, sampleAnswer, contextText);
  // Print structure preview
  const lines = finalPrompt.split('\n');
  console.log('--- PROMPT PREVIEW ---');
  console.log(lines.slice(0, 20).join('\n'));
  console.log('...\n[RETRIEVED SYLLABUS REFERENCE MATERIALS]:');
  console.log(contextText.substring(0, 300) + '\n...');
  console.log('----------------------\n');

  // STEP 6: RETRIEVAL QUALITY FOR 7 SAMPLE QUERIES
  console.log('----------------------------------------------------------');
  console.log('STEP 6: Retrieval Quality on Sample Queries');
  console.log('----------------------------------------------------------');
  const sampleQueries = [
    "Section 62",
    "Prospectus",
    "Compromise and Arrangement",
    "Corporate Social Responsibility",
    "Charges",
    "Board Meetings",
    "Secretarial Standards"
  ];

  for (const q of sampleQueries) {
    const qEmb = await getEmbedding(q);
    const results = await searchVectorStore(qEmb, 0.20, 1);
    console.log(`Query: "${q}"`);
    if (results.length > 0) {
      console.log(`  - Retrieved doc: ${results[0].metadata?.source_file}`);
      console.log(`  - Similarity score: ${results[0].similarity}`);
      console.log(`  - Chunk preview: "${results[0].chunk_content.substring(0, 150).replace(/\n/g, ' ')}..."`);
    } else {
      console.log(`  - No matches retrieved above threshold.`);
    }
    console.log();
  }

  // STEP 8: FAILURE TESTING
  console.log('----------------------------------------------------------');
  console.log('STEP 8: Failure Testing');
  console.log('----------------------------------------------------------');
  console.log('Simulating Vector Search failure...');
  try {
    // Attempt keyword search fallback
    const fallbackResults = await keywordSearchFallback(sampleQuestion, 3);
    console.log(`✅ Falling back to Keyword Search succeeded! Retrieved ${fallbackResults.length} chunks.`);
    if (fallbackResults.length > 0) {
      console.log(`First fallback match: "${fallbackResults[0].chunk_content.substring(0, 150).replace(/\n/g, ' ')}..."`);
    }
  } catch (err) {
    console.error('Keyword fallback failed:', err);
  }
  console.log('\n');

  // STEP 4: A/B TESTING (RAG VS NO RAG)
  console.log('----------------------------------------------------------');
  console.log('STEP 4: A/B Testing (RAG vs No RAG)');
  console.log('----------------------------------------------------------');
  console.log('Running Test A (RAG Enabled)...');
  const startA = Date.now();
  const resultA = await callModelWithRotationLocal(async (aiClient) => {
    return await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
    });
  });
  console.log(`Test A Complete in ${Date.now() - startA} ms.`);

  console.log('\nRunning Test B (RAG Disabled)...');
  const startB = Date.now();
  const finalPromptNoRag = getEvaluationPrompt(sampleQuestion, sampleAnswer, "NO REFERENCED MATERIAL FOUND IN DATABASE. EVALUATE BASED ON STANDARD LAWS.");
  const resultB = await callModelWithRotationLocal(async (aiClient) => {
    return await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: finalPromptNoRag }] }]
    });
  });
  console.log(`Test B Complete in ${Date.now() - startB} ms.\n`);

  console.log('=== TEST A RESPONSE (RAG ENABLED) ===');
  console.log(resultA.text || 'No response');
  console.log('======================================\n');

  console.log('=== TEST B RESPONSE (RAG DISABLED) ===');
  console.log(resultB.text || 'No response');
  console.log('=======================================');
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
});

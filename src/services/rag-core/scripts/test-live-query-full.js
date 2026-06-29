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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dummy rotation to mock globalKeyIndex
let globalKeyIndex = 0;
const apiKeys = [GEMINI_API_KEY];

const embeddingCache = new Map();

async function getQueryEmbedding(text) {
  const cacheKey = text.trim();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: cacheKey,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Empty embedding returned');
    }

    embeddingCache.set(cacheKey, values);
    return values;
  } catch (error) {
    throw error;
  }
}

async function searchVectorStore(embedding, matchThreshold = 0.35, matchCount = 5) {
  const { data, error } = await supabase.rpc('match_icsi_knowledge', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw error;
  }
  return data || [];
}

async function runTest() {
  const query = "What are the rules for compromises and arrangements under Companies Act 2013?";
  console.log(`Running end-to-end CRAG vector store test for query: "${query}"`);

  try {
    const queryEmbedding = await getQueryEmbedding(query);
    console.log(`✅ Embedding generated successfully! Vector dimension: ${queryEmbedding.length}`);

    const results = await searchVectorStore(queryEmbedding, 0.35, 3);
    console.log(`✅ Similarity search succeeded! Retrieved ${results.length} matches.`);

    results.forEach((match, i) => {
      console.log(`\nMatch ${i + 1}:`);
      console.log(`- Source: ${match.metadata?.source_file}`);
      console.log(`- Similarity: ${match.similarity}`);
      console.log(`- Snippet: ${match.chunk_content.substring(0, 180)}...`);
    });
  } catch (err) {
    console.error('❌ CRAG query test failed:', err);
  }
}

runTest();

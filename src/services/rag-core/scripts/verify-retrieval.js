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

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  // Fetch chunks
  const { data: dbChunks, error: dbError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('chunk_content, metadata');

  if (dbError) {
    console.error('❌ DB Error:', dbError.message);
    return;
  }

  const testChunk = dbChunks.find(c => c.metadata?.source_file === 'audit-test.pdf');

  if (!testChunk) {
    console.error('❌ audit-test.pdf chunk not found in DB.');
    return;
  }

  const testText = testChunk.chunk_content;
  console.log(`Ingested chunk content: "${testText}"`);

  // 2. Perform semantic search query
  console.log(`\nRunning semantic search for query: "${testText}"`);
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: testText,
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    console.error('❌ Could not generate query embedding');
    return;
  }

  const { data: matches, error: rpcError } = await supabase.rpc('match_icsi_knowledge', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 5,
  });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError.message);
    return;
  }

  console.log(`\nSemantic Search Results (Top 3 matches):`);
  matches.slice(0, 3).forEach((match, i) => {
    console.log(`Match ${i + 1}:`);
    console.log(`  Source: ${match.metadata?.source_file}`);
    console.log(`  Similarity: ${match.similarity}`);
    console.log(`  Text: "${match.chunk_content}"`);
  });
}

run();

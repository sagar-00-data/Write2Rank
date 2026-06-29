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

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not defined in .env.local');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testGeminiEmbedding() {
  const query = "What are the rules for compromises and arrangements under Companies Act 2013?";
  console.log(`Generating embedding using gemini-embedding-2 for query: "${query}"`);

  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004', // Wait, let's see which model is used or let's try 'text-embedding-004' or 'gemini-embedding-2'
      contents: query,
    });

    console.log('Gemini Embed response keys:', Object.keys(response));
    const embedding = response.embedding;
    if (embedding && embedding.values) {
      console.log('Embedding values length:', embedding.values.length);
      console.log('First 5 values:', embedding.values.slice(0, 5));

      console.log('Calling match_icsi_knowledge in database with Gemini embedding...');
      const { data, error } = await supabase.rpc('match_icsi_knowledge', {
        query_embedding: embedding.values,
        match_threshold: 0.1,
        match_count: 3
      });

      if (error) {
        console.error('❌ Database RPC query failed:', error);
      } else {
        console.log(`✅ Success! Retrieved ${data.length} relevant chunks.`);
        data.forEach((m, idx) => {
          console.log(`Match ${idx + 1}: ${m.metadata.source_file} (Similarity: ${m.similarity})`);
          console.log(`Snippet: ${m.chunk_content.substring(0, 150)}...\n`);
        });
      }
    } else {
      console.log('❌ Failed to get embedding values from response:', response);
    }
  } catch (err) {
    console.error('💥 Error during Gemini embedding test:', err);
  }
}

testGeminiEmbedding();

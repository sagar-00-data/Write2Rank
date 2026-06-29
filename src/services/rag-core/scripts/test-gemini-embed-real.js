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

async function test() {
  const query = "What are the rules for compromises and arrangements under Companies Act 2013?";
  console.log(`Generating query embedding using "gemini-embedding-2"...`);

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: query
    });

    const values = response.embeddings?.[0]?.values;
    if (values) {
      console.log('Embedding values length:', values.length);
      console.log('First 5 elements:', values.slice(0, 5));

      console.log('Running Supabase similarity query...');
      const { data, error } = await supabase.rpc('match_icsi_knowledge', {
        query_embedding: values,
        match_threshold: 0.1,
        match_count: 3
      });

      if (error) {
        console.error('❌ Database RPC failed:', error);
      } else {
        console.log(`✅ Success! Match count: ${data.length}`);
        data.forEach((m, idx) => {
          console.log(`- Match ${idx+1} [${m.metadata.source_file}] (Similarity: ${m.similarity})`);
        });
      }
    } else {
      console.error('❌ No values field in embedding response:', response);
    }
  } catch (err) {
    console.error('💥 Error during test:', err);
  }
}

test();

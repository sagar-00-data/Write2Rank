const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getQueryEmbedding(text) {
  const hfToken = process.env.HF_TOKEN || '';
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      headers: { 'Content-Type': 'application/json' },
      method: "POST",
      body: JSON.stringify({ inputs: text }),
    }
  );
  if (!response.ok) {
    throw new Error(`HF failed: ${response.status}`);
  }
  return await response.json();
}

async function check() {
  const query = "What are the rules for compromises and arrangements?";
  console.log(`Getting embedding for query: "${query}"`);
  
  try {
    const emb = await getQueryEmbedding(query);
    console.log('Embedding dimension retrieved:', emb.length);

    console.log('Calling match_icsi_knowledge in database...');
    const { data, error } = await supabase.rpc('match_icsi_knowledge', {
      query_embedding: emb,
      match_threshold: 0.1,
      match_count: 3
    });

    if (error) {
      console.error('❌ Database query failed with error:', error);
    } else {
      console.log('✅ Database query succeeded. Result count:', data.length);
    }
  } catch (err) {
    console.error('💥 Script caught error:', err);
  }
}

check();

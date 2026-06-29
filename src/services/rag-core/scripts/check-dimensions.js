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

async function check() {
  const { data, error } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('id, embedding')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching row:', error);
    return;
  }

  const embedding = data.embedding;
  if (!embedding) {
    console.log('No embedding found on first row.');
    return;
  }

  // If it's a string, e.g. '[0.1, 0.2, ...]'
  if (typeof embedding === 'string') {
    const arr = embedding.slice(1, -1).split(',');
    console.log('Embedding type: string');
    console.log('Vector length (dimension):', arr.length);
    console.log('First 5 elements:', arr.slice(0, 5));
  } else if (Array.isArray(embedding)) {
    console.log('Embedding type: Array');
    console.log('Vector length (dimension):', embedding.length);
    console.log('First 5 elements:', embedding.slice(0, 5));
  } else {
    console.log('Unknown embedding format:', typeof embedding, embedding);
  }
}

check();

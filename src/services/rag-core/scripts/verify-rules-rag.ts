import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Load environment variables manually from .env.local
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text
  });
  return response.embeddings?.[0]?.values || [];
}

async function verifyQuery(queryText: string) {
  console.log(`\n🔍 Querying: "${queryText}"`);
  const embedding = await getEmbedding(queryText);

  const { data: results, error } = await supabase.rpc('match_icsi_knowledge', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: 5
  });

  if (error) {
    console.error('❌ RPC Query failed:', error.message);
    return;
  }

  console.log(`\nTop 5 Results for "${queryText}":`);
  (results || []).forEach((row: any, idx: number) => {
    const docName = row.metadata?.source_file || row.metadata?.document_name || 'Unknown';
    const category = row.metadata?.source_category || 'Unknown';
    const related = (row.metadata?.related_sections || []).join(', ') || 'None';
    console.log(`[${idx + 1}] Similarity: ${row.similarity.toFixed(4)} | Doc: ${docName} | Cat: ${category} | Related: ${related}`);
    console.log(`    Content: "${row.chunk_content.substring(0, 160).replace(/\n/g, ' ')}..."`);
  });
}

async function main() {
  console.log('📊 --- ICSI RULES DATABASE AUDIT ---');
  
  const { count, error: countError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>document_type', 'Companies Rules');

  if (countError) {
    console.error('❌ Failed to fetch database count:', countError.message);
    process.exit(1);
  }

  const { data: rows, error: rowsError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('metadata')
    .eq('metadata->>document_type', 'Companies Rules');

  if (rowsError) {
    console.error('❌ Failed to fetch rows:', rowsError.message);
    process.exit(1);
  }

  const uniqueFiles = new Set((rows || []).map((r: any) => r.metadata?.source_file));

  console.log(`Total indexed Rules chunks: ${count}`);
  console.log(`Total unique Rules files: ${uniqueFiles.size}`);

  console.log('\n🌟 --- RUNNING DUAL-RETRIEVAL VERIFICATION ---');

  await verifyQuery('Further issue of share capital, employee stock option scheme and bonus shares');
  await verifyQuery('Private placement requirements, prospectus and allotment of securities under section 42');
  await verifyQuery('Acceptance of deposits by companies from its members or public');
}

main().catch(err => console.error(err));

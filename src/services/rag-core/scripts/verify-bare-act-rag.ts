import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

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

const FILE_NAME = 'Companies_Act_2013_Bare_Act.pdf';

const TARGET_SECTIONS = [
  '2(68)', '7', '12', '42', '62', '73', '92', '96', '117', '134',
  '149', '173', '177', '179', '184', '185', '188', '230', '248'
];

// Load and compile all API keys
const apiKeys: string[] = (() => {
  const keysSet = new Set<string>();
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed) keysSet.add(trimmed);
    });
  }
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GEMINI_API_KEY` + (i === 1 ? '' : `_${i}`)];
    if (key) {
      keysSet.add(key.trim());
    }
  }
  if (process.env.GEMINI_API_KEY) {
    keysSet.add(process.env.GEMINI_API_KEY.trim());
  }
  return Array.from(keysSet);
})();

let keyPointer = 0;
const exhaustedKeys = new Set<number>();

function getNextAIClient(): { client: GoogleGenAI; index: number } {
  let attempts = 0;
  while (exhaustedKeys.has(keyPointer) && attempts < apiKeys.length) {
    keyPointer = (keyPointer + 1) % apiKeys.length;
    attempts++;
  }
  if (exhaustedKeys.size === apiKeys.length) {
    exhaustedKeys.clear();
  }
  const key = apiKeys[keyPointer];
  const activeIndex = keyPointer;
  keyPointer = (keyPointer + 1) % apiKeys.length;
  return { client: new GoogleGenAI({ apiKey: key }), index: activeIndex };
}

async function getEmbedding(text: string, client: GoogleGenAI): Promise<number[]> {
  const response = await client.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  return response.embeddings?.[0]?.values || [];
}

async function getEmbeddingWithRetry(text: string, retries = 5, delay = 2000): Promise<number[]> {
  const { client, index } = getNextAIClient();
  try {
    return await getEmbedding(text, client);
  } catch (err: any) {
    const errMsg = err.message || '';
    if (retries > 0 && (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit'))) {
      exhaustedKeys.add(index);
      return getEmbeddingWithRetry(text, retries - 1, 500);
    }
    throw err;
  }
}

async function runQualityCheck() {
  console.log('\n=======================================');
  console.log('🔍 DATABASE QUALITY CHECK...');
  console.log('=======================================');

  const { data: allRows, error: fetchError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('id, chunk_content, metadata')
    .eq('metadata->>source_file', FILE_NAME);

  if (fetchError) {
    console.error('❌ Failed to fetch database metadata:', fetchError.message);
    return;
  }

  console.log(`📊 Total Indexed Chunks for Bare Act in DB: ${allRows.length}`);

  let emptyCount = 0;
  let missingMetadataCount = 0;
  const contentHashes = new Set<string>();
  let duplicateCount = 0;

  for (const row of allRows) {
    if (!row.chunk_content || !row.chunk_content.trim()) emptyCount++;
    
    const m = row.metadata;
    if (!m || !m.source_file || !m.document_type || !m.act_name || !m.chapter || !m.section_number) {
      missingMetadataCount++;
    }

    if (row.chunk_content) {
      const hash = row.chunk_content.trim().substring(0, 100);
      if (contentHashes.has(hash)) {
        duplicateCount++;
      } else {
        contentHashes.add(hash);
      }
    }
  }

  console.log(`- Empty chunks: ${emptyCount}`);
  console.log(`- Missing/incomplete metadata: ${missingMetadataCount}`);
  console.log(`- Duplicate chunks (approx): ${duplicateCount}`);
  console.log('✅ Quality check complete.');
}

async function runSemanticTests() {
  console.log('\n=======================================');
  console.log('🧪 RUNNING SEMANTIC RETRIEVAL TESTS...');
  console.log('=======================================');

  const results: Array<{
    target: string;
    doc: string;
    score: number;
    sec: string;
    preview: string;
  }> = [];

  for (const secNum of TARGET_SECTIONS) {
    const query = `Section ${secNum} of the Companies Act 2013`;
    
    try {
      const embedding = await getEmbeddingWithRetry(query);

      // Search database using pgvector match RPC
      const { data, error } = await supabase.rpc('match_icsi_knowledge', {
        query_embedding: embedding,
        match_threshold: 0.2,
        match_count: 5
      });

      if (error) {
        console.error(`❌ Error matching Section ${secNum}:`, error.message);
        continue;
      }

      // Filter matches specifically to find the best match from the Bare Act source file
      const bareActMatches = (data || []).filter((row: any) => 
        row.metadata?.source_file === FILE_NAME
      );

      if (bareActMatches.length > 0) {
        const topMatch = bareActMatches[0];
        results.push({
          target: `Section ${secNum}`,
          doc: topMatch.metadata?.source_file || 'Unknown',
          score: Math.round(topMatch.similarity * 100) / 100,
          sec: topMatch.metadata?.section_number || 'Unknown',
          preview: topMatch.chunk_content.substring(0, 200).replace(/\n/g, ' ') + '...'
        });
      } else {
        const topMatch = data?.[0];
        results.push({
          target: `Section ${secNum}`,
          doc: topMatch ? (topMatch.metadata?.source_file || 'Unknown') : 'None',
          score: topMatch ? Math.round(topMatch.similarity * 100) / 100 : 0,
          sec: topMatch ? (topMatch.metadata?.section_number || 'Unknown') : 'None',
          preview: topMatch ? topMatch.chunk_content.substring(0, 200).replace(/\n/g, ' ') + '...' : 'N/A'
        });
      }
    } catch (err: any) {
      console.error(`❌ Failed to retrieve Section ${secNum}:`, err.message || err);
    }
  }

  console.table(results);

  // Write markdown table report for walkthrough
  let reportMd = '### RAG Semantic Retrieval Verification Results\n\n';
  reportMd += '| Target Section | Retrieved Document | Similarity Score | Section Identified | Chunk Preview |\n';
  reportMd += '|---|---|---|---|---|\n';
  for (const r of results) {
    reportMd += `| **${r.target}** | \`${r.doc}\` | ${r.score} | ${r.sec} | ${r.preview} |\n`;
  }
  
  fs.writeFileSync(path.resolve(process.cwd(), 'src/services/rag-core/scripts/retrieval_verification.md'), reportMd);
  console.log('\n📄 Saved retrieval verification results to src/services/rag-core/scripts/retrieval_verification.md');
}

async function main() {
  await runQualityCheck();
  await runSemanticTests();
}

main().catch(err => console.error(err));

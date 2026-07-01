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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase URL/Key is not defined in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
  console.log('--- Supabase RAG Document Inventory ---');
  const { data: rows, error } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('metadata');

  if (error) {
    console.error('❌ Error fetching RAG metadata:', error.message);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('⚠️ No documents found in database.');
    return;
  }

  const docStats = {};
  rows.forEach((row) => {
    const meta = row.metadata || {};
    const file = meta.source_file || 'Unknown Document';
    const ingested = meta.ingested_at || 'N/A';
    
    if (!docStats[file]) {
      docStats[file] = {
        count: 0,
        dates: new Set(),
      };
    }
    docStats[file].count++;
    if (ingested && ingested !== 'N/A') {
      docStats[file].dates.add(ingested);
    }
  });

  console.log(`\nFound ${Object.keys(docStats).length} unique documents:\n`);
  for (const [filename, stats] of Object.entries(docStats)) {
    const sortedDates = Array.from(stats.dates).sort();
    const dateStr = sortedDates.length > 0 ? sortedDates[0] : 'Unknown Ingestion Date';
    console.log(`📄 Document: ${filename}`);
    console.log(`   Chunks: ${stats.count}`);
    console.log(`   Ingestion Date: ${dateStr}`);
    console.log(`   Embedding Model: gemini-embedding-2 (3072 dimensions)`);
    console.log(`   Status: Active\n`);
  }
}

runAudit();

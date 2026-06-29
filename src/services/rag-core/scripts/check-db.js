const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase URL/Key is not defined in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDb() {
  console.log('📡 Connecting to Supabase database...');
  console.log('URL:', SUPABASE_URL);

  try {
    // 1. Check total chunks count
    const { count, error: countErr } = await supabase
      .from('icsi_knowledge_embeddings')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('❌ Error fetching chunk count:', countErr);
      return;
    }

    console.log(`\n📊 Total Chunks Count: ${count}`);

    // 2. Fetch all chunks to inspect metadata and group by source_file
    const { data: allRows, error: fetchErr } = await supabase
      .from('icsi_knowledge_embeddings')
      .select('id, metadata, embedding');

    if (fetchErr) {
      console.error('❌ Error fetching chunk records:', fetchErr);
      return;
    }

    const fileMap = {};
    let nullEmbeddingsCount = 0;
    let embeddingDim = null;

    allRows.forEach(row => {
      const source = (row.metadata && row.metadata.source_file) || 'Unknown File';
      fileMap[source] = (fileMap[source] || 0) + 1;

      if (!row.embedding) {
        nullEmbeddingsCount++;
      } else if (!embeddingDim) {
        // Parse embedding dimension if vector representation is a string or array
        const emb = row.embedding;
        if (typeof emb === 'string') {
          // format: '[0.1, 0.2, ...]'
          embeddingDim = emb.slice(1, -1).split(',').length;
        } else if (Array.isArray(emb)) {
          embeddingDim = emb.length;
        }
      }
    });

    console.log('\n📄 Ingested Documents List and Chunk Distribution:');
    Object.entries(fileMap).forEach(([file, chunks]) => {
      console.log(` - ${file}: ${chunks} chunks`);
    });

    console.log(`\n🧩 Total Chunks: ${allRows.length}`);
    console.log(`📉 Chunks missing embeddings: ${nullEmbeddingsCount}`);
    console.log(`🧬 Vector Dimension: ${embeddingDim || 'N/A'}`);

    // 3. Test RPC function for semantic search
    console.log('\n🧪 Testing semantic search (match_icsi_knowledge function)...');
    // We create a dummy vector of matching dimensions filled with tiny floats
    if (embeddingDim) {
      const dummyVector = Array(embeddingDim).fill(0.01);
      const { data: matches, error: rpcErr } = await supabase.rpc('match_icsi_knowledge', {
        query_embedding: dummyVector,
        match_threshold: 0.0,
        match_count: 3
      });

      if (rpcErr) {
        console.error('❌ RPC Function (match_icsi_knowledge) failed:', rpcErr);
      } else {
        console.log(`✅ RPC call successful! Retrieved ${matches.length} matches.`);
        if (matches.length > 0) {
          console.log('\nExample match preview:');
          matches.forEach((m, idx) => {
            console.log(`\n[Match ${idx + 1}] Similarity: ${m.similarity}`);
            console.log(`Source File: ${m.metadata.source_file}`);
            console.log(`Content Snippet:\n${m.chunk_content.substring(0, 150)}...\n`);
          });
        }
      }
    } else {
      console.log('⚠️ Could not run semantic search test because embedding dimension was not detected.');
    }

  } catch (err) {
    console.error('💥 Error running check:', err);
  }
}

checkDb();

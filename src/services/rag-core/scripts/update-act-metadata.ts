import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

const FILE_NAME = 'Companies_Act_2013_Bare_Act.pdf';

async function main() {
  console.log('🔄 Fetching Act chunks to update metadata...');
  const { data: rows, error: fetchError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('id, metadata')
    .eq('metadata->>source_file', FILE_NAME);

  if (fetchError) {
    console.error('❌ Fetch failed:', fetchError.message);
    process.exit(1);
  }

  console.log(`📊 Found ${rows.length} Act chunks. Updating metadata...`);

  let updatedCount = 0;
  for (const row of rows) {
    const updatedMetadata = {
      ...row.metadata,
      source_category: 'bare_act'
    };

    const { error: updateError } = await supabase
      .from('icsi_knowledge_embeddings')
      .update({ metadata: updatedMetadata })
      .eq('id', row.id);

    if (updateError) {
      console.error(`❌ Update failed for row ID ${row.id}:`, updateError.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`🎉 Successfully updated source_category for ${updatedCount}/${rows.length} Act chunks.`);
}

main().catch(err => console.error(err));

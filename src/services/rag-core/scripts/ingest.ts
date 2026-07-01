import fs from 'fs';
import path from 'path';
import * as _pdf from 'pdf-parse';
const pdf = (_pdf as any).default || _pdf;
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '../utils/chunker';

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not defined in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase URL/Key is not defined in .env.local');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), 'src/services/rag-core/knowledge-base');

async function processPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new pdf.PDFParse({ data: dataBuffer });
  await parser.load();
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('No embedding values returned from Gemini API');
  }
  return values;
}

async function main() {
  console.log('🚀 Starting ICSI Legal Knowledge Base Ingestion In Process...');
  console.log(`Scanning directory: ${KNOWLEDGE_BASE_DIR}`);

  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    console.error(`❌ Error: Knowledge base directory does not exist: ${KNOWLEDGE_BASE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(f => f.endsWith('.pdf'));

  if (files.length === 0) {
    console.warn('⚠️ No PDF files found in knowledge-base folder.');
    return;
  }

  console.log(`Found ${files.length} PDF files to process:`, files);

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
    console.log(`\n📄 Processing: ${file}`);
    
    try {
      const rawText = await processPdf(filePath);
      console.log(`✨ Extracted text: ${rawText.length} characters.`);

      const chunks = chunkText(rawText);
      console.log(`✂️ Created ${chunks.length} chunks.`);

      // Query existing chunks in Supabase to avoid duplicates
      const { data: existingRows } = await supabase
        .from('icsi_knowledge_embeddings')
        .select('metadata')
        .eq('metadata->>source_file', file);
      
      const ingestedIndices = new Set<number>();
      if (existingRows) {
        for (const row of existingRows) {
          const idx = (row.metadata as any)?.chunk_index;
          if (typeof idx === 'number') {
            ingestedIndices.add(idx);
          }
        }
      }
      console.log(`ℹ️ Already ingested chunks count: ${ingestedIndices.size}.`);

      let successCount = ingestedIndices.size;

      // Helper function with retry backoff for rate limits
      async function getEmbeddingWithRetry(text: string, retries = 5, delay = 2000): Promise<number[]> {
        try {
          return await getEmbedding(text);
        } catch (err: any) {
          const errMsg = err.message || '';
          if (retries > 0 && (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit'))) {
            console.warn(`⚠️ Rate limited. Retrying in ${delay / 1000}s (${retries} retries left)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getEmbeddingWithRetry(text, retries - 1, delay * 2);
          }
          throw err;
        }
      }

      for (let i = 0; i < chunks.length; i++) {
        if (ingestedIndices.has(i)) {
          continue;
        }
        
        const chunk = chunks[i];
        const progress = `[${i + 1}/${chunks.length}]`;
        
        try {
          // Add a delay between embedding calls to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const embedding = await getEmbeddingWithRetry(chunk.content);
          
          const { error } = await supabase.from('icsi_knowledge_embeddings').insert({
            chunk_content: chunk.content,
            metadata: {
              source_file: file,
              chunk_index: i,
              total_chunks: chunks.length,
              ingested_at: new Date().toISOString()
            },
            embedding: embedding
          });

          if (error) {
            console.error(`❌ ${progress} Database insert failed:`, error.message);
          } else {
            successCount++;
            if (successCount % 10 === 0 || successCount === chunks.length) {
              console.log(`✅ ${progress} Embedded and stored ${successCount} chunks successfully.`);
            }
          }
        } catch (err: any) {
          console.error(`❌ ${progress} Embedding failed for chunk ${i}:`, err.message || err);
        }
      }
      
      console.log(`🎉 Ingestion completed for ${file}. Stored ${successCount}/${chunks.length} chunks.`);
    } catch (err: any) {
      console.error(`❌ Failed to process file ${file}:`, err.message || err);
    }
  }

  console.log('\n🏁 Ingestion pipeline process finished.');
}

main().catch(err => {
  console.error('💥 Fatal ingestion error:', err);
});


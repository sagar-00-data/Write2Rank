import fs from 'fs';
import path from 'path';
import * as _pdf from 'pdf-parse';
const pdf = (_pdf as any).default || _pdf;
import { GoogleGenAI } from '@google/genai';
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

if (apiKeys.length === 0) {
  console.error('❌ Error: No Gemini API keys found in environment variables.');
  process.exit(1);
}

console.log(`🔑 Loaded ${apiKeys.length} Gemini API keys for round-robin rotation.`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FILE_NAME = 'Companies_Act_2013_Bare_Act.pdf';
const FILE_PATH = path.resolve(process.cwd(), 'src/services/rag-core/knowledge-base', FILE_NAME);

async function processPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new pdf.PDFParse({ data: dataBuffer });
  await parser.load();
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

let keyPointer = 0;
const exhaustedKeys = new Set<number>();

function getNextAIClient(): { client: GoogleGenAI; index: number } {
  let attempts = 0;
  // Skip any keys that have been flagged as exhausted/quota limit hit
  while (exhaustedKeys.has(keyPointer) && attempts < apiKeys.length) {
    keyPointer = (keyPointer + 1) % apiKeys.length;
    attempts++;
  }

  // Fallback if all keys are marked as exhausted, reset to allow retries
  if (exhaustedKeys.size === apiKeys.length) {
    console.warn('⚠️ All keys marked exhausted. Resetting key exhaustion list...');
    exhaustedKeys.clear();
  }

  const key = apiKeys[keyPointer];
  const activeIndex = keyPointer;
  keyPointer = (keyPointer + 1) % apiKeys.length;
  return { client: new GoogleGenAI({ apiKey: key }), index: activeIndex };
}

async function getEmbedding(text: string, activeIndex: number, client: GoogleGenAI): Promise<number[]> {
  const response = await client.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });
  return response.embeddings?.[0]?.values || [];
}

async function getEmbeddingWithRetry(text: string, retries = 5, delay = 2000): Promise<number[]> {
  const { client, index } = getNextAIClient();
  try {
    return await getEmbedding(text, index, client);
  } catch (err: any) {
    const errMsg = err.message || '';
    if (retries > 0 && (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit'))) {
      console.warn(`⚠️ Key index ${index} hit quota limits. Flagging as exhausted and rotating key...`);
      exhaustedKeys.add(index);
      // Immediately retry with the next available key without delaying heavily
      return getEmbeddingWithRetry(text, retries - 1, 500);
    }
    throw err;
  }
}

async function main() {
  console.log('🚀 Starting Companies Act, 2013 Bare Act Ingestion Audit & Rebuild...');
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Error: Bare Act PDF not found at ${FILE_PATH}`);
    process.exit(1);
  }

  console.log('📂 Processing PDF...');
  const rawText = await processPdf(FILE_PATH);
  console.log(`✨ Extracted text: ${rawText.length} characters.`);

  console.log('✂️ Performing legal hierarchy chunking...');
  
  // Boundary-aware section matching regex
  const splitRegex = new RegExp('(?=\\b(?:\\d+\\[)?\\s*\\d+[A-Z]*\\.\\s+[A-Z][A-Za-z\\s,;()\'.]{3,80}\\u2014)');
  const matchRegex = new RegExp('^(?:\\d+\\[)?\\s*(\\d+[A-Z]*)\\.\\s+([A-Za-z\\s,;()\'.]+)\\u2014');

  const sections = rawText.split(splitRegex);
  const parsedChunks: Array<{
    content: string;
    chapter: string;
    sectionNumber: string;
    sectionTitle: string;
  }> = [];

  let currentChapter = 'CHAPTER I: PRELIMINARY';

  for (let i = 0; i < sections.length; i++) {
    const trimmedSec = sections[i].trim();
    if (!trimmedSec) continue;

    const match = trimmedSec.match(matchRegex);
    const chapterToUse = currentChapter;

    // Check for chapter headings in this block to update currentChapter for the NEXT block
    const chapterMatches = [...trimmedSec.matchAll(/CHAPTER\s+([IVXLCDM]+)\s*\n*([A-Z\s,;()-]{3,100})/gi)];
    if (chapterMatches.length > 0) {
      const lastMatch = chapterMatches[chapterMatches.length - 1];
      const chapNum = lastMatch[1].trim();
      const chapTitle = lastMatch[2].trim().replace(/\s+/g, ' ');
      if (!chapTitle.includes('SECTIONS') && chapTitle.length > 3) {
        currentChapter = `CHAPTER ${chapNum}: ${chapTitle}`;
      }
    }

    if (match) {
      const sectionNum = match[1].trim();
      const sectionTitle = match[2].trim();

      if (sectionNum === '2') {
        // Section 2 contains definitions. Split into individual sub-clause definitions.
        const definitions = trimmedSec.split(/(?=\n\s*\(\d+\)\s+["“”][A-Za-z\s]+["“”]\s+means)/i);
        
        for (const defText of definitions) {
          const trimmedDef = defText.trim();
          if (!trimmedDef) continue;
          
          const defHeaderMatch = trimmedDef.match(/^\((\d+)\)\s+["“”]([A-Za-z\s]+)["“”]/i);
          let defNum = '2';
          let defTitle = sectionTitle;
          if (defHeaderMatch) {
            defNum = `2(${defHeaderMatch[1]})`;
            defTitle = `${defHeaderMatch[2]}`;
          }
          
          parsedChunks.push({
            content: `${chapterToUse}\n\nSection ${defNum}: ${defTitle}\n\n${trimmedDef}`,
            chapter: chapterToUse,
            sectionNumber: defNum,
            sectionTitle: defTitle
          });
        }
      } else {
        // Standard Section
        if (trimmedSec.length > 3000) {
          // Chunk larger sections by sub-clauses to maintain readability
          const subsections = trimmedSec.split(/(?=\n\s*\(\d+\)\s+[A-Z])/);
          let currentContent = `${chapterToUse}\n\nSection ${sectionNum}: ${sectionTitle}\n\n`;
          let subIdx = 0;
          for (const sub of subsections) {
            const trimmedSub = sub.trim();
            if (!trimmedSub) continue;
            
            if (currentContent.length + trimmedSub.length > 2500) {
              parsedChunks.push({
                content: currentContent.trim(),
                chapter: chapterToUse,
                sectionNumber: sectionNum,
                sectionTitle: sectionTitle
              });
              currentContent = `${chapterToUse}\n\nSection ${sectionNum}: ${sectionTitle} (Part ${++subIdx})\n\n${trimmedSub}`;
            } else {
              currentContent += `\n\n${trimmedSub}`;
            }
          }
          if (currentContent.trim()) {
            parsedChunks.push({
              content: currentContent.trim(),
              chapter: chapterToUse,
              sectionNumber: sectionNum,
              sectionTitle: sectionTitle
            });
          }
        } else {
          parsedChunks.push({
            content: `${chapterToUse}\n\nSection ${sectionNum}: ${sectionTitle}\n\n${trimmedSec}`,
            chapter: chapterToUse,
            sectionNumber: sectionNum,
            sectionTitle: sectionTitle
          });
        }
      }
    }
  }

  console.log(`✂️ Generated ${parsedChunks.length} logical chunks.`);

  if (parsedChunks.length < 50) {
    console.error('❌ Error: Chunk count too low. Check the legal parsing logic.');
    process.exit(1);
  }

  // Step 5: Database clean up
  console.log('🧹 Clearing old Companies Act chunks from Supabase...');
  const { error: deleteError } = await supabase
    .from('icsi_knowledge_embeddings')
    .delete()
    .eq('metadata->>source_file', FILE_NAME);

  if (deleteError) {
    console.error('❌ Database cleanup failed:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ Database cleared of old bare act chunks.');

  let successCount = 0;

  for (let i = 0; i < parsedChunks.length; i++) {
    const chunk = parsedChunks[i];
    const progress = `[${i + 1}/${parsedChunks.length}]`;

    try {
      // Stable sequential delay under multi-key rotation
      await new Promise(resolve => setTimeout(resolve, 350));

      const embedding = await getEmbeddingWithRetry(chunk.content);

      const { error: insertError } = await supabase
        .from('icsi_knowledge_embeddings')
        .insert({
          chunk_content: chunk.content,
          metadata: {
            source_file: FILE_NAME,
            document_name: FILE_NAME,
            document_type: 'Bare Act',
            source: 'Ministry of Corporate Affairs',
            act_name: 'Companies Act, 2013',
            chapter: chunk.chapter,
            section_number: chunk.sectionNumber,
            section_title: chunk.sectionTitle,
            subject: 'Company Law',
            exam: 'CS Executive',
            priority: 10,
            embedding_model: 'gemini-embedding-2',
            chunk_index: i,
            total_chunks: parsedChunks.length,
            ingested_at: new Date().toISOString()
          },
          embedding: embedding
        });

      if (insertError) {
        console.error(`❌ ${progress} Database insert failed:`, insertError.message);
      } else {
        successCount++;
        if (successCount % 10 === 0 || successCount === parsedChunks.length) {
          console.log(`✅ ${progress} Embedded and stored ${successCount} chunks successfully.`);
        }
      }
    } catch (err: any) {
      console.error(`❌ ${progress} Embedding failed for chunk ${i}:`, err.message || err);
    }
  }

  console.log(`🎉 Ingestion completed. Successfully stored ${successCount}/${parsedChunks.length} chunks.`);
}

main().catch(err => {
  console.error('💥 Fatal ingestion error:', err);
});

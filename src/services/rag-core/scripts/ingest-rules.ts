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

const RULES_ROOT_DIR = path.resolve(process.cwd(), 'src/services/rag-core/knowledge-base/Rules');

const KEYWORD_DICTIONARY = [
  'share capital', 'rights issue', 'bonus issue', 'preferential allotment', 'private placement',
  'deposit', 'prospectus', 'incorporation', 'director', 'board meeting', 'related party transaction',
  'charge', 'csr', 'corporate social responsibility', 'audit', 'dividend', 'nidhi', 'debenture',
  'annual return', 'general meeting', 'resolution', 'accounts', 'managerial personnel', 'foreign company',
  'removal of name', 'compromise', 'arrangement', 'amalgamation'
];

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

async function getEmbeddingWithRetry(text: string, retries = 10, delay = 65000): Promise<number[]> {
  const { client, index } = getNextAIClient();
  try {
    return await getEmbedding(text, client);
  } catch (err: any) {
    const errMsg = err.message || '';
    if (retries > 0 && (
      errMsg.includes('429') || 
      errMsg.includes('503') || 
      errMsg.toLowerCase().includes('quota') || 
      errMsg.toLowerCase().includes('limit') || 
      errMsg.toLowerCase().includes('unavailable') ||
      errMsg.toLowerCase().includes('demand')
    )) {
      console.warn(`⚠️ Rate limit or 503 hit. Sleeping for ${delay/1000}s to reset window (${retries} retries left)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getEmbeddingWithRetry(text, retries - 1, delay);
    }
    throw err;
  }
}

async function transcribeScannedPdfFileApi(filePath: string, client: GoogleGenAI): Promise<string> {
  // Upload via File API to support large files without payload limit errors
  const file = await client.files.upload({
    file: filePath,
    mimeType: 'application/pdf',
  });

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: file.uri,
                mimeType: file.mimeType
              }
            },
            {
              text: 'You are a legal transcription assistant. Transcribe the attached scanned PDF document completely. Maintain the formatting, sections, sub-rules, and terms. Return ONLY the transcribed text, with no extra conversational remarks.'
            }
          ]
        }
      ]
    });
    return response.text || '';
  } finally {
    // Ensure the file is deleted from Google Cloud storage after transcription
    try {
      await client.files.delete({ name: file.name });
    } catch (delErr: any) {
      console.warn(`⚠️ Failed to clean up file ${file.name}:`, delErr.message);
    }
  }
}

async function transcribeScannedPdfWithRetry(filePath: string, retries = 10, delay = 65000): Promise<string> {
  const { client, index } = getNextAIClient();
  try {
    return await transcribeScannedPdfFileApi(filePath, client);
  } catch (err: any) {
    const errMsg = err.message || '';
    if (retries > 0 && (
      errMsg.includes('429') || 
      errMsg.includes('503') || 
      errMsg.toLowerCase().includes('quota') || 
      errMsg.toLowerCase().includes('limit') || 
      errMsg.toLowerCase().includes('unavailable') ||
      errMsg.toLowerCase().includes('demand')
    )) {
      console.warn(`⚠️ Rate limit or 503 hit during transcription. Error: ${errMsg}. Sleeping for ${delay/1000}s to reset window (${retries} retries left)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return transcribeScannedPdfWithRetry(filePath, retries - 1, delay);
    }
    throw err;
  }
}

function findPdfsRecursive(dir: string, filesList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return filesList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findPdfsRecursive(fullPath, filesList);
    } else if (item.toLowerCase().endsWith('.pdf')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

async function tryExtractSelectableText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new pdf.PDFParse({ data: dataBuffer });
    await parser.load();
    const result = await parser.getText();
    await parser.destroy();
    return (result.text || '').trim();
  } catch {
    return '';
  }
}

async function main() {
  console.log('🚀 Starting recursive scanning of MCA Companies Rules PDFs...');
  
  const pdfPaths = findPdfsRecursive(RULES_ROOT_DIR);
  console.log(`📂 Discovered ${pdfPaths.length} PDFs inside the Rules folder.`);

  // Retrieve already indexed document names to prevent duplicate ingestion
  const { data: indexedRows, error: indexedFetchError } = await supabase
    .from('icsi_knowledge_embeddings')
    .select('metadata->>source_file')
    .eq('metadata->>document_type', 'Companies Rules');

  if (indexedFetchError) {
    console.error('❌ Failed to fetch already indexed document names:', indexedFetchError.message);
    process.exit(1);
  }

  const indexedDocs = new Set((indexedRows || []).map((row: any) => row.source_file));
  console.log(`📊 DB already contains ${indexedDocs.size} indexed Rules files.`);

  // Filter out already indexed files, giant non-substantive annexures, and irrelevant Accounting Standards folders
  const filesToIngest = pdfPaths.filter(filePath => {
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('annexure')) {
      console.log(`⏭️ Skipping giant non-substantive annexure: ${path.basename(filePath)}`);
      return false;
    }
    if (filePath.includes('Accounting Standards')) {
      console.log(`⏭️ Skipping non-syllabus Accounting Standards folder: ${path.basename(filePath)}`);
      return false;
    }
    return !indexedDocs.has(path.basename(filePath));
  });
  console.log(`📦 Files remaining to ingest: ${filesToIngest.length}`);

  if (filesToIngest.length === 0) {
    console.log('🎉 All core Rules files are already indexed. Exiting.');
    process.exit(0);
  }

  for (let fileIndex = 0; fileIndex < filesToIngest.length; fileIndex++) {
    const filePath = filesToIngest[fileIndex];
    const fileName = path.basename(filePath);
    console.log(`\n📄 [${fileIndex + 1}/${filesToIngest.length}] Processing: ${fileName}...`);

    let rawText = await tryExtractSelectableText(filePath);
    
    if (rawText.length < 150) {
      console.log(`⚙️ ${fileName} has no selectable text. Transcribing via Gemini File API OCR...`);
      rawText = await transcribeScannedPdfWithRetry(filePath);
    }

    if (rawText.length < 100) {
      console.warn(`⚠️ Warning: Skip empty or failed PDF: ${fileName}`);
      continue;
    }

    // Determine Chapter/Subfolder name
    const relativeParts = path.relative(RULES_ROOT_DIR, filePath).split(path.sep);
    const folderChapter = relativeParts.length > 1 ? relativeParts[0] : 'General';
    const cleanFolderName = folderChapter.replace(/^Chapter\s+[IVXLCDM]+\s*Part\s*[IVXLCDM]*\s*/i, '').trim();

    // Rule splitting
    const splitRegex = new RegExp('(?=\\b(?:Rule\\s+)?\\d+[A-Z]*\\.\\s+[A-Z][A-Za-z\\s,;()\'.]{2,100}(?:\\u2014|\\.|\\n))');
    const matchRegex = new RegExp('^(?:Rule\\s+)?(\\d+[A-Z]*)\\.\\s+([A-Za-z\\s,;()\'.]+)(?:\\u2014|\\.|\\n)', 'i');

    const sections = rawText.split(splitRegex);
    const parsedChunks: Array<{
      content: string;
      ruleNumber: string;
      ruleTitle: string;
      relatedSections: string[];
      keywords: string[];
    }> = [];

    for (let i = 0; i < sections.length; i++) {
      const trimmedSec = sections[i].trim();
      if (!trimmedSec) continue;

      const match = trimmedSec.match(matchRegex);
      
      let ruleNum = 'General';
      let ruleTitle = 'General Provisions';
      if (match) {
        ruleNum = match[1].trim();
        ruleTitle = match[2].trim().replace(/\s+/g, ' ');
      } else {
        // If no heading match, try parsing the file name rule number
        const nameMatch = fileName.match(/^(\d+[A-Z]*)\.\s+(.+)\.pdf$/i);
        if (nameMatch) {
          ruleNum = nameMatch[1].trim();
          ruleTitle = nameMatch[2].replace(/\.pdf$/i, '').trim();
        }
      }

      // Extract cross-referenced Sections from Act
      const relatedSectionsSet = new Set<string>();
      const sectionMatches = [...trimmedSec.matchAll(/(?:section|sections)\s+(\d+(?:\(\d+\))?[A-Za-z]*)/gi)];
      for (const sm of sectionMatches) {
        relatedSectionsSet.add(`Section ${sm[1]}`);
      }

      // Explicit rules to act linking
      if (cleanFolderName.includes('Share Capital')) {
        relatedSectionsSet.add('Section 62');
      } else if (cleanFolderName.includes('Prospectus')) {
        relatedSectionsSet.add('Section 42');
      } else if (cleanFolderName.includes('Deposits')) {
        relatedSectionsSet.add('Section 73');
      } else if (cleanFolderName.includes('Directors')) {
        relatedSectionsSet.add('Section 149');
      } else if (cleanFolderName.includes('Meetings of Board')) {
        relatedSectionsSet.add('Section 173');
        relatedSectionsSet.add('Section 188');
      }

      const relatedSections = Array.from(relatedSectionsSet);

      // Extract keywords
      const keywordsSet = new Set<string>();
      for (const kw of KEYWORD_DICTIONARY) {
        if (trimmedSec.toLowerCase().includes(kw)) {
          keywordsSet.add(kw);
        }
      }
      const keywords = Array.from(keywordsSet);

      const headerText = `${cleanFolderName} - ${folderChapter}\nRule ${ruleNum}: ${ruleTitle}\n\n`;

      if (trimmedSec.length > 2500) {
        const subrules = trimmedSec.split(/(?=\n\s*\(\d+\)\s+[A-Z])/);
        let currentContent = headerText;
        let subIdx = 0;
        for (const sub of subrules) {
          const trimmedSub = sub.trim();
          if (!trimmedSub) continue;
          
          if (currentContent.length + trimmedSub.length > 2500) {
            parsedChunks.push({
              content: currentContent.trim(),
              ruleNumber: ruleNum,
              ruleTitle: ruleTitle,
              relatedSections,
              keywords
            });
            currentContent = `${headerText}(Part ${++subIdx})\n\n${trimmedSub}`;
          } else {
            currentContent += `\n\n${trimmedSub}`;
          }
        }
        if (currentContent.trim()) {
          parsedChunks.push({
            content: currentContent.trim(),
            ruleNumber: ruleNum,
            ruleTitle: ruleTitle,
            relatedSections,
            keywords
          });
        }
      } else {
        parsedChunks.push({
          content: `${headerText}${trimmedSec}`,
          ruleNumber: ruleNum,
          ruleTitle: ruleTitle,
          relatedSections,
          keywords
        });
      }
    }

    console.log(`✂️ Generated ${parsedChunks.length} chunks for ${fileName}`);
    let successCount = 0;

    for (let i = 0; i < parsedChunks.length; i++) {
      const chunk = parsedChunks[i];
      try {
        // Wait 3 seconds between chunks to stay strictly below rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
        const embedding = await getEmbeddingWithRetry(chunk.content);

        const { error: insertError } = await supabase
          .from('icsi_knowledge_embeddings')
          .insert({
            chunk_content: chunk.content,
            metadata: {
              source_file: fileName,
              document_name: fileName,
              document_type: 'Companies Rules',
              source_category: 'companies_rules',
              source: 'Ministry of Corporate Affairs',
              rules_name: cleanFolderName,
              rule_number: chunk.ruleNumber,
              rule_title: chunk.ruleTitle,
              chapter: folderChapter,
              subject: 'Company Law',
              exam: 'CS Executive',
              priority: 9,
              embedding_model: 'gemini-embedding-2',
              chunk_index: i,
              total_chunks: parsedChunks.length,
              related_sections: chunk.relatedSections,
              keywords: chunk.keywords,
              ingested_at: new Date().toISOString()
            },
            embedding: embedding
          });

        if (insertError) {
          console.error(`❌ [${fileName}] Chunk ${i} DB insert failed:`, insertError.message);
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ [${fileName}] Chunk ${i} embedding failed:`, err.message || err);
      }
    }

    console.log(`✅ Completed ${fileName}: Ingested ${successCount}/${parsedChunks.length} chunks.`);

    // Delay 6 seconds between files to stay safely under 20 RPM
    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  console.log('\n🎉 All Companies Rules ingested successfully!');
}

main().catch(err => console.error(err));

# Xaminix Agentic RAG Core System

This directory houses the isolated Agentic RAG core architecture designed for CS Executive Company Law & Practice evaluations.

## Folder Structure

- **`database/migrations/`**: Contains the SQL migration scripts (`01_enable_vector_and_tables.sql`) to enable pgvector on Supabase and build the required schemas.
- **`knowledge-base/`**: Directory where you place dense legal PDFs (ICSI Study Modules, Guideline Answers, Supplements).
- **`scripts/ingest.ts`**: CLI script to extract text, semantically chunk, embed, and store knowledge into Supabase.
- **`services/rag-service.ts`**: Implements the Corrective RAG (CRAG) autonomous loop, searching Supabase pgvector and self-correcting queries up to 3 times if context relevance is low.
- **`utils/chunker.ts`**: Semantic paragraph-based chunker (~600 tokens target with overlap).

---

## Getting Started

### 1. Database Setup (Supabase)
Go to your **Supabase dashboard -> SQL Editor** and run the contents of the migration file:
[01_enable_vector_and_tables.sql](file:///d:/AI%20Answer%20Checker/src/services/rag-core/database/migrations/01_enable_vector_and_tables.sql)

This will:
- Enable the `vector` extension.
- Create the `icsi_knowledge_embeddings` table.
- Create an HNSW index on the vector embedding for fast matching.
- Create a `match_icsi_knowledge` stored function for vector search RPCs.

### 2. Environment Configurations
Make sure your `.env.local` file contains your Google Gemini key, Supabase keys, and the private service role key:
```env
GEMINI_API_KEY="your-gemini-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 3. Ingestion Pipeline
1. Place your ICSI syllabus study PDFs (e.g. `Company_Law_Module.pdf`) into the [knowledge-base](file:///d:/AI%20Answer%20Checker/src/services/rag-core/knowledge-base) directory.
2. In your terminal, run the ingestion script using `npx tsx`:
   ```bash
   npx tsx src/services/rag-core/scripts/ingest.ts
   ```
This script will parse the PDFs, split them into semantic paragraph chunks, request vectors using Gemini's `text-embedding-004`, and store them in Supabase.

### 4. Grading API Route
The system hosts a Next.js/Node API route located at `/api/evaluate-icsi-law`.
When a student uploads an answer, send a `POST` request with:
```json
{
  "questionText": "The student question text...",
  "answerText": "The student answer content...",
  "userId": "optional-user-id"
}
```
The API route:
1. Formulates search queries.
2. Executes the **Corrective RAG Loop** to look up relevant context.
3. Automatically rewrites and retries searches up to 3 times if relevance is poor.
4. Feeds retrieved context into the ICSI Grading Prompts.
5. Streams the evaluation Markdown back to the user in real-time.
6. Asynchronously stores results to the `evaluations` table and updates user analytics.

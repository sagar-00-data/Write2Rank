-- Migration: Enable vector extension and setup ICSI Knowledge Embeddings table with Gemini-2 Embedding support

-- 1. Enable the pgvector extension if it isn't already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Cleanup existing 768-dimension objects if they exist
DROP FUNCTION IF EXISTS match_icsi_knowledge;
DROP TABLE IF EXISTS icsi_knowledge_embeddings;

-- 2. Create the knowledge embeddings table with 384 dimensions
CREATE TABLE IF NOT EXISTS icsi_knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(384), -- Match free sentence-transformers all-MiniLM-L6-v2 embedding model dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Explicitly disable Row-Level Security (RLS) to allow the ingestion script to write data
ALTER TABLE icsi_knowledge_embeddings DISABLE ROW LEVEL SECURITY;

-- 3. Create an HNSW index on the vector column
CREATE INDEX IF NOT EXISTS icsi_knowledge_embeddings_hnsw_idx 
ON icsi_knowledge_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 4. Create a database function to query similarity matches
CREATE OR REPLACE FUNCTION match_icsi_knowledge (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  chunk_content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    icsi_knowledge_embeddings.id,
    icsi_knowledge_embeddings.chunk_content,
    icsi_knowledge_embeddings.metadata,
    1 - (icsi_knowledge_embeddings.embedding <=> query_embedding) AS similarity
  FROM icsi_knowledge_embeddings
  WHERE 1 - (icsi_knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY icsi_knowledge_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

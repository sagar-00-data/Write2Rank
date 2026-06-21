-- SQL Schema for Write2Rank Supabase Integration (Phase 1 MVP)

-- 1. Create USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create EVALUATIONS table
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY, -- Custom ID generated on Next.js server (e.g., 'eval_1746534567890_abc123')
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable to allow guest usage
    question_text TEXT,
    answer_text TEXT NOT NULL,
    ocr_extracted_text TEXT,
    ai_feedback JSONB NOT NULL, -- JSON storing overall, strengths, weaknesses, and question-wise breakdown
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    confidence INTEGER NOT NULL,
    exam_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create ANALYTICS table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    average_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    weak_topics JSONB DEFAULT '[]'::jsonb,
    strong_topics JSONB DEFAULT '[]'::jsonb,
    evaluation_count INTEGER NOT NULL DEFAULT 0,
    improvement_trends JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Insert default Guest User for Phase 1 MVP
-- This allows guest evaluations to be stored in the database without forcing login/signup yet
INSERT INTO users (id, name, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'Guest User', 'guest@write2rank.com')
ON CONFLICT (email) DO NOTHING;

-- 5. Insert default Analytics row for Guest User
INSERT INTO analytics (user_id, average_score, weak_topics, strong_topics, evaluation_count, improvement_trends)
VALUES ('00000000-0000-0000-0000-000000000000', 0.00, '[]'::jsonb, '[]'::jsonb, 0, '[]'::jsonb)
ON CONFLICT (user_id) DO NOTHING;

-- 6. Create USER_USAGE_LOGS table for closed Beta
CREATE TABLE IF NOT EXISTS user_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    subject TEXT,
    question_length INTEGER,
    answer_length INTEGER,
    ocr_provider TEXT,
    gemini_model TEXT,
    ocr_time_ms INTEGER,
    evaluation_time_ms INTEGER,
    total_time_ms INTEGER,
    status TEXT NOT NULL
);

-- 7. Create GEMINI_USAGE_LOGS table for cost monitoring
CREATE TABLE IF NOT EXISTS gemini_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost NUMERIC(10, 6),
    api_key_used TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

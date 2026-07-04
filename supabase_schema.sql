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
VALUES ('00000000-0000-0000-0000-000000000000', 'Guest User', 'guest@xaminix.com')
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

-- 8. Update USERS table for Authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 9. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own evaluations" ON evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evaluations" ON evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE user_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage logs" ON user_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage logs" ON user_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Auto Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, profile_photo)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.analytics (user_id, average_score, weak_topics, strong_topics, evaluation_count, improvement_trends)
  VALUES (new.id, 0.00, '[]'::jsonb, '[]'::jsonb, 0, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Clerk Authentication Schema Support
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Beta Tester';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_eval_limit INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_ocr_limit INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS evals_used_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ocr_used_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_eval_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ocr_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

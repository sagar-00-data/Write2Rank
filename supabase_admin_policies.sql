-- ============================================================
-- Write2Rank: Admin Telemetry RLS Fix
-- Run this in your Supabase SQL Editor to allow the
-- admin stats API to read all telemetry data.
-- ============================================================

-- Option A (RECOMMENDED): Add service-role bypass policies
-- These only apply when using the Service Role key (server-side)

-- Allow service role to read all usage logs (for the Founder Dashboard)
CREATE POLICY IF NOT EXISTS "Service role can read all usage logs"
  ON user_usage_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can insert all usage logs"
  ON user_usage_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role to read all Gemini logs
CREATE POLICY IF NOT EXISTS "Service role can read all gemini logs"
  ON gemini_usage_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can insert all gemini logs"
  ON gemini_usage_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow service role to read all users
CREATE POLICY IF NOT EXISTS "Service role can read all users"
  ON users FOR SELECT
  USING (auth.role() = 'service_role');

-- Option B (SIMPLER - if you trust your backend):
-- Temporarily disable RLS on telemetry tables
-- (Less secure but works immediately without service role key)
-- ALTER TABLE user_usage_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE gemini_usage_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Add missing columns to user_usage_logs (if not already added)
-- ============================================================
ALTER TABLE user_usage_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add missing columns to gemini_usage_logs
ALTER TABLE gemini_usage_logs ADD COLUMN IF NOT EXISTS is_429 BOOLEAN DEFAULT FALSE;
ALTER TABLE gemini_usage_logs ADD COLUMN IF NOT EXISTS rotation_count INTEGER DEFAULT 0;

-- ============================================================
-- NEXT STEP: Add SUPABASE_SERVICE_ROLE_KEY to .env.local
-- Get this from: Supabase Dashboard > Project Settings > API
-- Key name: "service_role" (secret key, never expose client-side)
-- ============================================================
-- SUPABASE_SERVICE_ROLE_KEY="eyJ..."

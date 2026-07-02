-- Migration: User Management & Extensible Limits Architecture
-- Location: d:\AI Answer Checker\supabase_user_management.sql

-- 1. Extend the users table with billing, overrides, status, and telemetry columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Beta Tester' CHECK (plan IN ('Founder', 'Beta Tester', 'Free', 'Premium'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_eval_limit INTEGER DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_ocr_limit INTEGER DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS evals_used_today INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ocr_used_today INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_eval_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_ocr_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

-- Stripe & Future subscription scaling support
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lifetime_plan BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT NULL;

-- Create index on search and filter parameters for optimal lookup speeds
CREATE INDEX IF NOT EXISTS idx_users_plan_status ON public.users (plan, status);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users (clerk_id);

-- Optional: Create default system configuration values for plans
CREATE TABLE IF NOT EXISTS public.plan_configurations (
    plan TEXT PRIMARY KEY,
    default_daily_evals INTEGER NOT NULL,
    default_daily_ocr_pages INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default base values for plans
INSERT INTO public.plan_configurations (plan, default_daily_evals, default_daily_ocr_pages)
VALUES 
    ('Founder', -1, -1),      -- -1 represents Unlimited
    ('Beta Tester', 7, 14),
    ('Free', 0, 0),
    ('Premium', -1, -1)
ON CONFLICT (plan) DO UPDATE 
SET default_daily_evals = EXCLUDED.default_daily_evals,
    default_daily_ocr_pages = EXCLUDED.default_daily_ocr_pages;

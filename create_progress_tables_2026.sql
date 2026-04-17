
-- ── student_progress ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  course_id       uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  course_slug     text,
  completed_units int  DEFAULT 0,
  total_units     int  DEFAULT 0,
  streak_days     int  DEFAULT 0,
  total_points    int  DEFAULT 0,
  last_activity_at timestamptz,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progress_own"   ON public.student_progress;
DROP POLICY IF EXISTS "progress_auth"  ON public.student_progress;
CREATE POLICY "progress_auth" ON public.student_progress
  FOR ALL USING (auth.role() = 'authenticated');

-- ── unit_completions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unit_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.units(id) ON DELETE CASCADE,
  course_id   uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  points_earned int DEFAULT 10,
  UNIQUE(student_id, unit_id)
);

ALTER TABLE public.unit_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "completions_auth" ON public.unit_completions;
CREATE POLICY "completions_auth" ON public.unit_completions
  FOR ALL USING (auth.role() = 'authenticated');

-- ── daily_activity ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  activity_date date DEFAULT current_date,
  units_done  int DEFAULT 0,
  UNIQUE(student_id, activity_date)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_auth" ON public.daily_activity;
CREATE POLICY "activity_auth" ON public.daily_activity
  FOR ALL USING (auth.role() = 'authenticated');

-- ── subscriptions: ensure approved_by_admin column exists ─────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS approved_by_admin boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_enabled   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method    text,
  ADD COLUMN IF NOT EXISTS renewal_due_at    timestamptz;

-- Auto-approve card payments (they don't need manual approval)
UPDATE public.subscriptions
SET approved_by_admin = true, account_enabled = true
WHERE payment_method = 'card' AND approved_by_admin IS NULL;

-- Mark PSE/PayPal as pending if not yet approved
UPDATE public.subscriptions
SET approved_by_admin = false, account_enabled = false
WHERE payment_method IN ('pse','paypal') AND approved_by_admin IS NULL;

-- ── student_profiles: ensure account_enabled column ──────────────────────
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS account_enabled boolean DEFAULT true;

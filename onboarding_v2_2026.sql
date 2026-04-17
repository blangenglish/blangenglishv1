
-- ─────────────────────────────────────────────
-- 1. Fix admin_users – only has id, email, created_at
--    Ensure admin email is in admin_users
-- ─────────────────────────────────────────────
DO $$
DECLARE
  admin_email TEXT := 'blangenglishlearning@blangenglish.com';
  admin_uid   UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.admin_users (id, email)
    VALUES (admin_uid, admin_email)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Add onboarding columns to student_profiles
-- ─────────────────────────────────────────────
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'pending_plan',
  ADD COLUMN IF NOT EXISTS english_level TEXT,
  ADD COLUMN IF NOT EXISTS level_source TEXT,
  ADD COLUMN IF NOT EXISTS level_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_admin_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Mark admin as admin-only so they don't see student onboarding
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'blangenglishlearning@blangenglish.com' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    UPDATE public.student_profiles
    SET is_admin_only = true, onboarding_step = 'complete', notes = 'ADMIN_ONLY'
    WHERE id = admin_uid;
    -- Remove any subscriptions
    DELETE FROM public.subscriptions WHERE student_id = admin_uid;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Add payment method columns to subscriptions
-- ─────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- ─────────────────────────────────────────────
-- 4. Table: level_exam_questions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.level_exam_questions (
  id          SERIAL PRIMARY KEY,
  level       TEXT NOT NULL,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  correct_idx INT NOT NULL,
  sort_order  INT DEFAULT 0
);

ALTER TABLE public.level_exam_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_questions" ON public.level_exam_questions;
CREATE POLICY "public_read_questions" ON public.level_exam_questions FOR SELECT USING (true);

-- Insert questions (3 per level for fast exam)
INSERT INTO public.level_exam_questions (level, question, options, correct_idx, sort_order) VALUES
('A1','What is your name?','["My name is Ana","I am 25","I live here","I like music"]',0,1),
('A1','She ___ a teacher.','["am","is","are","be"]',1,2),
('A1','How ___ apples?','["much","many","any","some"]',1,3),
('A2','She ___ to school every day.','["go","goes","going","gone"]',1,4),
('A2','We ___ TV last night.','["watch","watched","watches","watching"]',1,5),
('A2','He is ___ than his brother.','["tall","taller","tallest","more tall"]',1,6),
('B1','If it rains, we ___ stay inside.','["will","would","can","shall"]',0,7),
('B1','The report ___ by the manager tomorrow.','["will write","will be written","is written","writes"]',1,8),
('B1','I need to ___ a decision.','["do","make","have","take"]',1,9),
('B2','___ you have told me earlier, I would have helped.','["Had","If","When","Unless"]',0,10),
('B2','She ___ be at home; the lights are on.','["must","should","might","could"]',0,11),
('B2','She ___ the job offer after consideration.','["turned down","turned up","turned in","turned on"]',0,12),
('C1','___ his vast experience, he could not solve it.','["Despite","Although","Even","However"]',0,13),
('C1','She spoke with such ___ that everyone was moved.','["eloquence","eloquent","eloquently","eloquences"]',0,14),
('C1','Had the team ___ harder, they might have won.','["worked","work","working","works"]',0,15)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. Table: level_exam_attempts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.level_exam_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers      JSONB NOT NULL DEFAULT '{}',
  score        INT,
  result_level TEXT,
  completed    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.level_exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_own_attempts" ON public.level_exam_attempts;
CREATE POLICY "students_own_attempts" ON public.level_exam_attempts
  FOR ALL USING (auth.uid() = student_id);

-- ─────────────────────────────────────────────
-- 6. Fix subscriptions RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_own_subscription" ON public.subscriptions;
CREATE POLICY "students_own_subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = student_id);

-- ─────────────────────────────────────────────
-- 7. Fix student_profiles RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_own_profile" ON public.student_profiles;
CREATE POLICY "students_own_profile" ON public.student_profiles
  FOR ALL USING (auth.uid() = id);

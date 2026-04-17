
-- ─────────────────────────────────────────────
-- 1. Ensure admin email is ONLY in admin_users
--    and NOT in student_profiles as active student
-- ─────────────────────────────────────────────
DO $$
DECLARE
  admin_email TEXT := 'blangenglishlearning@blangenglish.com';
  admin_uid   UUID;
BEGIN
  -- Get UID from auth if exists
  SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email LIMIT 1;

  IF admin_uid IS NOT NULL THEN
    -- Ensure in admin_users
    INSERT INTO public.admin_users (id, email, role, is_active)
    VALUES (admin_uid, admin_email, 'super_admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;

    -- Mark student profile as admin_only (not a paying student)
    UPDATE public.student_profiles
    SET full_name = COALESCE(full_name, 'Admin'),
        notes = 'ADMIN_ONLY'
    WHERE id = admin_uid;

    -- Remove any active subscriptions for admin
    DELETE FROM public.subscriptions WHERE student_id = admin_uid;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Add onboarding columns to student_profiles
-- ─────────────────────────────────────────────
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'pending_plan',
  ADD COLUMN IF NOT EXISTS english_level TEXT,
  ADD COLUMN IF NOT EXISTS level_source TEXT, -- 'exam' | 'self_selected'
  ADD COLUMN IF NOT EXISTS level_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_admin_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Mark admin as admin_only
UPDATE public.student_profiles
SET is_admin_only = true
WHERE notes = 'ADMIN_ONLY';

-- ─────────────────────────────────────────────
-- 3. Add payment_method & manual approval cols to subscriptions
-- ─────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_due_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 4. Table: level_exam_questions (static bank)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.level_exam_questions_2026 (
  id          SERIAL PRIMARY KEY,
  level       TEXT NOT NULL, -- A1, A2, B1, B2, C1
  question    TEXT NOT NULL,
  options     JSONB NOT NULL, -- ["opt1","opt2","opt3","opt4"]
  correct_idx INT NOT NULL,   -- 0-3
  sort_order  INT DEFAULT 0
);

-- Insert sample questions (5 per level = 25 total)
INSERT INTO public.level_exam_questions_2026 (level, question, options, correct_idx, sort_order) VALUES
-- A1
('A1','What is your name?','["My name is Ana","I am 25 years old","I live in Bogotá","I like music"]',0,1),
('A1','She ___ a teacher.','["am","is","are","be"]',1,2),
('A1','How ___ apples are there?','["much","many","any","some"]',1,3),
('A1','Choose the correct greeting for the morning.','["Good night","Good afternoon","Good morning","Good evening"]',2,4),
('A1','I ___ from Colombia.','["is","are","am","be"]',2,5),
-- A2
('A2','She ___ to school every day.','["go","goes","going","gone"]',1,6),
('A2','We ___ TV last night.','["watch","watched","watches","watching"]',1,7),
('A2','There isn''t ___ milk left.','["some","any","a","the"]',1,8),
('A2','He is ___ than his brother.','["tall","taller","tallest","more tall"]',1,9),
('A2','I have lived here ___ five years.','["since","for","ago","during"]',1,10),
-- B1
('B1','If it rains, we ___ stay inside.','["will","would","can","shall"]',0,11),
('B1','She ___ English for 3 years when she moved abroad.','["has studied","had studied","was studying","studied"]',1,12),
('B1','The report ___ by the manager tomorrow.','["will write","will be written","is written","writes"]',1,13),
('B1','He asked me where I ___.','["live","lived","living","lives"]',1,14),
('B1','Choose the correct word: I need to ___ a decision.','["do","make","have","take"]',1,15),
-- B2
('B2','___ you have told me earlier, I would have helped.','["Had","If","When","Unless"]',0,16),
('B2','The project, ___ took months to complete, was a success.','["who","which","that","what"]',1,17),
('B2','She ___ be at home; the lights are on.','["must","should","might","could"]',0,18),
('B2','By next year, he ___ this company for a decade.','["will run","will have run","runs","has run"]',1,19),
('B2','Choose the correct phrasal verb: She ___ the job offer after careful consideration.','["turned down","turned up","turned in","turned on"]',0,20),
-- C1
('C1','The committee ___ to reach a consensus after lengthy deliberations.','["struggled","has struggled","had struggled","struggles"]',2,21),
('C1','___ his vast experience, he couldn''t solve the issue.','["Despite","Although","Even","However"]',0,22),
('C1','The legislation was passed, ___ protests from various groups.','["notwithstanding","despite of","in spite","although"]',0,23),
('C1','She spoke with such ___ that everyone was moved.','["eloquence","eloquent","eloquently","eloquence''s"]',0,24),
('C1','Had the team ___ harder, they might have won.','["worked","work","working","works"]',0,25)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. Table: level_exam_attempts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.level_exam_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL DEFAULT '{}',
  score       INT,
  result_level TEXT,
  completed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.level_exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_own_attempts" ON public.level_exam_attempts;
CREATE POLICY "students_own_attempts" ON public.level_exam_attempts
  FOR ALL USING (auth.uid() = student_id);

-- ─────────────────────────────────────────────
-- 6. RLS for level_exam_questions (public read)
-- ─────────────────────────────────────────────
ALTER TABLE public.level_exam_questions_2026 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_questions" ON public.level_exam_questions_2026;
CREATE POLICY "public_read_questions" ON public.level_exam_questions_2026
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────
-- 7. RLS updates for subscriptions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "students_own_subscription" ON public.subscriptions;
CREATE POLICY "students_own_subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = student_id);

-- ─────────────────────────────────────────────
-- 8. RLS for student_profiles
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "students_own_profile" ON public.student_profiles;
CREATE POLICY "students_own_profile" ON public.student_profiles
  FOR ALL USING (auth.uid() = id);

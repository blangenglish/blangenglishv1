
-- 1. Drop any conflicting policies on student_profiles
DROP POLICY IF EXISTS "Admin can do anything on student_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Service role bypass" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can read own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Admin update student profiles" ON public.student_profiles;

-- 2. Enable RLS if not already
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Students can read their own profile
CREATE POLICY "Students can read own profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. Students can update their own profile
CREATE POLICY "Students can update own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Students can insert their own profile
CREATE POLICY IF NOT EXISTS "Students can insert own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Service role can do everything (used by edge functions and admin)
CREATE POLICY "Service role full access on student_profiles"
  ON public.student_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. Same for subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Students can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Students can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access on subscriptions" ON public.subscriptions;

CREATE POLICY "Students can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Service role full access on subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. Ensure account_enabled column exists in student_profiles
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS account_enabled BOOLEAN DEFAULT true;

-- 9. Ensure english_level column exists
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS english_level TEXT;

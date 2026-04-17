
-- Disable email confirmation requirement so users can log in immediately after registration
-- This avoids the "email rate limit exceeded" error in Supabase free tier
UPDATE auth.config
SET confirm_email_change = false
WHERE TRUE;

-- Also update the mailer autoconfirm setting if it exists
-- This allows signups without email confirmation in the Auth settings
DO $$
BEGIN
  -- Try to update auth config to disable email confirmations
  -- In Supabase, this needs to be done via the dashboard (Auth > Settings > Enable email confirmations)
  -- but we can adjust RLS and policies to allow unconfirmed users
  RAISE NOTICE 'Email confirmation settings should be disabled in Supabase Dashboard: Auth > Providers > Email > Confirm email = OFF';
END $$;

-- Ensure student_profiles allows insert from any authenticated OR newly registered user
-- Drop and recreate clean policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'student_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_profiles', pol.policyname);
  END LOOP;
END $$;

-- Recreate clean policies for student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "sp_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "sp_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "sp_service_all" ON public.student_profiles
  FOR ALL USING (auth.role() = 'service_role');

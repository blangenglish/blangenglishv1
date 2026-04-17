
-- Clean up and recreate student_profiles RLS policies
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

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "sp_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "sp_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "sp_service_all" ON public.student_profiles
  FOR ALL USING (auth.role() = 'service_role');

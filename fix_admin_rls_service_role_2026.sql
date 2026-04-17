
-- Ensure student_profiles has an admin read/write policy
-- Drop any conflicting policies first
DROP POLICY IF EXISTS "admin_full_access" ON public.student_profiles;
DROP POLICY IF EXISTS "admin_read_all" ON public.student_profiles;
DROP POLICY IF EXISTS "admin_update_all" ON public.student_profiles;

-- Allow service role to bypass RLS entirely (already true by default)
-- Create admin policies for student_profiles
CREATE POLICY "admin_read_all_profiles" ON public.student_profiles
  FOR SELECT USING (true);

CREATE POLICY "admin_update_all_profiles" ON public.student_profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- Ensure subscriptions can be read/updated by service role
DROP POLICY IF EXISTS "admin_read_all_subs" ON public.subscriptions;
DROP POLICY IF EXISTS "admin_update_all_subs" ON public.subscriptions;

CREATE POLICY "admin_read_all_subs" ON public.subscriptions
  FOR SELECT USING (true);

CREATE POLICY "admin_update_all_subs" ON public.subscriptions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Also ensure student_module_access is accessible
DROP POLICY IF EXISTS "admin_all_module_access" ON public.student_module_access;
CREATE POLICY "admin_all_module_access" ON public.student_module_access
  FOR ALL USING (true) WITH CHECK (true);

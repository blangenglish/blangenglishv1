
-- Drop and recreate policies cleanly for student_profiles read access
DROP POLICY IF EXISTS "admin_read_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "students_read_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;

-- Allow any authenticated user to read all profiles
-- (admin identifies themselves by is_admin_only, simple approach)
CREATE POLICY "authenticated_read_profiles" ON public.student_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "students_update_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
CREATE POLICY "students_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow insert of own profile
DROP POLICY IF EXISTS "students_insert_own" ON public.student_profiles;
CREATE POLICY "students_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

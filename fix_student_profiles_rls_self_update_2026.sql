-- Drop existing self-update policies if they exist
DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "student_update_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.student_profiles;

-- Ensure users can select their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "student_select_own" ON public.student_profiles;
CREATE POLICY "student_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "student_insert_own" ON public.student_profiles;
CREATE POLICY "student_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "student_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure student_module_access table has proper policies
ALTER TABLE IF EXISTS public.student_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_own_access" ON public.student_module_access;
CREATE POLICY "students_view_own_access" ON public.student_module_access
  FOR SELECT USING (auth.uid() = student_id);

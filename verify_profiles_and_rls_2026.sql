
-- Ver estado EXACTO de todos los perfiles
SELECT 
  id,
  full_name,
  english_level,
  onboarding_step,
  account_enabled,
  is_admin_only,
  updated_at
FROM public.student_profiles
ORDER BY updated_at DESC;

-- Ver políticas RLS activas en student_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'student_profiles'
ORDER BY policyname;


-- Sin ningún filtro — ver todo lo que existe
SELECT 
  id,
  full_name,
  is_admin_only,
  onboarding_step,
  account_enabled,
  created_at
FROM public.student_profiles
ORDER BY created_at DESC;

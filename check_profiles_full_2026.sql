
-- Diagnóstico: ver TODOS los valores actuales de onboarding_step
SELECT 
  id,
  full_name,
  english_level,
  onboarding_step,
  account_enabled
FROM public.student_profiles
ORDER BY created_at DESC;

-- También verificar si la columna existe con su valor default
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_profiles'
ORDER BY ordinal_position;

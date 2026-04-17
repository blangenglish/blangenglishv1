
-- Ver onboarding_step de todos los estudiantes
SELECT 
  id,
  full_name,
  english_level,
  onboarding_step,
  account_enabled,
  updated_at
FROM public.student_profiles
ORDER BY updated_at DESC;

-- Verificar que la columna onboarding_step existe y su tipo
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_profiles'
  AND column_name IN ('onboarding_step', 'english_level', 'account_enabled');

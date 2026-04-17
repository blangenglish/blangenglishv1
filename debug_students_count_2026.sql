
-- Total de perfiles
SELECT COUNT(*) as total FROM public.student_profiles;

-- Cuántos tienen is_admin_only = true vs false vs null
SELECT 
  is_admin_only,
  COUNT(*) as cantidad
FROM public.student_profiles
GROUP BY is_admin_only;

-- Ver todos los perfiles con ese campo
SELECT id, full_name, is_admin_only, onboarding_step, created_at
FROM public.student_profiles
ORDER BY created_at DESC
LIMIT 15;

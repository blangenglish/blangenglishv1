
-- Paso 1: Ver qué estudiantes existen y su onboarding_step actual
SELECT id, full_name, english_level, onboarding_step, account_enabled
FROM public.student_profiles
ORDER BY created_at DESC;

-- Paso 2: Forzar english_test en el estudiante más reciente que NO sea admin
UPDATE public.student_profiles
SET onboarding_step = 'english_test',
    updated_at = NOW()
WHERE id IN (
  SELECT sp.id 
  FROM public.student_profiles sp
  WHERE sp.is_admin_only IS NOT TRUE
  ORDER BY sp.created_at DESC
  LIMIT 1
);

-- Paso 3: Confirmar el cambio
SELECT id, full_name, english_level, onboarding_step, account_enabled
FROM public.student_profiles
ORDER BY updated_at DESC
LIMIT 5;


-- Cuántos perfiles hay en total
SELECT COUNT(*) as total_profiles FROM public.student_profiles;

-- Ver los primeros 5 perfiles con sus datos clave
SELECT id, full_name, english_level, onboarding_step, account_enabled, created_at
FROM public.student_profiles
ORDER BY created_at DESC
LIMIT 10;

-- Ver suscripciones
SELECT student_id, plan_slug, status, account_enabled, approved_by_admin
FROM public.subscriptions
LIMIT 10;

-- Verificar si la columna 'progress' existe en student_progress y su estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'student_progress'
ORDER BY ordinal_position;

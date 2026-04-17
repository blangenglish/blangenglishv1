-- 1. Ver todas las suscripciones existentes
SELECT id, student_id, plan_slug, plan_name, status, account_enabled, approved_by_admin, payment_method, created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver perfiles de estudiantes
SELECT id, full_name, email, onboarding_step, account_enabled
FROM student_profiles
ORDER BY created_at DESC
LIMIT 20;

-- 3. Verificar que el constraint existe
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass;

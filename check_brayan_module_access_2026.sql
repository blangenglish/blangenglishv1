
-- Ver todos los registros de module_access de Brayan (o el estudiante más reciente no-admin)
SELECT 
  sma.student_id,
  sp.full_name,
  c.title as course_title,
  c.level as course_level,
  sma.course_id,
  sma.unit_id,
  sma.is_active,
  sma.granted_at
FROM public.student_module_access sma
JOIN public.student_profiles sp ON sp.id = sma.student_id
LEFT JOIN public.courses c ON c.id = sma.course_id
WHERE sp.full_name ILIKE '%brayan%'
   OR sp.full_name ILIKE '%herrera%'
ORDER BY sma.granted_at DESC
LIMIT 30;

-- También ver el perfil del estudiante y su suscripción
SELECT 
  sp.id, sp.full_name, sp.english_level, sp.onboarding_step, sp.account_enabled,
  s.status, s.plan_slug, s.approved_by_admin, s.account_enabled as sub_account_enabled
FROM public.student_profiles sp
LEFT JOIN public.subscriptions s ON s.student_id = sp.id
WHERE sp.full_name ILIKE '%brayan%' OR sp.full_name ILIKE '%herrera%'
LIMIT 5;

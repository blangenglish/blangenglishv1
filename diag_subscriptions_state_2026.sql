
-- ══════════════════════════════════════════════════════════
-- DIAGNÓSTICO: ver qué suscripción tiene Brayan
-- ══════════════════════════════════════════════════════════
SELECT 
  s.student_id,
  sp.full_name,
  s.plan_slug,
  s.status,
  s.approved_by_admin,
  s.account_enabled,
  s.created_at
FROM subscriptions s
LEFT JOIN student_profiles sp ON sp.id = s.student_id
ORDER BY s.created_at DESC
LIMIT 10;

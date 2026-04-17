
-- Ver TODAS las suscripciones ordenadas por fecha
SELECT 
  s.student_id,
  sp.full_name,
  s.plan_slug,
  s.status,
  s.amount_usd,
  s.approved_by_admin,
  s.account_enabled,
  s.created_at
FROM subscriptions s
LEFT JOIN student_profiles sp ON sp.id = s.student_id
ORDER BY s.created_at DESC
LIMIT 20;

-- Ver políticas RLS actuales en subscriptions
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'subscriptions' AND schemaname = 'public'
ORDER BY cmd, policyname;

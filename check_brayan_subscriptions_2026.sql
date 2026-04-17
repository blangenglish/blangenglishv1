
-- Ver todas las suscripciones de estudiantes con nombre Brayan
SELECT 
  s.id,
  s.student_id,
  sp.full_name,
  s.plan_slug,
  s.plan_name,
  s.status,
  s.amount_usd,
  s.payment_method,
  s.approved_by_admin,
  s.account_enabled,
  s.created_at,
  s.current_period_end
FROM subscriptions s
JOIN student_profiles sp ON sp.id = s.student_id
WHERE sp.full_name ILIKE '%brayan%'
ORDER BY s.created_at DESC;

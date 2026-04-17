
-- Ver columnas de subscriptions y sus propiedades
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable,
  is_updatable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Ver el estado actual de todas las suscripciones
SELECT 
  s.id,
  s.student_id,
  p.full_name,
  s.status,
  s.approved_by_admin,
  s.account_enabled,
  s.amount_usd,
  s.payment_method,
  s.plan_slug,
  s.created_at,
  s.current_period_end
FROM subscriptions s
LEFT JOIN student_profiles p ON p.id = s.student_id
ORDER BY s.created_at DESC
LIMIT 20;

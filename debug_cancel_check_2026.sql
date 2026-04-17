
-- Ver el estado actual de subscriptions
SELECT 
  s.student_id,
  s.status,
  s.account_enabled,
  s.plan_slug,
  s.payment_method,
  s.approved_by_admin,
  sp.account_enabled as profile_account_enabled,
  sp.onboarding_step
FROM subscriptions s
LEFT JOIN student_profiles sp ON sp.id = s.student_id
ORDER BY s.created_at DESC
LIMIT 10;


SELECT 
  sp.id,
  sp.full_name,
  sp.account_enabled as profile_account_enabled,
  sp.created_at as profile_created
FROM student_profiles sp
WHERE sp.full_name ILIKE '%brayan%';

SELECT 
  s.student_id,
  s.plan_slug,
  s.plan_name,
  s.status,
  s.amount_usd,
  s.payment_method,
  s.approved_by_admin,
  s.account_enabled,
  s.created_at
FROM subscriptions s
JOIN student_profiles sp ON sp.id = s.student_id
WHERE sp.full_name ILIKE '%brayan%'
ORDER BY s.created_at DESC;


-- Estructura real de payment_history
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payment_history'
ORDER BY ordinal_position;

-- Ver subscriptions pendientes actuales
SELECT id, student_id, status, approved_by_admin, account_enabled, plan_slug, amount_usd
FROM subscriptions
WHERE status = 'pending_approval' OR approved_by_admin = false
ORDER BY created_at DESC;

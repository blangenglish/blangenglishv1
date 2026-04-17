
-- Test: intentar UPDATE directo en una sub pending_approval
-- Primero mostrar cuáles están pendientes
SELECT id, student_id, status, approved_by_admin, account_enabled
FROM public.subscriptions
WHERE status = 'pending_approval' OR (approved_by_admin = false AND account_enabled = false)
ORDER BY created_at DESC;

-- Mostrar también las más recientes sin importar status
SELECT id, student_id, status, approved_by_admin, account_enabled, plan_slug, created_at
FROM public.subscriptions
ORDER BY created_at DESC
LIMIT 5;


-- Probar UPDATE directo en subscriptions (simula lo que hace service_role)
-- Buscar cualquier suscripción que sea pending_approval o approved_by_admin=false
SELECT id, student_id, status, approved_by_admin, account_enabled, plan_slug
FROM subscriptions
WHERE status = 'pending_approval' OR approved_by_admin = false
ORDER BY created_at DESC;

-- Ver payment_history — últimas entradas
SELECT id, student_id, event_type, amount_usd, payment_method, notes, created_at, created_by
FROM payment_history
ORDER BY created_at DESC
LIMIT 10;


-- Ver todos los triggers en subscriptions
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  pg_get_triggerdef(tr.oid) as trigger_def
FROM information_schema.triggers t
JOIN pg_trigger tr ON tr.tgname = t.trigger_name
WHERE t.event_object_table = 'subscriptions'
  AND t.trigger_schema = 'public';

-- Verificar columnas de subscriptions que son actualizables  
SELECT column_name, is_updatable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscriptions'
ORDER BY ordinal_position;

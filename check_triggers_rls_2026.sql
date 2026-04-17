
-- Verificar si hay triggers que bloquean el update en subscriptions
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'subscriptions'
  AND trigger_schema = 'public';

-- Verificar RLS policies en subscriptions
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subscriptions'
  AND schemaname = 'public';

-- Ver payment_history columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payment_history'
ORDER BY ordinal_position;

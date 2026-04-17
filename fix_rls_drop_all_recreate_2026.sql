-- Paso 1: Ver todas las políticas actuales en subscriptions
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'subscriptions';

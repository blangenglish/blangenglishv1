
-- Ver todas las políticas RLS en las tablas clave
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('student_profiles', 'subscriptions', 'student_module_access', 'payment_history', 'courses', 'units')
ORDER BY tablename, cmd;

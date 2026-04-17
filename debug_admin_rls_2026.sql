-- Ver exactamente qué hay en admin_users
SELECT id, email FROM public.admin_users;

-- Ver políticas RLS activas en admin_users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'admin_users';

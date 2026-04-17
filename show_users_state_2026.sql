-- 1. Ver qué hay actualmente en admin_users
SELECT 'admin_users' as tabla, id::text, email FROM public.admin_users
UNION ALL
-- 2. Ver TODOS los usuarios en auth (para identificar el admin)
SELECT 'auth.users' as tabla, id::text, email FROM auth.users
ORDER BY tabla, email;

-- 1. Desactivar RLS completamente en admin_users (tabla interna, no necesita RLS)
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_self_read" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_auth_read" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_self_manage" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_write" ON public.admin_users;

-- 3. Limpiar y reinsertar admin correcto
DELETE FROM public.admin_users;

INSERT INTO public.admin_users (id, email)
VALUES ('5238041e-0e0c-453d-971f-58c2025b47a0', 'blangenglishlearning@blangenglish.com');

-- 4. Verificar
SELECT id, email FROM public.admin_users;

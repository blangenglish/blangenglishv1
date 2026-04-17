
-- Paso 1: Limpiar e insertar admin fresh
DELETE FROM public.admin_users 
WHERE lower(trim(email)) LIKE '%blangenglish%';

INSERT INTO public.admin_users (id, email)
SELECT au.id, au.email
FROM auth.users au
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com'
LIMIT 1;

-- Paso 2: Verificar que quedó
SELECT id, email FROM public.admin_users;

-- Paso 3: Verificar RLS policies actuales
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'admin_users';

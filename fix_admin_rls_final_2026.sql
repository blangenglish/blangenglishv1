
-- Eliminar TODAS las políticas existentes de admin_users
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'admin_users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Deshabilitar RLS temporalmente para asegurar que los datos son correctos
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Limpiar y reinsertar
DELETE FROM public.admin_users WHERE lower(trim(email)) LIKE '%blangenglish%';

INSERT INTO public.admin_users (id, email)
SELECT au.id, au.email
FROM auth.users au
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com'
LIMIT 1;

-- Volver a habilitar RLS con políticas correctas
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede verificar si su UUID está en admin_users
CREATE POLICY "authenticated_can_check_admin"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: service_role tiene acceso total
CREATE POLICY "service_role_full_access"
  ON public.admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Confirmar resultado
SELECT id, email FROM public.admin_users;

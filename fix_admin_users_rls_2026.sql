
-- Habilitar RLS en admin_users si no está habilitado
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "admin_users_read_own" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;

-- Un usuario autenticado puede leer si su propio id está en la tabla
CREATE POLICY "admin_users_read_own"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Confirmar que el registro del admin existe
INSERT INTO public.admin_users (id, email, created_at)
SELECT 
  id, 
  email,
  now()
FROM auth.users
WHERE email = 'blangenglishlearning@blangenglish.com'
ON CONFLICT (id) DO NOTHING;

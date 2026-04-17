
-- Crear tabla admin_users si no existe
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Política: solo el propio admin puede leer su registro (y service_role todo)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'admin_read_own'
  ) THEN
    CREATE POLICY "admin_read_own" ON public.admin_users
      FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'service_all_admin'
  ) THEN
    CREATE POLICY "service_all_admin" ON public.admin_users
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insertar el admin si aún no existe (busca por email en auth.users)
INSERT INTO public.admin_users (id, email)
SELECT au.id, au.email
FROM auth.users au
WHERE lower(trim(au.email)) = 'blangenglishlearning@blangenglish.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE lower(email) = 'blangenglishlearning@blangenglish.com'
  )
LIMIT 1;

-- Confirmar resultado
SELECT id, email, created_at FROM public.admin_users;


-- Asegurar columna email en student_profiles
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS email text;

-- Sincronizar emails desde auth.users hacia student_profiles para los que falten
UPDATE public.student_profiles sp
SET email = au.email
FROM auth.users au
WHERE sp.id = au.id
  AND (sp.email IS NULL OR sp.email = '');

-- Asegurar política de lectura para service_role (ya existe pero por si acaso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_profiles' AND policyname = 'service_all_profiles'
  ) THEN
    CREATE POLICY "service_all_profiles" ON public.student_profiles
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- También permitir que usuarios autenticados vean su propio perfil (select)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_profiles' AND policyname = 'sp_select_own'
  ) THEN
    CREATE POLICY "sp_select_own" ON public.student_profiles
      FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

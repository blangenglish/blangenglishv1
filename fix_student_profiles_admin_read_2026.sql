
-- Eliminar política admin anterior si existe
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "service_all_profiles" ON public.student_profiles;

-- Política: el admin puede leer TODOS los perfiles
CREATE POLICY "admin_read_all_profiles"
  ON public.student_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- El propio estudiante siempre puede ver su perfil
    auth.uid() = id
    OR
    -- El admin (por email) puede ver todos
    (SELECT lower(trim(email)) FROM auth.users WHERE id = auth.uid()) = 'blangenglishlearning@blangenglish.com'
  );

-- Política: service_role acceso total (para edge functions)
CREATE POLICY "service_all_profiles"
  ON public.student_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'student_profiles' ORDER BY policyname;

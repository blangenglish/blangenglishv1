
-- Limpiar TODAS las políticas existentes en student_profiles para evitar conflictos
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'student_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_profiles', pol.policyname);
  END LOOP;
END $$;

-- Recrear políticas limpias
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- El estudiante puede SELECT su propio perfil
CREATE POLICY "profile_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

-- El estudiante puede UPDATE su propio perfil
CREATE POLICY "profile_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);

-- El estudiante puede INSERT su propio perfil
CREATE POLICY "profile_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- service_role tiene acceso total (para edge functions del admin)
CREATE POLICY "profile_service_role_all" ON public.student_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Confirmar políticas creadas
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'student_profiles' AND schemaname = 'public'
ORDER BY policyname;

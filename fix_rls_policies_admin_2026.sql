
-- ============================================================
-- STUDENT_PROFILES: estudiante puede leer/actualizar su propio perfil
-- Admin (is_admin_only=true) puede leer/actualizar todos
-- ============================================================
DROP POLICY IF EXISTS "students_read_own_profile" ON public.student_profiles;
DROP POLICY IF EXISTS "students_update_own_profile" ON public.student_profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "service_role_all" ON public.student_profiles;

-- Cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "students_read_own_profile" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin puede leer todos
CREATE POLICY "admin_read_all_profiles" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

-- Estudiante puede actualizar su propio perfil
CREATE POLICY "students_update_own_profile" ON public.student_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin puede actualizar todos los perfiles
CREATE POLICY "admin_update_all_profiles" ON public.student_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

-- ============================================================
-- SUBSCRIPTIONS: estudiante lee la suya, admin lee todas
-- ============================================================
DROP POLICY IF EXISTS "students_read_own_sub" ON public.subscriptions;
DROP POLICY IF EXISTS "students_update_own_sub" ON public.subscriptions;
DROP POLICY IF EXISTS "students_insert_own_sub" ON public.subscriptions;
DROP POLICY IF EXISTS "admin_read_all_subs" ON public.subscriptions;
DROP POLICY IF EXISTS "admin_write_all_subs" ON public.subscriptions;

CREATE POLICY "students_read_own_sub" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "students_insert_own_sub" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "students_update_own_sub" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "admin_read_all_subs" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

CREATE POLICY "admin_write_all_subs" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

-- ============================================================
-- STUDENT_MODULE_ACCESS: estudiante lee los suyos, admin escribe todos
-- ============================================================
DROP POLICY IF EXISTS "students_read_own_modules" ON public.student_module_access;
DROP POLICY IF EXISTS "admin_all_modules" ON public.student_module_access;

CREATE POLICY "students_read_own_modules" ON public.student_module_access
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "admin_all_modules" ON public.student_module_access
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

-- ============================================================
-- PAYMENT_HISTORY: estudiante lee la suya, admin todo
-- ============================================================
DROP POLICY IF EXISTS "students_read_own_payments" ON public.payment_history;
DROP POLICY IF EXISTS "students_insert_own_payments" ON public.payment_history;
DROP POLICY IF EXISTS "admin_all_payments" ON public.payment_history;

CREATE POLICY "students_read_own_payments" ON public.payment_history
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "students_insert_own_payments" ON public.payment_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "admin_all_payments" ON public.payment_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

-- ============================================================
-- COURSES y UNITS: todos autenticados pueden leer
-- ============================================================
DROP POLICY IF EXISTS "all_read_courses" ON public.courses;
DROP POLICY IF EXISTS "all_read_units" ON public.units;
DROP POLICY IF EXISTS "admin_write_courses" ON public.courses;
DROP POLICY IF EXISTS "admin_write_units" ON public.units;

CREATE POLICY "all_read_courses" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "all_read_units" ON public.units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_courses" ON public.courses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

CREATE POLICY "admin_write_units" ON public.units
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

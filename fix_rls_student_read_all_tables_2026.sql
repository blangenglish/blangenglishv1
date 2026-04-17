
-- ══════════════════════════════════════════════════════════
-- FIX: student_profiles RLS — permitir lectura y escritura
--       propia para estudiantes
-- ══════════════════════════════════════════════════════════

-- Asegurar RLS habilitado
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ── Borrar políticas previas que puedan entrar en conflicto ──
DROP POLICY IF EXISTS "Students can view own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "students_can_view_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Students read own" ON public.student_profiles;
DROP POLICY IF EXISTS "student_read_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "students_can_update_own" ON public.student_profiles;
DROP POLICY IF EXISTS "student_update_own" ON public.student_profiles;

-- ── SELECT: estudiante puede leer su propio perfil ──
CREATE POLICY "student_select_own_profile"
  ON public.student_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ── UPDATE: estudiante puede actualizar su propio perfil ──
CREATE POLICY "student_update_own_profile"
  ON public.student_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── INSERT: estudiante puede insertar su propio perfil (onboarding) ──
CREATE POLICY "student_insert_own_profile"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════════════════════════
-- FIX: subscriptions — estudiante puede leer su propia suscripción
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "student_select_own_subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "student_read_own_subscription" ON public.subscriptions;

CREATE POLICY "student_select_own_subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = student_id);

-- ══════════════════════════════════════════════════════════
-- FIX: student_module_access — estudiante puede leer sus módulos
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.student_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_select_own_modules" ON public.student_module_access;
DROP POLICY IF EXISTS "Students can view own module access" ON public.student_module_access;

CREATE POLICY "student_select_own_modules"
  ON public.student_module_access
  FOR SELECT
  USING (auth.uid() = student_id);

-- ══════════════════════════════════════════════════════════
-- FIX: payment_history — estudiante puede leer su historial
-- ══════════════════════════════════════════════════════════
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_select_own_payments" ON public.payment_history;
DROP POLICY IF EXISTS "Students can view own payment history" ON public.payment_history;

CREATE POLICY "student_select_own_payments"
  ON public.payment_history
  FOR SELECT
  USING (auth.uid() = student_id);

-- Verificar resultado
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('student_profiles','subscriptions','student_module_access','payment_history')
  AND schemaname = 'public'
ORDER BY tablename, cmd;

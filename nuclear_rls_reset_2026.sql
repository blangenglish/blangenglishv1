-- ELIMINAR TODAS las políticas de subscriptions dinámicamente
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', pol.policyname);
  END LOOP;
END $$;

-- ELIMINAR TODAS las políticas de student_profiles dinámicamente
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'student_profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_profiles', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- RECREAR políticas limpias para subscriptions
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "sub_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "sub_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "sub_service_all" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RECREAR políticas limpias para student_profiles
-- ============================================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prof_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "prof_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "prof_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "prof_service_all" ON public.student_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ASEGURAR unique constraint en subscriptions.student_id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_student_id_key'
    AND conrelid = 'subscriptions'::regclass
  ) THEN
    -- Eliminar duplicados primero
    DELETE FROM public.subscriptions a
    USING public.subscriptions b
    WHERE a.student_id = b.student_id
      AND a.id > b.id;

    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_student_id_key UNIQUE (student_id);
  END IF;
END $$;

-- Columnas necesarias
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_slug TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS account_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'plan';

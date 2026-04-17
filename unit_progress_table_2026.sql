
-- ── unit_progress: progreso del estudiante por parte de cada unidad ───────────
CREATE TABLE IF NOT EXISTS public.unit_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id       uuid NOT NULL,
  stage         text NOT NULL CHECK (stage IN ('grammar','vocabulary','reading','listening','ai_practice')),
  completed     boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  quiz_passed   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, unit_id, stage)
);

-- índices
CREATE INDEX IF NOT EXISTS unit_progress_student_idx ON public.unit_progress(student_id);
CREATE INDEX IF NOT EXISTS unit_progress_unit_idx ON public.unit_progress(unit_id);

-- RLS
ALTER TABLE public.unit_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "up_select_own"  ON public.unit_progress;
DROP POLICY IF EXISTS "up_insert_own"  ON public.unit_progress;
DROP POLICY IF EXISTS "up_update_own"  ON public.unit_progress;
DROP POLICY IF EXISTS "up_service_all" ON public.unit_progress;

CREATE POLICY "up_select_own"  ON public.unit_progress FOR SELECT  USING (auth.uid() = student_id);
CREATE POLICY "up_insert_own"  ON public.unit_progress FOR INSERT  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "up_update_own"  ON public.unit_progress FOR UPDATE  USING (auth.uid() = student_id);
CREATE POLICY "up_service_all" ON public.unit_progress FOR ALL     USING (auth.role() = 'service_role');

-- trigger updated_at
CREATE OR REPLACE FUNCTION update_unit_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS unit_progress_updated_at ON public.unit_progress;
CREATE TRIGGER unit_progress_updated_at
  BEFORE UPDATE ON public.unit_progress
  FOR EACH ROW EXECUTE FUNCTION update_unit_progress_updated_at();

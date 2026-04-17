-- ============================================================
-- UNIT CONTENT BLOCKS (editor de unidades rico)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unit_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'text', 'heading', 'image', 'video', 'audio', 'quiz', 'divider', 'embed'
  )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZ TABLE (exámenes por unidad)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Examen de la unidad',
  description TEXT,
  pass_score INTEGER DEFAULT 70,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (
    question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer')
  ),
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVENUE TRACKING (para el dashboard de ganancias)
-- ============================================================
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS amount_cop NUMERIC(12,2) DEFAULT 0;

-- ============================================================
-- STORAGE BUCKET for unit media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-media', 'unit-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: admin can upload
CREATE POLICY "unit_media_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'unit-media');

CREATE POLICY "unit_media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'unit-media');

CREATE POLICY "unit_media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'unit-media');

-- ============================================================
-- RLS for new tables
-- ============================================================
ALTER TABLE public.unit_content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_public_read" ON public.unit_content_blocks FOR SELECT USING (true);
CREATE POLICY "blocks_admin_write" ON public.unit_content_blocks FOR ALL 
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_admin_write" ON public.quizzes FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_public_read" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_admin_write" ON public.quiz_questions FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_student_own" ON public.quiz_attempts FOR ALL
  USING (auth.uid() = student_id);
CREATE POLICY "attempts_admin_read" ON public.quiz_attempts FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unit_blocks_unit_id ON public.unit_content_blocks(unit_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_unit_id ON public.quizzes(unit_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id, quiz_id);

-- ============================================================
-- UNIT STAGE MATERIALS
-- Cada unidad tiene 5 stages fijos: grammar, vocabulary, reading, listening, ai_practice
-- Cada stage puede tener múltiples materiales de distintos tipos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unit_stage_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL CHECK (stage IN ('grammar','vocabulary','reading','listening','ai_practice')),
  material_type TEXT NOT NULL CHECK (material_type IN ('audio','video','pdf','word','ppt','image','url','text')),
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT DEFAULT '',
  file_url      TEXT DEFAULT NULL,   -- URL de Supabase Storage para archivos subidos
  file_name     TEXT DEFAULT NULL,   -- nombre original del archivo
  external_url  TEXT DEFAULT NULL,   -- URL externa (YouTube, enlace, etc.)
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usm_unit_stage  ON public.unit_stage_materials(unit_id, stage);
CREATE INDEX IF NOT EXISTS idx_usm_published   ON public.unit_stage_materials(unit_id, is_published);

-- RLS
ALTER TABLE public.unit_stage_materials ENABLE ROW LEVEL SECURITY;

-- Estudiantes autenticados pueden leer materiales publicados
CREATE POLICY "usm_student_read" ON public.unit_stage_materials
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Admin puede hacer todo
CREATE POLICY "usm_admin_all" ON public.unit_stage_materials
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- Anon también puede leer (para preview público)
CREATE POLICY "usm_anon_read" ON public.unit_stage_materials
  FOR SELECT TO anon
  USING (is_published = true);

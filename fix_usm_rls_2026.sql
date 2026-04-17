-- Drop all existing policies and recreate with simpler, working ones
DROP POLICY IF EXISTS "usm_student_read" ON public.unit_stage_materials;
DROP POLICY IF EXISTS "usm_admin_all"    ON public.unit_stage_materials;
DROP POLICY IF EXISTS "usm_anon_read"    ON public.unit_stage_materials;

-- Allow anyone to read published materials (no auth required for students to browse)
CREATE POLICY "usm_read_published" ON public.unit_stage_materials
  FOR SELECT USING (is_published = true);

-- Allow authenticated users to do everything (admin writes, students read)
CREATE POLICY "usm_authenticated_all" ON public.unit_stage_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

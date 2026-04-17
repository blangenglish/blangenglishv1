
-- Ensure all personal info columns exist on student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS birthday       date,
  ADD COLUMN IF NOT EXISTS country        text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_other text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS english_level  text,
  ADD COLUMN IF NOT EXISTS onboarding_step text,
  ADD COLUMN IF NOT EXISTS is_admin_only  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- Create session_requests table so teacher-session forms are persisted
CREATE TABLE IF NOT EXISTS public.session_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  student_name    text,
  student_email   text,
  sessions        jsonb NOT NULL DEFAULT '[]', -- [{date, topic}]
  weekly_plan     boolean DEFAULT false,
  weekly_hours    text,
  weekly_schedule text,
  objective       text,
  created_at      timestamptz DEFAULT now()
);

-- RLS for session_requests
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_own_sessions" ON public.session_requests;
CREATE POLICY "students_own_sessions" ON public.session_requests
  FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "admin_all_sessions" ON public.session_requests;
CREATE POLICY "admin_all_sessions" ON public.session_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles
      WHERE id = auth.uid() AND is_admin_only = true
    )
  );

-- Allow student_profiles to be read by admin
DROP POLICY IF EXISTS "admin_read_profiles" ON public.student_profiles;
CREATE POLICY "admin_read_profiles" ON public.student_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = true
    )
  );

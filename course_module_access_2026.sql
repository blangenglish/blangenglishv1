
-- Ensure student_profiles has account_enabled and account_status columns
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS account_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'pending';

-- Table: student_module_access — admin grants access to specific courses/units per student
CREATE TABLE IF NOT EXISTS public.student_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.student_profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  UNIQUE(student_id, course_id, unit_id)
);

-- RLS for student_module_access
ALTER TABLE public.student_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_read_own_access" ON public.student_module_access;
CREATE POLICY "students_read_own_access" ON public.student_module_access
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "service_role_full_access_module" ON public.student_module_access;
CREATE POLICY "service_role_full_access_module" ON public.student_module_access
  FOR ALL USING (auth.role() = 'service_role');

-- Also allow authenticated to insert/update their own (not needed but safe)
DROP POLICY IF EXISTS "admin_manage_module_access" ON public.student_module_access;
CREATE POLICY "admin_manage_module_access" ON public.student_module_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = auth.uid() AND sp.is_admin_only = TRUE
    )
  );

-- Ensure subscriptions table has plan_type column for trial/discount logic
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_amount NUMERIC(10,2);

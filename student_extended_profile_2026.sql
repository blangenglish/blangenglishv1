
-- ─────────────────────────────────────────────────────────────────
-- 1. Extend student_profiles with new registration fields
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS birthday          DATE,
  ADD COLUMN IF NOT EXISTS education_level   TEXT,   -- bachiller, universitario, posgrado, trabajo, otro
  ADD COLUMN IF NOT EXISTS education_other   TEXT,
  ADD COLUMN IF NOT EXISTS country           TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS bio               TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 2. Unit completion tracking per student
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unit_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id       UUID NOT NULL,
  course_id     UUID NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, unit_id)
);

ALTER TABLE public.unit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own completions"
  ON public.unit_completions FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin reads all completions"
  ON public.unit_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 3. Payment configuration table (PayPal link, PSE bank info)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT UNIQUE NOT NULL,
  value           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for students to see payment info)
CREATE POLICY "Public read payment config"
  ON public.payment_config FOR SELECT
  USING (true);

-- Only admin can write
CREATE POLICY "Admin write payment config"
  ON public.payment_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  );

-- Insert default payment config rows
INSERT INTO public.payment_config (key, value) VALUES
  ('paypal_link',         'https://paypal.me/blangenglish'),
  ('paypal_email',        'blangenglishlearning@blangenglish.com'),
  ('pse_bank_name',       'Bancolombia'),
  ('pse_account_type',    'Ahorro'),
  ('pse_account_number',  ''),
  ('pse_owner_name',      'BLANG English'),
  ('pse_owner_id',        ''),
  ('pse_nit',             ''),
  ('contact_email',       'blangenglishlearning@blangenglish.com'),
  ('monthly_price_usd',   '15'),
  ('launch_discount_pct', '50')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 4. Add course_level_required to courses (for sequential unlocking)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS required_level TEXT;

-- Set default required_level = level for existing courses
UPDATE public.courses SET required_level = level WHERE required_level IS NULL;

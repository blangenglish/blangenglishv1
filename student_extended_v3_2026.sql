
-- 1. Extend student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS birthday          DATE,
  ADD COLUMN IF NOT EXISTS education_level   TEXT,
  ADD COLUMN IF NOT EXISTS education_other   TEXT,
  ADD COLUMN IF NOT EXISTS country           TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS bio               TEXT;

-- 2. Unit completion tracking
CREATE TABLE IF NOT EXISTS public.unit_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id       UUID NOT NULL,
  course_id     UUID NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, unit_id)
);

ALTER TABLE public.unit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own completions" ON public.unit_completions;
CREATE POLICY "Students manage own completions"
  ON public.unit_completions FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admin reads all completions" ON public.unit_completions;
CREATE POLICY "Admin reads all completions"
  ON public.unit_completions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- 3. Payment configuration table
CREATE TABLE IF NOT EXISTS public.payment_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read payment config" ON public.payment_config;
CREATE POLICY "Public read payment config"
  ON public.payment_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin write payment config" ON public.payment_config;
CREATE POLICY "Admin write payment config"
  ON public.payment_config FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.admin_users));

INSERT INTO public.payment_config (key, value) VALUES
  ('paypal_link',         'https://paypal.me/blangenglish'),
  ('paypal_email',        'blangenglishlearning@blangenglish.com'),
  ('pse_bank_name',       ''),
  ('pse_account_type',    'Ahorros'),
  ('pse_account_number',  ''),
  ('pse_owner_name',      ''),
  ('pse_owner_id',        ''),
  ('contact_email',       'blangenglishlearning@blangenglish.com'),
  ('monthly_price_usd',   '15'),
  ('launch_discount_pct', '50')
ON CONFLICT (key) DO NOTHING;

-- 4. required_level on courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS required_level TEXT;

UPDATE public.courses SET required_level = level WHERE required_level IS NULL;

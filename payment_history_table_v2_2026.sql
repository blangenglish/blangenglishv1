
-- ── 1. Ensure all profile columns exist ──
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS country      text,
  ADD COLUMN IF NOT EXISTS city         text,
  ADD COLUMN IF NOT EXISTS birthday     date,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_other text,
  ADD COLUMN IF NOT EXISTS account_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- ── 2. Create payment_history table ──
CREATE TABLE IF NOT EXISTS public.payment_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid,
  amount_usd      numeric(10,2) NOT NULL DEFAULT 0,
  amount_cop      numeric(12,0),
  payment_method  text NOT NULL DEFAULT 'unknown',
  status          text NOT NULL DEFAULT 'pending',
  plan_name       text,
  description     text,
  receipt_url     text,
  approved_by     uuid,
  approved_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_student ON public.payment_history(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status  ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON public.payment_history(created_at DESC);

-- ── 3. RLS for payment_history ──
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_view_own_payments" ON public.payment_history;
CREATE POLICY "student_view_own_payments" ON public.payment_history
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "service_all_payments" ON public.payment_history;
CREATE POLICY "service_all_payments" ON public.payment_history
  FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Ensure subscriptions has created_at ──
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- ─── STUDENT PROFILES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  avatar_url    TEXT DEFAULT '',
  current_level TEXT DEFAULT 'A1',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own" ON public.student_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "students_update_own" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "students_insert_own" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "admin_all_profiles" ON public.student_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  plan_slug       TEXT NOT NULL DEFAULT 'free_trial',
  plan_name       TEXT NOT NULL DEFAULT '7 días gratis',
  status          TEXT NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial','active','cancelled','expired')),
  amount_usd      NUMERIC(10,2) DEFAULT 0,
  payment_method  TEXT DEFAULT '',
  trial_ends_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "sub_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "sub_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = student_id);

-- Admin can read all subscriptions
CREATE POLICY "admin_all_subscriptions" ON public.subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── STUDENT PROGRESS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  course_id     UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  course_slug   TEXT NOT NULL DEFAULT '',
  unit_number   INT NOT NULL DEFAULT 1,
  completed_units INT NOT NULL DEFAULT 0,
  total_units   INT NOT NULL DEFAULT 0,
  streak_days   INT NOT NULL DEFAULT 0,
  total_points  INT NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_slug)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select_own" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "progress_insert_own" ON public.student_progress
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "progress_update_own" ON public.student_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Admin can read all progress
CREATE POLICY "admin_all_progress" ON public.student_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ─── TRIGGER: auto-create profile on user sign up ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.student_profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── PAYMENT HISTORY ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_usd      NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_cop      NUMERIC(12,0) DEFAULT 0,
  payment_method  TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  description     TEXT DEFAULT '',
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_select_own" ON public.payment_history
  FOR SELECT USING (auth.uid() = student_id);

-- Admin can read all payments
CREATE POLICY "admin_all_payments" ON public.payment_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

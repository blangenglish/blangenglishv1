
-- ============================================================
-- 1. Ensure email column exists in student_profiles
-- ============================================================
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================
-- 2. Backfill emails from auth.users into student_profiles
-- ============================================================
UPDATE public.student_profiles sp
SET email = u.email
FROM auth.users u
WHERE sp.id = u.id
  AND (sp.email IS NULL OR sp.email = '');

-- ============================================================
-- 3. Trigger: keep email in sync whenever auth.users is updated
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_user_email_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.student_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(student_profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email_to_profile();

-- ============================================================
-- 4. Drop all existing RLS policies on student_profiles and reset
-- ============================================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "admin_read_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "students_update_own" ON public.student_profiles;
DROP POLICY IF EXISTS "students_insert_own" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Allow all authenticated reads" ON public.student_profiles;

-- All authenticated users can read all profiles (admin needs this)
CREATE POLICY "authenticated_read_all_profiles_2026"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile only
CREATE POLICY "own_update_profile_2026"
  ON public.student_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "own_insert_profile_2026"
  ON public.student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5. Fix session_requests RLS - allow all authenticated to read
-- ============================================================
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_own_sessions" ON public.session_requests;
DROP POLICY IF EXISTS "admin_all_sessions" ON public.session_requests;

CREATE POLICY "authenticated_read_sessions_2026"
  ON public.session_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_sessions_2026"
  ON public.session_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 6. Add streak_days column to student_progress if missing
-- ============================================================
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- ============================================================
-- 7. Function to update streak when student logs activity
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_daily_activity(p_student_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - 1;
  had_yesterday BOOLEAN;
BEGIN
  -- Insert today's activity (ignore if already exists)
  INSERT INTO public.daily_activity (student_id, activity_date)
  VALUES (p_student_id, today)
  ON CONFLICT (student_id, activity_date) DO NOTHING;

  -- Check if there was activity yesterday
  SELECT EXISTS(
    SELECT 1 FROM public.daily_activity
    WHERE student_id = p_student_id AND activity_date = yesterday
  ) INTO had_yesterday;

  -- Update streak in all progress rows for this student
  UPDATE public.student_progress
  SET
    streak_days = CASE
      WHEN had_yesterday THEN COALESCE(streak_days, 0) + 1
      ELSE 1
    END,
    last_activity_at = NOW()
  WHERE student_id = p_student_id;

  -- If no progress row exists yet, create one
  IF NOT FOUND THEN
    INSERT INTO public.student_progress (student_id, streak_days, last_activity_at, completed_units, total_units, total_points)
    VALUES (p_student_id, 1, NOW(), 0, 0, 0)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ============================================================
-- 8. daily_activity unique constraint
-- ============================================================
ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS id BIGSERIAL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_activity_student_date_unique'
  ) THEN
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_student_date_unique UNIQUE (student_id, activity_date);
  END IF;
END$$;


-- Add email column to student_profiles if not exists
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Function: auto-create student_profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.student_profiles.full_name),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill email for existing profiles from auth.users
UPDATE public.student_profiles sp
SET email = au.email
FROM auth.users au
WHERE sp.id = au.id
  AND (sp.email IS NULL OR sp.email = '');

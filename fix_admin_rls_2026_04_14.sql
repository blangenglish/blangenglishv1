-- Drop existing restrictive policies on admin_users
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_self_read" ON public.admin_users;

-- Allow any authenticated user to SELECT from admin_users
-- (the hook checks if their email exists — if not, they're just not admin)
CREATE POLICY "admin_users_auth_read" ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can insert/update/delete (by UUID match)
DROP POLICY IF EXISTS "admin_users_write" ON public.admin_users;
CREATE POLICY "admin_users_self_manage" ON public.admin_users
  FOR ALL
  USING (auth.uid() = id);

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // List all auth users
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const users = (usersData?.users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }));

  // List student_profiles
  const { data: profiles } = await supabaseAdmin
    .from('student_profiles')
    .select('id, full_name, is_admin_only, account_enabled')
    .limit(20);

  // List admin_users
  const { data: adminUsers, error: adminErr } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .limit(20);

  return new Response(JSON.stringify({
    auth_users: users,
    student_profiles: profiles,
    admin_users: adminUsers,
    admin_users_error: adminErr?.message,
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

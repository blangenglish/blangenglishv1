import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Leer el JWT del estudiante para obtener su user_id
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'No authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Cliente con la anon key para verificar el JWT del usuario
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // Cliente admin con service_role para bypasear RLS
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Verificar identidad del usuario
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;

    // Obtener todo en paralelo usando service_role (bypasea RLS)
    const [
      { data: profile },
      { data: subscriptions },
      { data: moduleAccess },
      { data: paymentHistory }
    ] = await Promise.all([
      supabaseAdmin
        .from('student_profiles')
        .select('full_name, phone, english_level, onboarding_step, is_admin_only, birthday, country, city, education_level, education_other, account_enabled')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('student_module_access')
        .select('course_id, unit_id')
        .eq('student_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('payment_history')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    // La suscripción más reciente (primera del array)
    const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

    return new Response(JSON.stringify({
      success: true,
      profile: profile || null,
      subscription: subscription || null,
      moduleAccess: moduleAccess || [],
      paymentHistory: paymentHistory || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

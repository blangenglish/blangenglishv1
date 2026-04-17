import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

// Correo reservado solo para admin — NUNCA puede registrarse como estudiante
const ADMIN_EMAIL = 'blangenglishlearning@blangenglish.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { email, password, name, birthday, education, education_other, country, city } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email y password son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SEGURIDAD: Bloquear el correo de admin — solo puede usarse en panel admin
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'admin_email_reserved' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(
      u => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );
    if (alreadyExists) {
      return new Response(JSON.stringify({ error: 'already_registered' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Crear usuario con Admin API — bypassa rate limit y auto-confirma
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: { full_name: name },
      email_confirm: true,
    });

    if (createError) {
      console.error('Create user error:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = newUser?.user?.id;

    if (userId) {
      // Crear perfil de estudiante
      await supabaseAdmin.from('student_profiles').upsert({
        id: userId,
        full_name: name || '',
        email: email.toLowerCase().trim(),
        birthday: birthday || null,
        education_level: education || null,
        education_other: education === 'otro' ? education_other : null,
        country: country || null,
        city: city || null,
        onboarding_step: 'pending_plan',
        account_enabled: false,
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Register edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

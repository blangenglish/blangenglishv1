import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { action, student_id, ...data } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: save_subscription ──────────────────────────────
    if (action === 'save_subscription') {
      const today = new Date();
      const trialEnd = new Date(today);
      trialEnd.setDate(today.getDate() + 7);
      const monthEnd = new Date(today);
      monthEnd.setMonth(today.getMonth() + 1);

      const plan = data.plan; // 'trial' | 'discount' | 'later'
      const method = data.method; // 'pse' | 'paypal' | 'none'

      let subData: Record<string, unknown>;

      if (plan === 'later') {
        subData = {
          student_id,
          plan_slug: 'pending',
          plan_name: 'Pendiente de elección',
          status: 'pending_plan',
          amount_usd: 0,
          payment_method: 'none',
          approved_by_admin: false,
          account_enabled: false,
          current_period_end: trialEnd.toISOString(),
          renewal_due_at: trialEnd.toISOString(),
        };
      } else if (plan === 'trial') {
        subData = {
          student_id,
          plan_slug: 'free_trial',
          plan_name: '7 días gratis',
          status: 'trial',
          amount_usd: 0,
          payment_method: method || 'none',
          approved_by_admin: true,
          account_enabled: true,
          current_period_end: trialEnd.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          renewal_due_at: trialEnd.toISOString(),
        };
      } else if (plan === 'discount') {
        const needsApproval = method === 'pse' || method === 'paypal';
        subData = {
          student_id,
          plan_slug: 'monthly',
          plan_name: 'Plan Mensual (50% OFF)',
          status: needsApproval ? 'pending_approval' : 'active',
          amount_usd: 7.50,
          payment_method: method,
          approved_by_admin: !needsApproval,
          account_enabled: !needsApproval,
          current_period_end: monthEnd.toISOString(),
          renewal_due_at: monthEnd.toISOString(),
        };
      } else {
        return new Response(JSON.stringify({ error: 'invalid plan' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id, account_enabled, approved_by_admin, status')
        .eq('student_id', student_id)
        .maybeSingle();

      let subError;
      if (existing) {
        // Si ya tiene un plan activo aprobado, NO lo pisamos
        const alreadyActive =
          existing.account_enabled === true &&
          existing.approved_by_admin === true &&
          existing.status !== 'cancelled';

        if (!alreadyActive) {
          const { error } = await supabase
            .from('subscriptions')
            .update(subData)
            .eq('student_id', student_id);
          subError = error;
        }
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert(subData);
        subError = error;
      }

      if (subError) {
        console.error('Subscription error:', subError);
        return new Response(JSON.stringify({ error: subError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update student profile — solo onboarding_step, NUNCA account_enabled si ya está activo
      const profStep = plan === 'later' ? 'pending_plan' : 'pending_level';

      const { data: existingProf } = await supabase
        .from('student_profiles')
        .select('account_enabled, onboarding_step')
        .eq('id', student_id)
        .maybeSingle();

      const profileUpd: Record<string, unknown> = {
        onboarding_step: profStep,
      };

      // Si account_enabled ya es true (activado por admin), NO cambiarlo
      if (existingProf?.account_enabled !== true) {
        profileUpd.account_enabled = plan === 'trial' ? true : false;
      }

      const { error: profError } = await supabase
        .from('student_profiles')
        .update(profileUpd)
        .eq('id', student_id);

      if (profError) {
        await supabase.from('student_profiles').insert({
          id: student_id,
          onboarding_step: profStep,
          account_enabled: plan === 'trial',
          full_name: data.full_name || '',
        });
      }

      // Record payment history
      if (plan !== 'later') {
        await supabase.from('payment_history').insert({
          student_id,
          event_type: 'subscription_created',
          amount_usd: plan === 'discount' ? 7.50 : 0,
          payment_method: method || 'none',
          notes: plan === 'trial' ? 'Prueba gratis 7 días' : 'Plan 50% OFF - pendiente de aprobación',
          created_by: 'student',
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: save_level ──────────────────────────────────────
    if (action === 'save_level') {
      const { level, source } = data;

      // 1. Leer el perfil actual para NO sobreescribir account_enabled
      const { data: currentProfile } = await supabase
        .from('student_profiles')
        .select('account_enabled')
        .eq('id', student_id)
        .maybeSingle();

      const profileUpdate: Record<string, unknown> = {
        english_level: level,
        level_source: source,
        level_set_at: new Date().toISOString(),
        onboarding_step: 'completed',
        updated_at: new Date().toISOString(),
      };

      // Preservar account_enabled si ya estaba habilitado
      if (currentProfile?.account_enabled === true) {
        profileUpdate.account_enabled = true;
      }

      const { error } = await supabase
        .from('student_profiles')
        .update(profileUpdate)
        .eq('id', student_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. ── HABILITAR MÓDULOS según el nivel elegido ──────────────
      // Solo si el estudiante ya tiene cuenta habilitada (plan activo pagado)
      if (currentProfile?.account_enabled === true) {
        // Primero deshabilitar todo acceso anterior
        await supabase
          .from('student_module_access')
          .update({ is_active: false })
          .eq('student_id', student_id);

        // Buscar cursos que corresponden a este nivel
        const { data: levelCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('level', level)
          .eq('is_published', true);

        if (levelCourses && levelCourses.length > 0) {
          for (const course of levelCourses) {
            await supabase
              .from('student_module_access')
              .upsert(
                {
                  student_id,
                  course_id: course.id,
                  is_active: true,
                  granted_at: new Date().toISOString(),
                },
                { onConflict: 'student_id,course_id' }
              );
          }
        } else {
          // Si no hay cursos para ese nivel específico, habilitar todos los publicados
          const { data: allCourses } = await supabase
            .from('courses')
            .select('id')
            .eq('is_published', true);

          if (allCourses && allCourses.length > 0) {
            for (const course of allCourses) {
              await supabase
                .from('student_module_access')
                .upsert(
                  {
                    student_id,
                    course_id: course.id,
                    is_active: true,
                    granted_at: new Date().toISOString(),
                  },
                  { onConflict: 'student_id,course_id' }
                );
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: cancel_subscription ────────────────────────────
    if (action === 'cancel_subscription') {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', account_enabled: false })
        .eq('student_id', student_id);

      await supabase
        .from('student_profiles')
        .update({ account_enabled: false, onboarding_step: 'cancelled' })
        .eq('id', student_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

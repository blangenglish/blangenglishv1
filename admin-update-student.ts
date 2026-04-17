import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const action = body.action as string | undefined;

    // ── ACTION: list_all_students ──
    if (action === 'list_all_students') {
      const { data: profiles, error: profErr } = await supabaseAdmin
        .from('student_profiles')
        .select('*')
        .neq('is_admin_only', true)
        .order('created_at', { ascending: false });

      if (profErr) {
        return new Response(JSON.stringify({ success: false, error: profErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ success: true, students: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const studentIds = profiles.map((p: Record<string, unknown>) => p.id as string);

      let subscriptions: Record<string, unknown>[] = [];
      try {
        const { data } = await supabaseAdmin.from('subscriptions').select('*').in('student_id', studentIds);
        subscriptions = (data || []) as Record<string, unknown>[];
      } catch (_) { /* ignorar */ }

      let progress: Record<string, unknown>[] = [];
      try {
        const { data } = await supabaseAdmin.from('student_progress').select('*').in('student_id', studentIds);
        progress = (data || []) as Record<string, unknown>[];
      } catch (_) { /* ignorar */ }

      let unitCompletions: Record<string, unknown>[] = [];
      try {
        const { data } = await supabaseAdmin.from('unit_progress').select('student_id').in('student_id', studentIds).eq('completed', true);
        unitCompletions = (data || []) as Record<string, unknown>[];
      } catch (_) { /* ignorar */ }

      const emailMap: Record<string, string> = {};
      try {
        let page = 1;
        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error || !data?.users?.length) break;
          for (const u of data.users) {
            if (studentIds.includes(u.id) && u.email) emailMap[u.id] = u.email;
          }
          if (data.users.length < 1000) break;
          page++;
        }
      } catch (_) { /* ignorar */ }

      const unitCountMap: Record<string, number> = {};
      for (const uc of unitCompletions) {
        const sid = uc.student_id as string;
        unitCountMap[sid] = (unitCountMap[sid] || 0) + 1;
      }
      const subMap: Record<string, Record<string, unknown>> = {};
      for (const s of subscriptions) { subMap[s.student_id as string] = s; }
      const progMap: Record<string, unknown[]> = {};
      for (const p of progress) {
        const sid = p.student_id as string;
        if (!progMap[sid]) progMap[sid] = [];
        progMap[sid].push(p);
      }

      const merged = profiles.map((p: Record<string, unknown>) => {
        const pid = p.id as string;
        const sub = subMap[pid];
        const accountEnabled = sub !== undefined ? (sub.account_enabled as boolean | null) : (p.account_enabled as boolean | null);
        return {
          ...p,
          email: emailMap[pid] || null,
          account_enabled: accountEnabled,
          subscription: sub || null,
          progress: progMap[pid] || [],
          unit_completions_count: unitCountMap[pid] || 0,
        };
      });

      return new Response(JSON.stringify({ success: true, students: merged }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: update_student ── (editar datos personales, email, estado)
    if (action === 'update_student') {
      const {
        student_id,
        new_full_name, new_email, new_status, new_english_level,
        new_phone, new_country, new_city, new_birthday, new_current_level,
        account_enabled, approved_by_admin
      } = body;

      if (!student_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Actualizar student_profiles
      const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (new_full_name !== undefined) profileUpdate.full_name = new_full_name;
      if (new_english_level !== undefined) profileUpdate.english_level = new_english_level || null;
      if (new_current_level !== undefined) profileUpdate.current_level = new_current_level;
      if (new_phone !== undefined) profileUpdate.phone = new_phone;
      if (new_country !== undefined) profileUpdate.country = new_country;
      if (new_city !== undefined) profileUpdate.city = new_city;
      if (new_birthday !== undefined) profileUpdate.birthday = new_birthday || null;
      if (account_enabled !== undefined) profileUpdate.account_enabled = account_enabled;

      await supabaseAdmin.from('student_profiles').update(profileUpdate).eq('id', student_id);

      // Actualizar subscriptions si aplica
      if (new_status !== undefined || approved_by_admin !== undefined || account_enabled !== undefined) {
        const subUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (new_status !== undefined) subUpdate.status = new_status;
        if (approved_by_admin !== undefined) subUpdate.approved_by_admin = approved_by_admin;
        if (account_enabled !== undefined) subUpdate.account_enabled = account_enabled;
        await supabaseAdmin.from('subscriptions').update(subUpdate).eq('student_id', student_id);
      }

      // Actualizar email en auth.users
      if (new_email) {
        await supabaseAdmin.auth.admin.updateUserById(student_id, { email: new_email });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: set_onboarding_step ──
    if (action === 'set_onboarding_step') {
      const { student_id, onboarding_step, english_level } = body;
      if (!student_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const profileUpdate: Record<string, unknown> = {
        onboarding_step,
        updated_at: new Date().toISOString(),
      };
      if (english_level !== undefined) profileUpdate.english_level = english_level;
      await supabaseAdmin.from('student_profiles').update(profileUpdate).eq('id', student_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: delete_student / delete_account ──
    if (action === 'delete_student' || action === 'delete_account') {
      const { student_id } = body;
      if (!student_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      await supabaseAdmin.from('student_module_access').delete().eq('student_id', student_id);
      await supabaseAdmin.from('payment_history').delete().eq('student_id', student_id);
      await supabaseAdmin.from('subscriptions').delete().eq('student_id', student_id);
      await supabaseAdmin.from('unit_progress').delete().eq('student_id', student_id);
      await supabaseAdmin.from('student_profiles').delete().eq('id', student_id);
      await supabaseAdmin.auth.admin.deleteUser(student_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: set_free_account ──
    if (action === 'set_free_account') {
      const { student_id, free } = body;
      if (!student_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (free) {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 50);
        await supabaseAdmin.from('subscriptions').delete().eq('student_id', student_id);
        await supabaseAdmin.from('subscriptions').insert({
          student_id,
          plan_slug: 'free_admin',
          plan_name: 'Acceso Gratuito (Admin)',
          status: 'active',
          amount_usd: 0,
          payment_method: 'none',
          approved_by_admin: true,
          account_enabled: true,
          current_period_end: farFuture.toISOString(),
        });
        await supabaseAdmin.from('student_profiles').update({ account_enabled: true }).eq('id', student_id);
      } else {
        await supabaseAdmin.from('subscriptions').delete().eq('student_id', student_id);
        await supabaseAdmin.from('student_profiles').update({ account_enabled: false }).eq('id', student_id);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: activate_plan ──
    if (action === 'activate_plan') {
      const { student_id: ap_id, plan_slug, plan_name, amount_usd, payment_method, level, activation_date } = body;
      if (!ap_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const startDate = activation_date ? new Date(activation_date) : new Date();
      const periodEnd = new Date(startDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const isNinguna = level === 'Ninguna';
      const isTodas   = level === 'Todas';

      // Determinar el english_level a guardar
      let englishLevelToSave: string | null = null;
      if (!isNinguna && !isTodas) {
        englishLevelToSave = level; // e.g. 'A1', 'A2', etc.
      }
      // Si es 'Todas', no asignamos nivel específico pero habilitamos todo

      // Upsert subscription
      await supabaseAdmin.from('subscriptions').upsert({
        student_id: ap_id,
        plan_slug: plan_slug || 'monthly',
        plan_name: plan_name || 'Plan Mensual',
        status: isNinguna ? 'trial' : 'active',
        amount_usd: amount_usd || 0,
        payment_method: payment_method || 'manual',
        approved_by_admin: !isNinguna,
        account_enabled: !isNinguna,
        current_period_start: startDate.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });

      // Update student_profiles
      await supabaseAdmin.from('student_profiles').update({
        account_enabled: !isNinguna,
        english_level: englishLevelToSave,
        onboarding_step: isNinguna ? 'exam' : 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', ap_id);

      // Insert payment history
      await supabaseAdmin.from('payment_history').insert({
        student_id: ap_id,
        event_type: 'plan_activated',
        amount_usd: amount_usd || 0,
        payment_method: payment_method || 'manual',
        notes: `Plan activado por admin: ${plan_name || plan_slug || 'Plan Mensual'}. Nivel: ${level}`,
        created_by: 'admin',
      });

      // Si level === 'Todas', otorgar acceso a todos los cursos publicados
      if (isTodas) {
        const { data: allCourses } = await supabaseAdmin
          .from('courses')
          .select('id')
          .eq('is_published', true);
        if (allCourses) {
          for (const c of (allCourses as Record<string, unknown>[])) {
            await supabaseAdmin.from('student_module_access').upsert(
              {
                student_id: ap_id,
                course_id: c.id as string,
                is_active: true,
                granted_at: new Date().toISOString(),
              },
              { onConflict: 'student_id,course_id' }
            );
          }
        }
      } else if (!isNinguna && englishLevelToSave) {
        // Si nivel específico (A1, A2...), otorgar acceso solo a cursos de ese nivel
        const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const levelIdx = LEVEL_ORDER.indexOf(englishLevelToSave);
        const { data: levelCourses } = await supabaseAdmin
          .from('courses')
          .select('id, level, required_level')
          .eq('is_published', true);
        if (levelCourses) {
          for (const c of (levelCourses as Record<string, unknown>[])) {
            const cLevel = (c.required_level || c.level) as string;
            const cIdx = LEVEL_ORDER.indexOf(cLevel);
            if (cIdx <= levelIdx) {
              await supabaseAdmin.from('student_module_access').upsert(
                {
                  student_id: ap_id,
                  course_id: c.id as string,
                  is_active: true,
                  granted_at: new Date().toISOString(),
                },
                { onConflict: 'student_id,course_id' }
              );
            }
          }
        }
      }

      // Retornar la subscription actualizada
      const { data: updatedSub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('student_id', ap_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({ success: true, subscription: updatedSub }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: toggle_account_enabled ──
    if (action === 'toggle_account_enabled') {
      const { student_id: tog_id, enabled } = body;
      if (!tog_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      await supabaseAdmin.from('subscriptions').update({ account_enabled: enabled }).eq('student_id', tog_id);
      await supabaseAdmin.from('student_profiles').update({ account_enabled: enabled }).eq('id', tog_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── ACTION: approve_payment ──
    if (action === 'approve_payment') {
      const { student_id: ap2_id } = body;
      if (!ap2_id) {
        return new Response(JSON.stringify({ success: false, error: 'student_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      await supabaseAdmin.from('subscriptions').update({
        approved_by_admin: true,
        account_enabled: true,
        status: 'active',
      }).eq('student_id', ap2_id);
      await supabaseAdmin.from('student_profiles').update({
        account_enabled: true,
      }).eq('id', ap2_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── MODULE ACCESS ──
    const moduleAccess = body.module_access as Record<string, unknown> | undefined;
    const studentIdForModule = body.student_id as string | undefined;

    if (moduleAccess && studentIdForModule) {
      const modAction = moduleAccess.action as string;
      const courseId  = moduleAccess.course_id as string | undefined;
      const unitId    = moduleAccess.unit_id as string | undefined;

      if (modAction === 'grant_all_courses') {
        const { data: allCourses } = await supabaseAdmin.from('courses').select('id').eq('is_published', true);
        if (allCourses) {
          for (const c of (allCourses as Record<string, unknown>[])) {
            await supabaseAdmin.from('student_module_access').upsert(
              { student_id: studentIdForModule, course_id: c.id as string, is_active: true, granted_at: new Date().toISOString() },
              { onConflict: 'student_id,course_id' }
            );
          }
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (modAction === 'revoke_all_courses') {
        await supabaseAdmin.from('student_module_access')
          .update({ is_active: false })
          .eq('student_id', studentIdForModule);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (modAction === 'grant' && courseId) {
        if (unitId) {
          await supabaseAdmin.from('student_module_access').upsert(
            { student_id: studentIdForModule, course_id: courseId, unit_id: unitId, is_active: true, granted_at: new Date().toISOString() },
            { onConflict: 'student_id,course_id,unit_id' }
          );
        } else {
          await supabaseAdmin.from('student_module_access').upsert(
            { student_id: studentIdForModule, course_id: courseId, is_active: true, granted_at: new Date().toISOString() },
            { onConflict: 'student_id,course_id' }
          );
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (modAction === 'revoke' && courseId) {
        if (unitId) {
          await supabaseAdmin.from('student_module_access')
            .update({ is_active: false })
            .eq('student_id', studentIdForModule)
            .eq('course_id', courseId)
            .eq('unit_id', unitId);
        } else {
          await supabaseAdmin.from('student_module_access')
            .upsert(
              { student_id: studentIdForModule, course_id: courseId, is_active: false, granted_at: new Date().toISOString() },
              { onConflict: 'student_id,course_id' }
            );
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── get_student_emails ──
    if (action === 'get_student_emails') {
      const { student_ids } = body;
      const emailMap: Record<string, string> = {};
      let page = 1;
      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users?.length) break;
        for (const u of data.users) {
          if (student_ids.includes(u.id) && u.email) emailMap[u.id] = u.email;
        }
        if (data.users.length < 1000) break;
        page++;
      }
      return new Response(JSON.stringify({ success: true, emails: emailMap }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: `unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('admin-update-student error:', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

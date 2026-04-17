
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

function getFromEmail(): string {
  const domain = Deno.env.get('RESEND_DOMAIN');
  if (domain) return `BLANG Academy <noreply@${domain}>`;
  return 'BLANG Academy <onboarding@resend.dev>';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const ADMIN_EMAIL = 'blangenglishlearning@blangenglish.com';

    if (type === 'session_request') {
      const {
        studentName,
        studentEmail,
        sessions,
        weekly,
        weeklyHours,
        weeklySchedule,
        objective,
      } = body;

      // Build sessions list HTML
      const sessionsHtml = Array.isArray(sessions) && sessions.length > 0
        ? sessions
            .filter((s: { date?: string; topic?: string }) => s.date || s.topic)
            .map(
              (s: { date?: string; topic?: string }, i: number) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#6d28d9;">${i + 1}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.date || '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.topic || '—'}</td>
              </tr>`
            )
            .join('')
        : '<tr><td colspan="3" style="padding:12px;color:#9ca3af;">Sin fechas específicas</td></tr>';

      const weeklySection = weekly
        ? `
        <div style="margin-top:20px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;">
          <p style="margin:0 0 8px;font-weight:700;color:#7c3aed;">📅 Plan Semanal Personalizado</p>
          <p style="margin:0;font-size:14px;color:#374151;"><strong>Horas por semana:</strong> ${weeklyHours || 'No especificado'}</p>
          <p style="margin:8px 0 0;font-size:14px;color:#374151;"><strong>Disponibilidad:</strong></p>
          <p style="margin:4px 0 0;font-size:14px;color:#374151;background:#f3e8ff;padding:10px;border-radius:8px;">${weeklySchedule || 'No especificado'}</p>
        </div>`
        : '';

      const objectiveSection = objective
        ? `
        <div style="margin-top:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
          <p style="margin:0 0 8px;font-weight:700;color:#16a34a;">🎯 Objetivo del estudiante</p>
          <p style="margin:0;font-size:14px;color:#374151;">${objective}</p>
        </div>`
        : '';

      const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">🎓 Nueva Solicitud de Sesión</h1>
      <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Un estudiante quiere reservar clases contigo</p>
    </div>

    <div style="padding:32px;">

      <!-- Student info -->
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#7c3aed;font-weight:700;">👤 Estudiante</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#1f2937;">${studentName || 'Sin nombre'}</p>
        <p style="margin:6px 0 0;font-size:14px;color:#6b7280;">📧 ${studentEmail || 'Sin correo'}</p>
      </div>

      <!-- Sessions table -->
      <h3 style="margin:0 0 12px;color:#374151;font-size:16px;">📅 Fechas y Temas Solicitados</h3>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0;">
        <thead>
          <tr style="background:#f5f3ff;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#7c3aed;">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#7c3aed;">📅 Fecha</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#7c3aed;">📚 Tema</th>
          </tr>
        </thead>
        <tbody>${sessionsHtml}</tbody>
      </table>

      ${objectiveSection}
      ${weeklySection}

      <!-- CTA -->
      <div style="margin-top:28px;padding:20px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;text-align:center;">
        <p style="margin:0 0 4px;font-weight:700;color:#0369a1;">⚡ Acción requerida</p>
        <p style="margin:0;font-size:14px;color:#374151;">Responde a <strong>${studentEmail}</strong> para confirmar la sesión y coordinar el pago.</p>
      </div>

      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        Este correo fue generado automáticamente por la plataforma BLANG Academy.<br>
        © 2026 BLANG English Learning
      </p>
    </div>
  </div>
</body>
</html>`;

      const emailText = `Nueva Solicitud de Sesión — BLANG Academy
      
Estudiante: ${studentName}
Correo: ${studentEmail}

Fechas solicitadas:
${(sessions || []).map((s: { date?: string; topic?: string }, i: number) => `${i + 1}. ${s.date || '—'} — ${s.topic || '—'}`).join('\n')}

${objective ? `Objetivo: ${objective}` : ''}
${weekly ? `Plan semanal: ${weeklyHours} horas/semana. Disponibilidad: ${weeklySchedule}` : ''}

Responde a ${studentEmail} para confirmar.`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: getFromEmail(),
          to: ADMIN_EMAIL,
          reply_to: studentEmail,
          subject: `🎓 Nueva sesión — ${studentName} · BLANG Academy`,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${res.status} ${err}`);
      }

      const result = await res.json();
      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'welcome') {
      // Welcome email to the student
      const { name, email: toEmail } = body;

      const welcomeHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">🚀 ¡Bienvenido/a a BLANG!</h1>
      <p style="margin:10px 0 0;color:#e9d5ff;font-size:15px;">Tu aventura en inglés empieza hoy</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#374151;">Hola <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;">
        Estamos muy felices de que te hayas unido a nuestra comunidad. Tienes <strong>7 días de prueba gratis</strong> para explorar todos los cursos.
      </p>
      <div style="background:#faf5ff;border-radius:14px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 10px;font-weight:700;color:#7c3aed;">🎯 ¿Qué puedes hacer?</p>
        <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
          <li>Acceder a cursos por nivel (A1 → C1)</li>
          <li>Practicar con inteligencia artificial</li>
          <li>Reservar sesiones 1 a 1 con el profesor</li>
          <li>Seguir tu progreso en tiempo real</li>
        </ul>
      </div>
      <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px;">© 2026 BLANG English Learning</p>
    </div>
  </div>
</body>
</html>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: getFromEmail(),
          to: toEmail,
          subject: '🚀 ¡Bienvenido/a a BLANG Academy!',
          html: welcomeHtml,
          text: `Hola ${name}, bienvenido/a a BLANG Academy. Tienes 7 días de prueba gratis. Ingresa a tu cuenta y comienza hoy.`,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${res.status} ${err}`);
      }

      const result = await res.json();
      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown email type: ${type}`);

  } catch (err: unknown) {
    console.error('send-session-email error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

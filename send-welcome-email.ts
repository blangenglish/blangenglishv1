
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { type, name, email } = await req.json();
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const ADMIN_EMAIL = 'blangenglishlearning@blangenglish.com';

    let subject = '';
    let html = '';

    if (type === 'welcome') {
      subject = `¡Bienvenido/a a BLANG, ${name}! 🎉 Empieza a aprender inglés hoy`;
      html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.1);">
        <!-- Header gradient -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);padding:40px 40px 30px;text-align:center;">
          <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin:0;letter-spacing:-0.5px;">BLANG</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">English Academy</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1a2e;font-size:24px;font-weight:800;margin:0 0 12px;">¡Hola, ${name}! 👋</h2>
          <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 20px;">
            ¡Bienvenido/a a <strong style="color:#7c3aed;">BLANG English Academy</strong>! 🚀<br>
            Estamos felices de tenerte aquí. Tu cuenta ha sido creada exitosamente y tienes <strong>7 días de prueba gratis</strong> para explorar todo.
          </p>
          <!-- Benefits box -->
          <div style="background:#f5f3ff;border-radius:16px;padding:24px;margin:24px 0;">
            <p style="color:#7c3aed;font-weight:700;font-size:15px;margin:0 0 14px;">🎯 Lo que puedes hacer ahora:</p>
            <table width="100%">
              ${[
                ['📚', 'Explora los 5 cursos, del A1 al C1'],
                ['🧠', 'Metodología intuitiva — una unidad por semana'],
                ['🤖', 'Practica con inteligencia artificial'],
                ['🎥', 'Reserva sesiones en vivo con nuestros profes'],
                ['📈', 'Sigue tu progreso en tiempo real'],
              ].map(([emoji, text]) => `
              <tr><td style="padding:4px 0;">
                <span style="font-size:20px;">${emoji}</span>
                <span style="color:#374151;font-size:14px;margin-left:10px;">${text}</span>
              </td></tr>`).join('')}
            </table>
          </div>
          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0;">
            <a href="https://blangenglishacademy.com/#/mi-cuenta"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(124,58,237,0.35);">
              ¡Comenzar a aprender! 🚀
            </a>
          </div>
          <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0;text-align:center;">
            ¿Tienes alguna pregunta? Escríbenos a<br>
            <a href="mailto:blangenglishlearning@blangenglish.com" style="color:#7c3aed;">${ADMIN_EMAIL}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f7ff;padding:20px 40px;text-align:center;border-top:1px solid #ede9fe;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            © 2026 BLANG English Academy · Diseñado para hispanohablantes 🌎<br>
            <a href="#" style="color:#9ca3af;">Términos de Servicio</a> · <a href="#" style="color:#9ca3af;">Política de Privacidad</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      // Also notify admin
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: ADMIN_EMAIL,
            subject: `[BLANG] Nuevo estudiante registrado: ${name}`,
            html: `<p>Nuevo estudiante: <strong>${name}</strong> (${email}) se registró en BLANG English Academy.</p>`,
          }),
        });
      }

    } else if (type === 'plan_selected') {
      const { plan } = await req.json().catch(() => ({ plan: 'Plan Mensual' }));
      subject = `¡Tu plan en BLANG está activo, ${name}! ✅`;
      html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.1);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;">BLANG</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1a2e;margin:0 0 12px;">¡Tu plan está activo! 🎊</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;">
            Hola <strong>${name}</strong>, tu <strong style="color:#7c3aed;">${plan}</strong> ha sido activado exitosamente.<br>
            Ya tienes acceso completo a todos los cursos de BLANG.
          </p>
          <div style="background:#f5f3ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:#7c3aed;font-weight:700;margin:0 0 8px;">📧 Recibirás el link de pago a este correo</p>
            <p style="color:#555;font-size:14px;margin:0;">Una vez confirmado el pago, tu suscripción quedará activa.</p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="https://blangenglishacademy.com/#/mi-cuenta"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;">
              Ir a mis cursos →
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    if (!RESEND_API_KEY) {
      console.log('No RESEND_API_KEY. Would send to:', email, '| Subject:', subject);
      return new Response(JSON.stringify({ success: true, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'onboarding@resend.dev', to: email, subject, html }),
    });

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
    const result = await res.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

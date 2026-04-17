
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const body = await req.json();
    const { type, ...data } = body;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const TO_EMAIL = 'blangenglishlearning@blangenglish.com';

    let subject = '';
    let html = '';

    if (type === 'faq_contact') {
      const { name, email, subject: asunto, category, message } = data;
      subject = `[BLANG] ${category}: ${asunto}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">📬 Nuevo mensaje desde la sección FAQ/Contacto</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Tipo:</td><td style="padding:8px;">${category}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Asunto:</td><td style="padding:8px;">${asunto}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Nombre:</td><td style="padding:8px;">${name}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Correo:</td><td style="padding:8px;">${email}</td></tr>
          </table>
          <h3 style="color:#7c3aed;">Mensaje:</h3>
          <div style="background:#f5f3ff; border-left:4px solid #7c3aed; padding:16px; border-radius:8px;">
            ${message}
          </div>
          <hr style="margin:24px 0; border-color:#e5e7eb;" />
          <p style="color:#9ca3af; font-size:12px;">BLANG English Academy — blangenglishlearning@blangenglish.com</p>
        </div>
      `;
    } else if (type === 'booking') {
      const { name, lastName, email, phone, slots, totalUSD } = data;
      const slotsHtml = (slots as Array<{date:string;time:string;topic:string}>).map((s, i) =>
        `<tr>
          <td style="padding:6px; font-weight:bold; color:#555;">Sesión ${i+1}:</td>
          <td style="padding:6px;">${s.date} a las ${s.time} — Tema: ${s.topic}</td>
        </tr>`
      ).join('');

      subject = `[BLANG] Reserva de sesión — ${name} ${lastName}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">📅 Nueva reserva de sesión en vivo</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Nombre:</td><td style="padding:8px;">${name} ${lastName}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Correo:</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Teléfono:</td><td style="padding:8px;">${phone}</td></tr>
            <tr><td style="padding:8px; font-weight:bold; color:#555;">Total:</td><td style="padding:8px; color:#7c3aed; font-weight:bold;">$${totalUSD} USD</td></tr>
          </table>
          <h3 style="color:#7c3aed;">Sesiones solicitadas:</h3>
          <table style="width:100%; border-collapse:collapse; background:#f5f3ff; border-radius:8px;">
            ${slotsHtml}
          </table>
          <hr style="margin:24px 0; border-color:#e5e7eb;" />
          <p style="color:#9ca3af; font-size:12px;">BLANG English Academy — blangenglishlearning@blangenglish.com</p>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Unknown type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!RESEND_API_KEY) {
      console.log('No RESEND_API_KEY found. Email would be:', { to: TO_EMAIL, subject });
      return new Response(JSON.stringify({ success: true, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: TO_EMAIL,
        reply_to: data.email || undefined,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

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

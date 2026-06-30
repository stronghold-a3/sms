export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Sends client update / change notification emails via SendGrid.
// Accepts { to: string|string[], subject: string, message: string, clientName?: string, site?: string }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, message, clientName, site } = await req.json();
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: '"to", "subject" and "message" are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SendGrid API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const recipients: string[] = Array.isArray(to) ? to : [to];

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#0b1220;color:#e8edf5;border-radius:16px;overflow:hidden;border:1px solid #1c2740">
        <div style="background:#003a7a;padding:20px 24px">
          <h1 style="margin:0;color:#d4af37;font-size:18px;letter-spacing:1px">STRONGHOLD A3 SECURITY</h1>
          <p style="margin:4px 0 0;color:#9fb3d1;font-size:12px">Client Transparency Notification</p>
        </div>
        <div style="padding:24px">
          ${clientName ? `<p style="margin:0 0 8px;color:#9fb3d1;font-size:13px">Dear ${clientName},</p>` : ''}
          ${site ? `<p style="margin:0 0 12px;color:#d4af37;font-size:13px;font-weight:bold">Site: ${site}</p>` : ''}
          <p style="margin:0;line-height:1.6;font-size:14px;white-space:pre-line">${message}</p>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1c2740;color:#6f829e;font-size:11px">
          Stronghold A3 Security Agency &middot; Tacloban City &middot; RA 10173 (DPA) compliant<br/>
          This is an automated operational notification. Reply for assistance.
        </div>
      </div>`;

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: recipients.map((email) => ({ to: [{ email }] })),
        from: { email: 'noreply@strongholda3.com', name: 'Stronghold A3 Security' },
        subject,
        content: [
          { type: 'text/plain', value: message },
          { type: 'text/html', value: html }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('SendGrid error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: recipients.length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('email-notifications error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

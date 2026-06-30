export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Sends SMS via Twilio. Accepts { to: string | string[], body: string }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, body } = await req.json();
    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'Both "to" and "body" are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    // Stronghold A3 Twilio sending number (Southington, CT)
    const fromNumber = '+18603294645';

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: 'Twilio credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const recipients: string[] = Array.isArray(to) ? to : [to];
    const auth = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const results = [];
    for (const recipient of recipients) {
      const form = new URLSearchParams();
      form.append('To', recipient);
      form.append('From', fromNumber);
      form.append('Body', body);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      const data = await resp.json();
      results.push({ to: recipient, ok: resp.ok, sid: data.sid ?? null, error: resp.ok ? null : (data.message ?? 'send failed') });
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ sent, total: recipients.length, results }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('send-sms error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

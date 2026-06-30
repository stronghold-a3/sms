export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/*
 * SMS AI Assistant for Stronghold A3 Security Management System.
 * Powered by OpenAI (via Famous API Gateway).
 *
 * Body: {
 *   messages?: {role, content}[],   // chat history
 *   prompt?: string,                // single user message (alt to messages)
 *   context?: string,               // optional ops/site context
 *   sendTo?: string                 // optional phone — texts the AI reply via Twilio
 * }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, prompt, context, sendTo } = await req.json();

    const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY');
    if (!gatewayApiKey) {
      return new Response(JSON.stringify({ error: 'AI gateway key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const systemPrompt = `You are the Stronghold A3 SMS Assistant — an AI operations aide for a Philippine private security agency based in Tacloban City, Eastern Visayas.
You help supervisors, ops managers and admins draft clear, concise, professional communications and answer operational questions.
You are an expert in: guard deployment, patrol/QR checkpoint tours, DTR & DOLE D.O. 174 payroll rules, RA 5487 (private security law), RA 10173 (Data Privacy Act), RA 10121 (DRRM / typhoon protocols), incident reporting, and client transparency.
Keep replies short, calm and actionable. When drafting an SMS broadcast, keep it under 320 characters and start with a clear severity tag (e.g. RED ALERT, ADVISORY, INFO).${context ? `\n\nCurrent operational context:\n${context}` : ''}`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(messages) && messages.length
        ? messages
        : [{ role: 'user', content: prompt || 'Hello' }])
    ];

    const aiResp = await fetch('https://ai.gateway.fastrouter.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': gatewayApiKey
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: chatMessages,
        temperature: 0.5
      })
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('AI gateway error:', errText);
      return new Response(JSON.stringify({ error: 'AI request failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const aiData = await aiResp.json();
    const reply = aiData?.choices?.[0]?.message?.content ?? 'No response generated.';

    // Optionally text the reply
    let smsResult: unknown = null;
    if (sendTo) {
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      if (accountSid && authToken) {
        const form = new URLSearchParams();
        form.append('To', sendTo);
        form.append('From', '+18603294645');
        form.append('Body', reply.slice(0, 1500));
        const smsResp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: form.toString()
          }
        );
        const sd = await smsResp.json();
        smsResult = { ok: smsResp.ok, sid: sd.sid ?? null };
      }
    }

    return new Response(JSON.stringify({ reply, sms: smsResult }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('sms-ai-assistant error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});

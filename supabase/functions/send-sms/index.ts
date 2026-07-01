// ============================================================
// Stronghold A3 SMS — send-sms
// Edge Function (Deno / Supabase)
// ============================================================
//
// PURPOSE
// Sends a real SMS via Twilio. This is "Bridge 2" of the 3-Bridge
// communication architecture — the fallback channel guards and Ops
// rely on when data connectivity is down but the cellular network
// (voice/SMS) still works, which is the common failure mode during
// Tacloban-area typhoons.
//
// Called directly from the authenticated frontend (BroadcastModal.tsx)
// — NOT from cron — so this function authenticates the CALLER's
// Supabase session JWT rather than a static cron secret, and re-checks
// their role server-side before allowing dispatch. Trusting a client-
// supplied "I'm an Ops Manager" flag would let any authenticated guard
// account mass-broadcast SMS to the whole roster.
//
// REQUEST CONTRACT (must match BroadcastModal.tsx exactly):
//   POST body: { to: string, body: string }
//   Response:  { sent: number, results: [{ to, sid?, error? }] }
//
// ENV VARS REQUIRED:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — to verify caller's role
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SCHEMA = 'prj_K9i_UT3iT5Ot'
const ALLOWED_ROLES = ['admin', 'ops', 'supervisor']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Very permissive E.164-ish check — Twilio itself does the real
// validation, this just rejects obviously malformed input early so we
// don't burn a Twilio API call (and its cost) on a typo'd number.
function looksLikePhoneNumber(value: string): boolean {
  return /^\+?[0-9][0-9\s-]{6,17}$/.test(value.trim())
}

async function sendViaTwilio(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio is not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER).')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = btoa(`${accountSid}:${authToken}`)

  const formBody = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  })

  const payload = await res.json()

  if (!res.ok) {
    // Twilio's error payloads carry a human-readable `message` field.
    throw new Error(payload?.message ?? `Twilio request failed with status ${res.status}`)
  }

  return payload // contains .sid, .status, etc.
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized: missing bearer token.' }, 401)
    }
    const callerJwt = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'Server misconfiguration: missing Supabase env vars.' }, 500)
    }

    // Service-role client used only to (a) resolve the calling user from
    // their JWT and (b) look up their role — never to act on their
    // behalf beyond that authorization check.
    const adminClient = createClient(supabaseUrl, serviceKey, { db: { schema: SCHEMA } })

    const { data: userData, error: userError } = await adminClient.auth.getUser(callerJwt)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized: invalid session.' }, 401)
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile) {
      return jsonResponse({ error: 'Unauthorized: profile not found.' }, 403)
    }

    if (!ALLOWED_ROLES.includes(profile.role)) {
      return jsonResponse({ error: `Forbidden: role '${profile.role}' cannot send broadcast SMS.` }, 403)
    }

    // ---- Parse + validate request body ----
    const body = await req.json().catch(() => null)
    if (!body || typeof body.to !== 'string' || typeof body.body !== 'string') {
      return jsonResponse({ error: "Request body must be { to: string, body: string }." }, 400)
    }

    const to = body.to.trim()
    const message = body.body.trim()

    if (!message) {
      return jsonResponse({ error: 'Message body cannot be empty.' }, 400)
    }
    if (message.length > 1600) {
      // Twilio splits/concatenates beyond 160 chars automatically, but
      // cap at a sane upper bound to avoid runaway costs from a bad input.
      return jsonResponse({ error: 'Message exceeds 1600 character limit.' }, 400)
    }
    if (!looksLikePhoneNumber(to)) {
      return jsonResponse({
        sent: 0,
        results: [{ to, error: 'Invalid phone number format. Use E.164, e.g. +639171234567.' }],
      })
    }

    // ---- Dispatch via Twilio ----
    try {
      const twilioResult = await sendViaTwilio(to, message)
      return jsonResponse({
        sent: 1,
        results: [{ to, sid: twilioResult.sid, status: twilioResult.status }],
      })
    } catch (twilioErr) {
      console.error('send-sms: Twilio dispatch failed:', twilioErr)
      return jsonResponse({
        sent: 0,
        results: [{ to, error: (twilioErr as Error).message }],
      })
    }
  } catch (error) {
    console.error('send-sms failed:', error)
    return jsonResponse({ error: (error as Error).message ?? String(error) }, 500)
  }
})

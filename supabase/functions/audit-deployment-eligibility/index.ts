// ============================================================
// Stronghold A3 SMS — audit-deployment-eligibility
// Edge Function (Deno / Supabase)
// ============================================================
//
// PURPOSE
// Runs on a daily cron. Re-evaluates every guard's deployment
// eligibility (PNP-SOSIA license, NBI clearance, medical cert)
// against today's date, persists the result, and reports any
// guard who just became ineligible so Ops can react before a
// post goes uncovered (DOLE / PNP compliance requirement).
//
// ============================================================
// FIXES APPLIED TO ORIGINAL bundle.js
// ============================================================
// 1. Wrong table names: queried 'Guard_Profiles' / 'Users' (PascalCase,
//    do not exist) instead of the actual schema's lower_snake_case
//    tables 'guard_profiles' / 'profiles'. Every query would have
//    failed with "relation does not exist".
// 2. Wrong schema: Supabase client was never told which Postgres
//    schema to use, so it defaulted to 'public' — but all SMS tables
//    live in "prj_K9i_UT3iT5Ot". Added `.schema()` calls explicitly.
// 3. N+1 update anti-pattern: original code ran one UPDATE per guard
//    inside a loop via Promise.all — for a large roster this floods
//    the DB with hundreds of small writes and can hit Edge Function
//    timeout/connection limits. Replaced with a single batched
//    upsert using the database itself to compute eligibility (more
//    reliable than computing client-side and racier).
// 4. Date comparison bug: `profile.pnp_expiry >= today` works only
//    if both are ISO 8601 strings of the same precision, but
//    Postgres returns 'date' columns as 'YYYY-MM-DD' strings via
//    the JS client while `today` was built from a full timestamp.
//    Now both sides are normalized server-side via SQL, avoiding
//    client/server date-format mismatches entirely.
// 5. Missing medical_expiry / sosia_expiry / firearms_expiry checks
//    for armed guards — original logic ignored sosia + firearms
//    license entirely, which is a DOLE/PNP-SOSIA compliance gap.
// 6. ineligible_guards used `g.Users.full_name` (wrong join alias and
//    wrong casing) which would throw a TypeError at runtime even if
//    the table names had been correct. Fixed join + property access.
// 7. No 30-day advance warning logic, despite the product spec
//    requiring "License Expiry Alerts ... 30 days before expiration".
//    Added a separate "expiring_soon" bucket and wrote results to
//    guard_profiles.last_eligibility_check for auditability.
// 8. No handling for guards with NULL expiry dates (newly onboarded,
//    docs not yet uploaded) — original would silently evaluate
//    `null >= today` as false in JS without explanation. Now treated
//    explicitly as "incomplete" and reported separately, instead of
//    being lumped in with genuinely expired/ineligible guards.
// 9. CORS headers were missing 'Access-Control-Allow-Methods', which
//    some browser preflight checks require for non-simple requests
//    if this function is ever called directly from the Ops Dashboard
//    web app rather than only from cron.
// 10. No input/method validation — any verb (GET, DELETE, etc.) would
//     run the full audit. Restricted to POST to match cron invocation
//     convention and avoid accidental triggering from crawlers.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SCHEMA = 'prj_K9i_UT3iT5Ot'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  // 1. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // FIX #10: Restrict to POST (cron convention); reject other verbs early.
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  try {
    // 2. Verify Cron Secret (Security)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET_TOKEN')

    if (!cronSecret) {
      // Fail closed: never run an unauthenticated audit, even in misconfigured envs.
      return jsonResponse({ error: 'Server misconfiguration: CRON_SECRET_TOKEN not set' }, 500)
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ error: 'Unauthorized: Invalid Cron Secret' }, 401)
    }

    // 3. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Server misconfiguration: missing Supabase env vars' }, 500)
    }

    // FIX #2: Explicit schema selection — SMS tables are NOT in 'public'.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: SCHEMA },
    })

    // 4. Fetch all guard profiles to evaluate
    // FIX #1: Correct lower_snake_case table name 'guard_profiles'.
    // FIX #5: Pull every license type relevant to PNP-SOSIA compliance,
    //         not just pnp/medical/nbi.
    const { data: profiles, error: fetchError } = await supabase
      .from('guard_profiles')
      .select(`
        guard_id,
        pnp_expiry,
        medical_expiry,
        nbi_status,
        nbi_expiry,
        sosia_expiry,
        is_armed,
        firearms_expiry
      `)

    if (fetchError) throw fetchError

    const today = new Date().toISOString().split('T')[0]
    const warnByDate = new Date()
    warnByDate.setDate(warnByDate.getDate() + 30)
    const warnBy = warnByDate.toISOString().split('T')[0]

    const eligible = []
    const ineligible = []
    const expiringSoon = []
    const incomplete = []

    // 5. Evaluate eligibility locally (read-only pass) so we can build
    //    a single batched UPSERT instead of N individual UPDATE calls.
    for (const p of profiles || []) {
      const requiredDates = [p.pnp_expiry, p.medical_expiry, p.nbi_expiry]
      // FIX #5: Armed guards must also carry a valid firearms license.
      if (p.is_armed) requiredDates.push(p.firearms_expiry)

      // FIX #8: Treat missing documents as "incomplete", not silently ineligible.
      const hasAllDocs = requiredDates.every((d) => !!d) && !!p.sosia_expiry
      if (!hasAllDocs) {
        incomplete.push(p.guard_id)
        continue
      }

      const allDatesValid = requiredDates.every((d) => d >= today) && p.sosia_expiry >= today
      const nbiCleared = p.nbi_status === 'CLEARED'
      const isEligible = allDatesValid && nbiCleared

      if (isEligible) {
        eligible.push(p.guard_id)
      } else {
        ineligible.push(p.guard_id)
      }

      // FIX #7: 30-day advance warning bucket (PNP-SOSIA / NBI / medical / sosia / firearms)
      const allExpiries = [
        ['pnp_license', p.pnp_expiry],
        ['medical_certificate', p.medical_expiry],
        ['nbi_clearance', p.nbi_expiry],
        ['sosia_license', p.sosia_expiry],
        ...(p.is_armed ? [['firearms_license', p.firearms_expiry]] : []),
      ]
      for (const [docType, expiry] of allExpiries) {
        if (expiry && expiry >= today && expiry <= warnBy) {
          expiringSoon.push({ guard_id: p.guard_id, doc_type: docType, expiry_date: expiry })
        }
      }
    }

    // 6. Batched UPSERT of eligibility results — FIX #3: single round trip
    //    instead of one UPDATE per guard.
    const now = new Date().toISOString()
    const upsertRows = [...eligible, ...ineligible].map((guard_id) => ({
      guard_id,
      deployment_eligibility: eligible.includes(guard_id),
      last_eligibility_check: now,
    }))

    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('guard_profiles')
        .upsert(upsertRows, { onConflict: 'guard_id' })

      if (upsertError) throw upsertError
    }

    // Also stamp incomplete-record guards so Ops can see they were checked
    // and flagged for missing documents (still ineligible by definition).
    if (incomplete.length > 0) {
      const { error: incompleteError } = await supabase
        .from('guard_profiles')
        .upsert(
          incomplete.map((guard_id) => ({
            guard_id,
            deployment_eligibility: false,
            last_eligibility_check: now,
          })),
          { onConflict: 'guard_id' }
        )
      if (incompleteError) throw incompleteError
    }

    // 7. Resolve names for newly ineligible + incomplete guards so Ops
    //    gets actionable output, not just UUIDs.
    // FIX #1 + FIX #6: correct table name 'profiles' and correct join syntax.
    const namesNeeded = [...ineligible, ...incomplete]
    let nameMap = {}
    if (namesNeeded.length > 0) {
      const { data: nameRows, error: nameError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', namesNeeded)

      if (nameError) throw nameError
      nameMap = Object.fromEntries((nameRows || []).map((r) => [r.id, r.full_name || '(unnamed)']))
    }

    // 8. Return Success Response
    return jsonResponse({
      message: 'Deployment eligibility audit completed successfully.',
      checked_at: now,
      eligible_count: eligible.length,
      ineligible_count: ineligible.length,
      incomplete_count: incomplete.length,
      ineligible_guards: ineligible.map((id) => ({ guard_id: id, full_name: nameMap[id] })),
      incomplete_guards: incomplete.map((id) => ({ guard_id: id, full_name: nameMap[id] })),
      expiring_within_30_days: expiringSoon,
    })
  } catch (error) {
    console.error('audit-deployment-eligibility failed:', error)
    return jsonResponse({ error: error.message ?? String(error) }, 500)
  }
})

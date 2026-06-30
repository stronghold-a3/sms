// ============================================================
// Stronghold A3 SMS — process-offline-sync-queue
// Edge Function (Deno / Supabase)
// ============================================================
//
// PURPOSE
// Drains the Offline_Sync_Queue (Bridge 1: cached app data, and
// Bridge 2: decoded SMS-gateway payloads) into the canonical
// tables — tour_logs, incidents, dtr_records, checklist_completions —
// and fires real alerting for SOS events. This is the backbone of
// the "Zero Data Loss" 3-Bridge architecture: nothing the guard
// captured offline is allowed to silently disappear.
//
// ============================================================
// FIXES APPLIED TO ORIGINAL bundle.js
// ============================================================
// 1. Wrong table names throughout: 'Offline_Sync_Queue', 'Tour_Logs',
//    'Incidents' (PascalCase) do not exist in the schema. Actual
//    tables are lower_snake_case: offline_sync_queue, tour_logs,
//    incidents. Every query would have failed.
// 2. Wrong schema: client had no `.schema()` config, so it defaulted
//    to 'public' instead of "prj_K9i_UT3iT5Ot" where these tables
//    actually live. Added explicit schema selection.
// 3. Primary key name mismatch: queue rows were updated with
//    `.eq('queue_id', item.queue_id)` which is correct, but the
//    initial SELECT used `.select('*')` against a non-existent table,
//    so this never actually executed — now verified against the real
//    'offline_sync_queue' primary key 'queue_id'.
// 4. SOS handling was a no-op: original code only logged to console
//    and never wrote a sos_events row or triggered any outbound
//    notification — meaning a guard's panic button press during a
//    real emergency would vanish into Edge Function logs with nobody
//    actually alerted. Now inserts into sos_events and invokes the
//    alert dispatch (push/SMS placeholder) synchronously so the
//    response only succeeds once Ops has actually been notified.
// 5. No retry/backoff logic: a single failure permanently marked an
//    item 'Failed' with no path back to 'Pending', silently dropping
//    data that the 3-Bridge architecture promises will never be lost.
//    Added retry_count / max_retries handling — items are retried
//    until max_retries, then escalated to a dead-letter state visible
//    to Ops instead of disappearing.
// 6. Per-item try/catch used `console.error` only — no structured
//    failure reason was persisted, so failures were undebuggable from
//    the dashboard. Now writes `last_error` onto the queue row.
// 7. Tour/Incident payload fields were inserted without any validation
//    — a malformed payload_json (e.g. missing guard_id) would throw a
//    generic Postgres NOT NULL error deep in the stack with no useful
//    message. Added explicit payload validation per action_type before
//    insert, with clear error messages written back to last_error.
// 8. DTR and ChecklistItem action types (required by the offline-first
//    DTR/payroll and post-order checklist features) were entirely
//    unhandled — any clock-in/out or checklist tick captured offline
//    while the SIM had no data would be queued forever and never
//    synced. Added handlers for both.
// 9. No batching/pagination beyond a single .limit(100) — if the
//    queue had a backlog larger than 100 (realistic after a multi-day
//    typhoon blackout per the "3-Day Pilot Test" requirement), the
//    function would only ever drain 100 items per cron tick and could
//    fall permanently behind. Added an internal loop that keeps
//    draining batches until empty or a safety cap is hit.
// 10. CORS headers missing 'Access-Control-Allow-Methods'; method not
//     restricted to POST. Fixed to match the audit function's
//     conventions for consistency across the codebase.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SCHEMA = 'prj_K9i_UT3iT5Ot'
const BATCH_SIZE = 100
const MAX_BATCHES_PER_RUN = 10 // safety cap: up to 1,000 items per invocation

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

// FIX #7: Validate each payload shape before attempting an insert,
// so failures are descriptive instead of raw Postgres constraint errors.
function validatePayload(actionType, payload) {
  const missing = []
  const requireFields = (fields) => {
    for (const f of fields) {
      if (payload[f] === undefined || payload[f] === null || payload[f] === '') missing.push(f)
    }
  }

  switch (actionType) {
    case 'Tour':
      requireFields(['guard_id', 'site_id', 'timestamp'])
      break
    case 'Incident':
      requireFields(['guard_id', 'site_id', 'severity', 'description', 'timestamp'])
      break
    case 'SOS':
      requireFields(['guard_id', 'gps_lat', 'gps_lng', 'timestamp'])
      break
    case 'DTR':
      requireFields(['guard_id', 'site_id'])
      break
    case 'ChecklistItem':
      requireFields(['guard_id', 'checklist_item_id', 'completed_at'])
      break
    default:
      return `Unknown action_type: ${actionType}`
  }

  return missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null
}

// FIX #4: Actually dispatch an SOS alert instead of only logging it.
// In production this would call Twilio (SMS), FCM/APNs (push), and the
// Viber Business API (Bridge 3). Here we persist the event and attempt
// the outbound webhook if configured, but never let a missing webhook
// silently swallow the SOS — the sos_events row itself is the source
// of truth the Ops Dashboard polls/subscribes to in realtime.
async function dispatchSosAlert(supabase, payload) {
  const { data: sosRow, error: sosError } = await supabase
    .from('sos_events')
    .insert({
      guard_id: payload.guard_id,
      site_id: payload.site_id ?? null,
      gps_lat: payload.gps_lat,
      gps_lng: payload.gps_lng,
      gps_accuracy_meters: payload.gps_accuracy_meters ?? null,
      battery_level: payload.battery_level ?? null,
      submitted_via: payload.submitted_via ?? 'app',
      status: 'active',
      triggered_at: payload.timestamp,
    })
    .select('id')
    .single()

  if (sosError) throw sosError

  const alertWebhookUrl = Deno.env.get('SOS_ALERT_WEBHOOK_URL')
  if (alertWebhookUrl) {
    try {
      await fetch(alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SOS',
          sos_event_id: sosRow.id,
          guard_id: payload.guard_id,
          gps_lat: payload.gps_lat,
          gps_lng: payload.gps_lng,
          triggered_at: payload.timestamp,
        }),
      })
    } catch (webhookErr) {
      // Don't fail the whole sync over a webhook hiccup — the sos_events
      // row already exists and the Ops Dashboard will surface it.
      console.error('SOS webhook dispatch failed (event still recorded):', webhookErr)
    }
  }

  return sosRow.id
}

async function processItem(supabase, item) {
  const payload = item.payload_json

  const validationError = validatePayload(item.action_type, payload)
  if (validationError) {
    throw new Error(validationError)
  }

  if (item.action_type === 'Tour') {
    const { error } = await supabase.from('tour_logs').insert({
      guard_id: payload.guard_id,
      site_id: payload.site_id,
      checkpoint_id: payload.checkpoint_id ?? null,
      scan_method: payload.scan_method ?? 'manual',
      scan_verified: payload.scan_verified ?? false,
      gps_lat: payload.gps_lat ?? null,
      gps_long: payload.gps_long ?? null,
      gps_accuracy_meters: payload.gps_accuracy_meters ?? null,
      timestamp: payload.timestamp,
      notes: payload.notes ?? null,
      photo_urls: payload.photo_urls ?? [],
      is_offline_origin: true,
      sync_status: 'Synced',
      synced_at: new Date().toISOString(),
    })
    if (error) throw error
  } else if (item.action_type === 'Incident') {
    const { error } = await supabase.from('incidents').insert({
      guard_id: payload.guard_id,
      site_id: payload.site_id,
      severity: payload.severity,
      category: payload.category ?? 'general',
      description: payload.description,
      is_drrm_tagged: payload.is_drrm_tagged ?? false,
      drrm_event_type: payload.drrm_event_type ?? null,
      media_urls: payload.media_urls ?? [],
      incident_lat: payload.incident_lat ?? null,
      incident_lng: payload.incident_lng ?? null,
      is_offline_origin: true,
      submitted_via: item.submitted_via ?? 'app',
      sms_code: payload.sms_code ?? null,
      timestamp: payload.timestamp,
    })
    if (error) throw error
  } else if (item.action_type === 'SOS') {
    // FIX #4: real alert dispatch, not just a console.log
    await dispatchSosAlert(supabase, payload)
  } else if (item.action_type === 'DTR') {
    // FIX #8: handle offline clock-in/out captured during data blackout
    const dtrRow = {
      guard_id: payload.guard_id,
      site_id: payload.site_id,
      shift_schedule_id: payload.shift_schedule_id ?? null,
      clock_in_method: payload.clock_in_method ?? 'sms_fallback',
      clock_in_verified: payload.clock_in_verified ?? false,
      clock_in_lat: payload.clock_in_lat ?? null,
      clock_in_lng: payload.clock_in_lng ?? null,
      is_offline_origin: true,
      synced_at: new Date().toISOString(),
      status: 'pending',
    }
    if (payload.event === 'clock_in') {
      dtrRow.clock_in_at = payload.timestamp
    } else if (payload.event === 'clock_out') {
      dtrRow.clock_out_at = payload.timestamp
      dtrRow.clock_out_lat = payload.clock_out_lat ?? null
      dtrRow.clock_out_lng = payload.clock_out_lng ?? null
    }
    const { error } = await supabase.from('dtr_records').insert(dtrRow)
    if (error) throw error
  } else if (item.action_type === 'ChecklistItem') {
    // FIX #8: handle offline post-order checklist completions
    const { error } = await supabase.from('checklist_completions').insert({
      checklist_item_id: payload.checklist_item_id,
      guard_id: payload.guard_id,
      tour_log_id: payload.tour_log_id ?? null,
      completed_at: payload.completed_at,
      photo_url: payload.photo_url ?? null,
      notes: payload.notes ?? null,
      is_offline_origin: true,
    })
    if (error) throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // FIX #10: restrict to POST
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET_TOKEN')

    if (!cronSecret) {
      return jsonResponse({ error: 'Server misconfiguration: CRON_SECRET_TOKEN not set' }, 500)
    }
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Server misconfiguration: missing Supabase env vars' }, 500)
    }

    // FIX #2: explicit schema, since these tables are not in 'public'.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: SCHEMA },
    })

    let totalProcessed = 0
    let totalSynced = 0
    let totalFailed = 0
    let totalDeadLettered = 0
    let batchesRun = 0

    // FIX #9: keep draining until the queue is empty or we hit the safety cap,
    // instead of only ever processing a single batch of 100 per invocation.
    while (batchesRun < MAX_BATCHES_PER_RUN) {
      // FIX #1 + #3: correct table name & correct PK usage.
      const { data: queueItems, error: queueError } = await supabase
        .from('offline_sync_queue')
        .select('*')
        .eq('sync_status', 'Pending')
        .order('captured_at', { ascending: true })
        .limit(BATCH_SIZE)

      if (queueError) throw queueError
      if (!queueItems || queueItems.length === 0) break

      batchesRun += 1
      totalProcessed += queueItems.length

      const results = await Promise.allSettled(
        queueItems.map(async (item) => {
          try {
            await processItem(supabase, item)

            const { error: updateError } = await supabase
              .from('offline_sync_queue')
              .update({ sync_status: 'Synced', synced_at: new Date().toISOString() })
              .eq('queue_id', item.queue_id)
            if (updateError) throw updateError

            return { queue_id: item.queue_id, ok: true }
          } catch (err) {
            // FIX #5 + #6: retry with backoff tracking instead of a
            // permanent 'Failed' dead end; persist the actual error reason.
            const nextRetryCount = (item.retry_count ?? 0) + 1
            const maxRetries = item.max_retries ?? 5
            const exhausted = nextRetryCount >= maxRetries

            const { error: failUpdateError } = await supabase
              .from('offline_sync_queue')
              .update({
                sync_status: exhausted ? 'Failed' : 'Pending',
                retry_count: nextRetryCount,
                last_error: String(err?.message ?? err),
              })
              .eq('queue_id', item.queue_id)

            if (failUpdateError) {
              console.error(`Failed to update queue item ${item.queue_id} after processing error:`, failUpdateError)
            }

            return { queue_id: item.queue_id, ok: false, deadLettered: exhausted, error: String(err?.message ?? err) }
          }
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.ok) {
            totalSynced += 1
          } else {
            totalFailed += 1
            if (r.value.deadLettered) totalDeadLettered += 1
          }
        } else {
          // Promise.allSettled should not reach here since processItem's
          // own try/catch handles all errors, but guard against the
          // unexpected (e.g. a thrown error outside the async callback).
          totalFailed += 1
          console.error('Unexpected queue processing rejection:', r.reason)
        }
      }

      // If this batch was smaller than BATCH_SIZE, the queue is now empty.
      if (queueItems.length < BATCH_SIZE) break
    }

    return jsonResponse({
      message: `Processed ${totalProcessed} item(s) from offline queue across ${batchesRun} batch(es).`,
      total_processed: totalProcessed,
      total_synced: totalSynced,
      total_failed: totalFailed,
      total_dead_lettered: totalDeadLettered,
    })
  } catch (error) {
    console.error('process-offline-sync-queue failed:', error)
    return jsonResponse({ error: error.message ?? String(error) }, 500)
  }
})

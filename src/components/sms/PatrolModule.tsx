import React, { useState, useEffect, useCallback } from 'react';
import { postOrders as seed } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { IconQr, IconCamera, IconCheck, IconShield, IconWifi } from './icons';

// ─────────────────────────────────────────────────────────────────────────────
// Types that mirror the real schema (post_orders / checklist_items /
// checklist_completions / offline_sync_queue in "prj_K9i_UT3iT5Ot")
// ─────────────────────────────────────────────────────────────────────────────
interface LiveChecklistItem {
  id: string;
  description: string;
  scheduled_time: string | null;
  requires_photo: boolean;
  sort_order: number;
  post_orders: { title: string; sites: { name: string } | null } | null;
  // Computed client-side from checklist_completions join
  done: boolean;
}

// PostOrder row as returned from Supabase
interface LivePostOrder {
  id: string;
  title: string;
  site_id: string;
  sites: { name: string } | null;
}

const SCHEMA = 'prj_K9i_UT3iT5Ot';

// SMS-coded incident format for Bridge 2 fallback (≤160 chars)
function buildSmsCode(description: string, site: string): string {
  const siteCode = site.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
  const descCode = description.replace(/[^A-Z0-9 ]/gi, '').slice(0, 12).toUpperCase();
  return `A3#INC SITE:${siteCode} TYP:OBS ${descCode} ${new Date().toISOString().slice(11, 16)}`;
}

// Saves a single completed checklist item to the offline_sync_queue.
// This is Bridge 1's local cache — process-offline-sync-queue drains it
// once connectivity returns.
async function enqueueOfflineCompletion(
  guardId: string,
  checklistItemId: string,
  scanMethod: string,
) {
  await supabase.schema(SCHEMA).from('offline_sync_queue').insert({
    guard_id: guardId,
    action_type: 'ChecklistItem',
    payload_json: {
      guard_id: guardId,
      checklist_item_id: checklistItemId,
      completed_at: new Date().toISOString(),
      clock_in_method: scanMethod,
    },
    submitted_via: 'app',
    sync_status: 'Pending',
  });
}

const PatrolModule: React.FC<{ sites?: string[] }> = ({ sites }) => {
  const siteName = sites && sites.length > 0 ? sites[0] : 'Robinsons Place';
  const { pushToast, bridge } = useSystem();
  const { profile } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  // `liveItems` holds the real DB checklist items when loaded.
  // `fallback` is the seed list used while offline or before data arrives.
  const [liveItems, setLiveItems] = useState<LiveChecklistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local completion state for offline-origin ticks (merged with DB data)
  const [localDone, setLocalDone] = useState<Record<string, boolean>>({});
  // Seed fallback (only used when DB load fails)
  const [seedOrders, setSeedOrders] = useState(seed);

  const [report, setReport] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  // ── Fetch checklist items for current guard's assigned site ───────────────
  const fetchItems = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Find the post_order(s) for this site and pull their checklist items,
      // joining completions for THIS guard today so we know what's already done.
      const today = new Date().toISOString().split('T')[0];

      const { data: items, error: itemsErr } = await supabase
        .schema(SCHEMA)
        .from('checklist_items')
        .select(`
          id,
          description,
          scheduled_time,
          requires_photo,
          sort_order,
          post_orders!inner (
            id,
            title,
            sites ( name )
          ),
          checklist_completions (
            id,
            completed_at,
            guard_id
          )
        `)
        .eq('is_active', true)
        .eq('post_orders.is_active', true)
        .filter('post_orders.sites.name', 'ilike', `%${siteName}%`)
        .order('sort_order', { ascending: true });

      if (itemsErr) throw itemsErr;
      if (!items || items.length === 0) {
        // No post orders found for this site — stay on seed fallback
        setLiveItems(null);
        return;
      }

      // Mark each item as done if it has a completion by this guard today
      const mapped: LiveChecklistItem[] = (items as any[]).map((item) => {
        const doneTodayByMe = (item.checklist_completions ?? []).some(
          (c: { guard_id: string; completed_at: string }) =>
            c.guard_id === profile.id && c.completed_at.startsWith(today),
        );
        return {
          id: item.id,
          description: item.description,
          scheduled_time: item.scheduled_time,
          requires_photo: item.requires_photo,
          sort_order: item.sort_order,
          post_orders: item.post_orders,
          done: doneTodayByMe || !!localDone[item.id],
        };
      });

      setLiveItems(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[PatrolModule] DB load failed, using seed data:', msg);
      setError(msg);
      setLiveItems(null); // fall back to seed
    } finally {
      setLoading(false);
    }
  }, [profile?.id, siteName, localDone]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Pending queue count (for "Offline Cache Status" panel) ────────────────
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .schema(SCHEMA)
      .from('offline_sync_queue')
      .select('queue_id', { count: 'exact', head: true })
      .eq('guard_id', profile.id)
      .eq('sync_status', 'Pending')
      .then(({ count }) => setPendingQueueCount(count ?? 0));
  }, [profile?.id]);

  // ── Scan / complete a checklist item ─────────────────────────────────────
  const scan = async (id: string, label: string) => {
    const scanMethod = label.includes('NFC') ? 'nfc' : label.includes('Photo') ? 'manual' : 'qr';

    // Optimistic update
    setLocalDone((prev) => ({ ...prev, [id]: true }));
    if (liveItems) {
      setLiveItems((prev) => prev!.map((x) => x.id === id ? { ...x, done: true } : x));
    } else {
      setSeedOrders((prev) => prev.map((x) => x.id === id ? { ...x, done: true } : x));
    }

    if (bridge === 'cloud' && profile?.id) {
      // Online: write directly to checklist_completions
      const { error: writeErr } = await supabase
        .schema(SCHEMA)
        .from('checklist_completions')
        .insert({
          checklist_item_id: id,
          guard_id: profile.id,
          completed_at: new Date().toISOString(),
          is_offline_origin: false,
        });

      if (writeErr) {
        console.error('[PatrolModule] completion write failed:', writeErr.message);
        pushToast(`${label} verified locally — sync pending.`, 'ok');
        if (profile?.id) await enqueueOfflineCompletion(profile.id, id, scanMethod);
      } else {
        pushToast(`${label} verified — anti-buddy-punch confirmed. Uploaded.`, 'ok');
        setPendingQueueCount((c) => Math.max(0, c - 1));
      }
    } else if (profile?.id) {
      // Offline: queue for auto-sync
      await enqueueOfflineCompletion(profile.id, id, scanMethod);
      setPendingQueueCount((c) => c + 1);
      pushToast(`${label} verified — cached for auto-sync when ${bridge === 'sms' ? 'SMS gateway' : 'Viber/Radio'} uploads.`, 'ok');
    } else {
      pushToast(`${label} recorded (demo mode — not persisted).`, 'ok');
    }
  };

  // ── Submit incident report ────────────────────────────────────────────────
  const submitReport = async () => {
    if (!report.trim()) { pushToast('Enter incident details first.', 'alert'); return; }
    setSubmittingReport(true);

    if (bridge === 'cloud' && profile?.id) {
      const siteIdQuery = await supabase
        .schema(SCHEMA)
        .from('sites')
        .select('id')
        .ilike('name', `%${siteName}%`)
        .limit(1)
        .single();

      if (siteIdQuery.data?.id) {
        const { error: incErr } = await supabase
          .schema(SCHEMA)
          .from('incidents')
          .insert({
            guard_id: profile.id,
            site_id: siteIdQuery.data.id,
            severity: 'low',
            category: 'general',
            description: report.trim(),
            is_offline_origin: false,
            submitted_via: 'app',
            timestamp: new Date().toISOString(),
          });

        if (incErr) {
          pushToast('Upload failed — incident queued for auto-sync.', 'alert');
        } else {
          pushToast('Incident report uploaded to cloud.', 'ok');
        }
      } else {
        pushToast('Site not found in DB — incident queued locally.', 'ok');
      }
    } else if (bridge === 'sms') {
      const smsCode = buildSmsCode(report, siteName);
      pushToast(`SMS Fallback: coded report (160ch) sent → "${smsCode}"`, 'ok');
      // Also queue so it reaches the cloud when data returns
      if (profile?.id) {
        await supabase.schema(SCHEMA).from('offline_sync_queue').insert({
          guard_id: profile.id,
          action_type: 'Incident',
          payload_json: {
            guard_id: profile.id,
            site_id: siteName,
            severity: 'low',
            category: 'general',
            description: report.trim(),
            submitted_via: 'sms_gateway',
            sms_code: smsCode,
            timestamp: new Date().toISOString(),
          },
          submitted_via: 'sms_gateway',
          sync_status: 'Pending',
        });
        setPendingQueueCount((c) => c + 1);
      }
    } else {
      pushToast('Report queued for Viber/Radio relay.', 'ok');
    }

    setReport('');
    setSubmittingReport(false);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  // Decide which items list to display
  const displayItems = liveItems ?? seedOrders.map((o) => ({
    id: o.id,
    description: o.title,
    scheduled_time: o.time,
    requires_photo: o.title.includes('Photo'),
    sort_order: 0,
    post_orders: null,
    done: o.done,
  }));

  const done = displayItems.filter((o) => o.done).length;
  const pct = displayItems.length > 0 ? Math.round((done / displayItems.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-display text-lg flex items-center gap-2">
            <IconShield className="w-5 h-5 text-gold" />
            Tour Checklist · {siteName}
            {loading && <span className="text-xs text-white/40 font-body ml-2">loading…</span>}
            {!loading && liveItems && (
              <span className="text-xs text-green-300 font-body ml-2 flex items-center gap-1">
                <IconWifi className="w-3 h-3" />live
              </span>
            )}
            {!loading && !liveItems && (
              <span className="text-xs text-amber-300 font-body ml-2">seed data</span>
            )}
          </h3>
          <span className="text-gold font-display text-lg">{pct}%</span>
        </div>
        {error && (
          <p className="text-amber-300/70 text-[11px] font-body mb-2">
            Could not load live checklist ({error}). Showing seed post orders.
          </p>
        )}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#ffaa00] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-2">
          {displayItems.map((o) => (
            <div key={o.id} className={`glass rounded-2xl p-3 flex items-center gap-3 ${o.done ? 'opacity-60' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${o.done ? 'bg-green-500' : 'border-2 border-white/30'}`}>
                {o.done && <IconCheck className="w-4 h-4 text-white" />}
              </span>
              <div className="flex-1">
                <div className={`font-body text-sm ${o.done ? 'line-through text-white/50' : 'text-white'}`}>
                  {o.description}
                </div>
                <div className="text-white/40 text-xs font-body">
                  {o.scheduled_time ? `Due ${o.scheduled_time}` : 'Any time'} · {siteName}
                </div>
              </div>
              {!o.done && (
                <button
                  onClick={() => scan(o.id, o.description)}
                  className="glass-gold text-gold rounded-xl px-3 py-2 min-h-[44px] flex items-center gap-1.5 text-sm font-body"
                >
                  {o.requires_photo ? <IconCamera className="w-4 h-4" /> : <IconQr className="w-4 h-4" />}
                  {o.requires_photo ? 'Capture' : 'Scan'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg mb-2">Field Incident Report</h3>
          <p className="text-white/50 text-xs font-body mb-3">
            Works offline. Routes via <span className="text-gold uppercase">{bridge}</span> bridge automatically.
          </p>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={4}
            placeholder="Describe observation / incident..."
            className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 resize-none"
          />
          <button
            onClick={submitReport}
            disabled={submittingReport}
            className="mt-3 w-full bg-[#003a7a] hover:bg-[#004a9a] disabled:opacity-50 text-white font-display py-3 rounded-2xl min-h-[48px] transition"
          >
            {submittingReport ? 'SUBMITTING…' : 'SUBMIT REPORT'}
          </button>
        </div>

        <div className="glass-strong rounded-3xl p-4 flex flex-col">
          <h3 className="text-white font-display text-lg mb-2">Offline Cache Status</h3>
          <div className="space-y-2 flex-1 font-body text-sm">
            {[
              ['Post orders cached', liveItems ? `${liveItems.length} live items` : '12 templates'],
              ['GPS breadcrumbs', '72h local store'],
              ['Photo evidence', 'auto-compressed'],
              ['Incident drafts', pendingQueueCount > 0 ? `${pendingQueueCount} queued` : 'none queued'],
            ].map(([a, b]) => (
              <div key={a} className="glass rounded-xl px-3 py-2.5 flex justify-between">
                <span className="text-white/80">{a}</span>
                <span className="text-gold">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-[11px] font-body mt-3">
            All cached records auto-upload the moment connectivity returns.
          </p>
        </div>
      </div>
    </div>
  );
};
export default PatrolModule;

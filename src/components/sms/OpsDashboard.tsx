import React, { useState, useEffect } from 'react';
import { guards, incidents } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { IconMessage, IconRadio, IconWifi, IconAlert } from './icons';
import { supabase } from '@/lib/supabase';

// FIX: This dashboard talks to two different concerns that must NOT be
// confused with each other:
//   1. Guard/incident data — currently mock data from strongholdData.ts,
//      destined to live under the SMS schema (see database.sql,
//      schema "prj_K9i_UT3iT5Ot": tables `incidents`, `tour_logs`, etc).
//   2. Public-website lead capture ("security_assessment_leads") — a
//      B2B marketing concern, separate from guard operations. This table
//      is NOT part of the SMS schema delivered alongside this app, so the
//      query below is defensive: if the table doesn't exist yet on the
//      connected backend, we fail soft instead of leaving the panel
//      stuck on "Fetching leads from Supabase..." forever.
const LEADS_SCHEMA = 'public'; // intentionally public: marketing site write target, not the SMS schema

interface Lead {
  id: string;
  full_name: string;
  email: string;
  company: string;
  facility_type: string;
  osri_score: number;
  risk_level: string;
  status: string;
  submitted_at: string;
}

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="glass rounded-2xl p-4">
    <div className={`text-3xl font-display font-bold ${tone || 'text-gold'}`}>{value}</div>
    <div className="text-xs text-white/55 font-body mt-1 uppercase tracking-wide">{label}</div>
  </div>
);

const ChannelBadge: React.FC<{ c: string }> = ({ c }) => {
  const map: Record<string, { I: React.FC<{ className?: string }>; t: string }> = {
    cloud: { I: IconWifi, t: 'text-green-300' }, 
    sms: { I: IconMessage, t: 'text-amber-300' }, 
    viber: { I: IconRadio, t: 'text-violet-300' },
  };
  // FIX: guard against an unrecognized channel value instead of throwing
  // (destructuring `undefined` would crash the whole dashboard render).
  const entry = map[c] ?? map.cloud;
  const { I, t } = entry;
  return <span className={`inline-flex items-center gap-1 text-[11px] ${t} font-body`}><I className="w-3.5 h-3.5" />{c.toUpperCase()}</span>;
};

const OpsDashboard: React.FC<{ onBroadcast: () => void; sites?: string[]; canBroadcast?: boolean }> = ({ onBroadcast, sites, canBroadcast = true }) => {
  const { pushToast } = useSystem();
  const [selected, setSelected] = useState<string | null>(null);
  
  // --- INBOUND LEADS STATE ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const visibleGuards = sites ? guards.filter((g) => sites.includes(g.site)) : guards;
  const visibleIncidents = sites ? incidents.filter((i) => sites.includes(i.site)) : incidents;
  const onDuty = visibleGuards.filter((g) => g.status !== 'off').length;
  const siteCount = new Set(visibleGuards.map((g) => g.site)).size;
  const smsCount = visibleIncidents.filter((i) => i.channel === 'sms').length;

  // --- FETCH LEADS & SUBSCRIBE TO REALTIME ---
  useEffect(() => {
    let isMounted = true;

    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('security_assessment_leads')
          .select('*')
          .order('submitted_at', { ascending: false })
          .limit(5);

        if (!isMounted) return;

        // FIX: previously `error` was destructured but never checked, so a
        // missing table or RLS denial silently left `leadsLoading` true
        // forever — the panel showed "Fetching leads..." indefinitely with
        // no indication anything was wrong.
        if (error) {
          console.error('[OpsDashboard] Leads fetch error:', error.message);
          setLeadsError(error.message);
        } else if (data) {
          setLeads(data as Lead[]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[OpsDashboard] Unexpected leads fetch error:', err);
        setLeadsError('Unable to reach the leads service.');
      } finally {
        if (isMounted) setLeadsLoading(false);
      }
    };

    fetchLeads();

    // Realtime subscription: instantly updates the dashboard when a new
    // lead comes in. FIX: schema is now an explicit named constant
    // (LEADS_SCHEMA) rather than a bare 'public' string buried inline,
    // so it's clear this intentionally targets the marketing site's
    // schema and not the SMS operations schema.
    const channel = supabase
      .channel('leads-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: LEADS_SCHEMA, table: 'security_assessment_leads' }, (payload) => {
        const newLead = payload.new as Lead;
        setLeads((prev) => [newLead, ...prev].slice(0, 5));
        // Trigger a toast notification to alert the Ops Manager
        pushToast(`🚨 NEW LEAD: ${newLead.full_name} from ${newLead.company} (Score: ${newLead.osri_score})`, 'alert');
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [pushToast]);

  return (
    <div className="space-y-4">
      {sites && (
        <div className="glass-gold rounded-2xl px-4 py-2 text-gold text-xs font-body">
          RBAC scope: showing only your assigned site(s) — {sites.join(', ')}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Guards On-Duty" value={`${onDuty}/${visibleGuards.length}`} />
        <Stat label="Active Sites" value={String(siteCount)} />
        <Stat label="Open Incidents" value={String(visibleIncidents.length)} tone="text-amber-300" />
        <Stat label="SMS Fallbacks" value={String(smsCount)} tone="text-red-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 glass-strong rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-display text-lg">Live Guard Map · Tacloban</h3>
            <span className="text-[11px] text-green-300 font-body flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-green" /> OpenStreetMap (offline tiles)
            </span>
          </div>
          <div className="relative rounded-2xl overflow-hidden h-72 bg-[#0a1f3d]" style={{ backgroundImage: 'linear-gradient(rgba(255,215,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,0.06) 1px,transparent 1px)', backgroundSize: '32px 32px' }}>
            {visibleGuards.map((g, i) => (
              <button key={g.id} onClick={() => setSelected(g.id)}
                style={{ left: `${15 + i * 17}%`, top: `${25 + (i % 3) * 22}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group">
                <span className={`block w-4 h-4 rounded-full border-2 border-white ${g.status === 'patrol' ? 'bg-amber-400' : g.status === 'break' ? 'bg-white/60' : 'bg-green-400'} ${g.battery < 20 ? 'pulse-red' : ''}`} />
                <span className="absolute left-5 top-0 whitespace-nowrap text-[10px] glass px-1.5 py-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition">{g.name}</span>
              </button>
            ))}
            {selected && (() => { const g = guards.find((x) => x.id === selected)!; return (
              <div className="absolute bottom-3 left-3 right-3 glass-strong rounded-2xl p-3 flex items-center gap-3 animate-spring">
                <img src={g.photo} className="w-12 h-12 rounded-xl object-cover" alt={g.name} />
                <div className="flex-1">
                  <div className="text-white font-display">{g.name} · {g.rank}</div>
                  <div className="text-white/50 text-xs font-body">{g.site} · {g.lat.toFixed(3)}, {g.lng.toFixed(3)} · {g.lastSync}</div>
                </div>
                <div className={`text-sm font-body ${g.battery < 20 ? 'text-red-400' : 'text-gold'}`}>{g.battery}%</div>
              </div>
            ); })()}
          </div>
        </div>

        {/* Broadcast + actions */}
        <div className="space-y-4">
          {canBroadcast && (
            <div className="glass-red rounded-3xl p-4">
              <h3 className="text-white font-display text-lg flex items-center gap-2"><IconAlert className="w-5 h-5 text-red-300" /> Mass Red Alert</h3>
              <p className="text-white/60 text-xs font-body mt-1 mb-3">One-tap simultaneous Push + SMS + Viber to all personnel.</p>
              <button onClick={onBroadcast} className="w-full bg-[#DC143C] hover:bg-[#b01030] text-white font-display tracking-wide py-3 rounded-2xl min-h-[48px] transition">TRIGGER BROADCAST</button>
            </div>
          )}
          <div className="glass rounded-3xl p-4 space-y-2">
            <h3 className="text-white font-display text-base mb-1">Quick Ops</h3>
            {['Dispatch roving unit', 'Request PNP coordination', 'Endorse to next shift'].map((a) => (
              <button key={a} onClick={() => pushToast(`${a} — logged & routed via active bridge.`, 'ok')}
                className="w-full text-left text-sm font-body text-white/80 glass rounded-xl px-3 py-2.5 hover:glass-gold hover:text-gold transition min-h-[44px]">{a}</button>
            ))}
          </div>
        </div>
      </div>

      {/* --- INBOUND ASSESSMENT LEADS SECTION --- */}
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-display text-lg flex items-center gap-2">
            <IconAlert className="w-5 h-5 text-gold" /> Inbound Assessment Leads
          </h3>
          <span className="text-[11px] text-green-300 font-body flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-green" /> Real-time Sync
          </span>
        </div>

        {leadsLoading ? (
          <div className="glass rounded-2xl p-6 text-center text-white/50 text-sm font-body">Fetching leads from Supabase...</div>
        ) : leadsError ? (
          <div className="glass-red rounded-2xl p-6 text-center text-red-200 text-sm font-body">
            Could not load leads: {leadsError}. Check that the connected Supabase project has a <code className="text-red-100">security_assessment_leads</code> table with public-read policies.
          </div>
        ) : leads.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-white/50 text-sm font-body">No new leads yet. The public assessment tool is active and ready.</div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => {
              const scoreColor = lead.osri_score >= 75 ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                                 lead.osri_score >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                                 'text-green-400 bg-green-500/10 border-green-500/30';
              
              return (
                <div key={lead.id} className="glass rounded-2xl p-3 flex flex-wrap items-center gap-3 hover:border-gold/30 transition">
                  <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${scoreColor}`}>
                    <span className="text-lg font-bold font-display leading-none">{lead.osri_score}</span>
                    <span className="text-[8px] uppercase tracking-wider">Risk</span>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <div className="text-white font-body text-sm font-semibold">{lead.full_name}</div>
                    <div className="text-white/50 text-xs font-body">{lead.company} · {lead.facility_type}</div>
                    <div className="text-white/40 text-[10px] font-body mt-0.5">
                      {new Date(lead.submitted_at).toLocaleString('en-PH')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${scoreColor}`}>
                      {lead.risk_level}
                    </span>
                    <a href={`mailto:${lead.email}`} className="text-gold text-xs font-body hover:underline">
                      Contact Lead →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident stream */}
      <div className="glass-strong rounded-3xl p-4">
        <h3 className="text-white font-display text-lg mb-3">Incident Stream · 3-Bridge Intake</h3>
        <div className="space-y-2">
          {visibleIncidents.map((inc) => (
            <div key={inc.id} className="glass rounded-2xl p-3 flex flex-wrap items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${inc.severity === 'high' ? 'bg-red-500' : inc.severity === 'medium' ? 'bg-amber-400' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-[180px]">
                <div className="text-white font-body text-sm font-semibold">{inc.id} · {inc.type} {inc.drrm && <span className="ml-1 text-[10px] glass-gold text-gold px-1.5 py-0.5 rounded">DRRM RA10121</span>}</div>
                <div className="text-white/50 text-xs font-body">{inc.site} · {inc.guard} · {inc.time}</div>
                <div className="text-white/40 text-xs font-body mt-0.5">{inc.summary}</div>
              </div>
              <ChannelBadge c={inc.channel} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpsDashboard;
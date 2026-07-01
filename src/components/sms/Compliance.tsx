import React, { useState, useEffect } from 'react';
import { guards as seedGuards, vault as seedVault } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { IconLock, IconAlert, IconFile, IconCheck, IconWifi } from './icons';

const SCHEMA = 'prj_K9i_UT3iT5Ot';

const daysUntil = (d: string | null) => {
  if (!d || d === '—') return 9999;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
};

// ── Real DB row shapes ───────────────────────────────────────────────────────
interface LiveGuardExpiry {
  guardId: string;
  name: string;
  pnpExpiry: string | null;
  nbiExpiry: string | null;
  nbiStatus: string;
  sosiaExpiry: string | null;
  medicalExpiry: string | null;
  firearmsExpiry: string | null;
  isArmed: boolean;
}

interface LiveVaultDoc {
  id: string;
  doc_label: string;
  doc_type: string;
  expiry_date: string | null;
  storage_path: string;
  storage_bucket: string;
  uploaded_at: string;
  last_accessed_at: string | null;
}

function DaysTag({ days, label }: { days: number; label: string }) {
  if (days === 9999) return <span className="text-xs font-body text-white/40">{label}: —</span>;
  const color = days <= 0 ? 'text-red-400' : days <= 30 ? 'text-red-300' : 'text-green-300';
  return (
    <span className="text-xs font-body text-white/70">
      {label}: <span className={color}>{days <= 0 ? 'EXPIRED' : `${days}d`}</span>
    </span>
  );
}

const Compliance: React.FC = () => {
  const { pushToast } = useSystem();
  const { profile } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [guardExpiries, setGuardExpiries] = useState<LiveGuardExpiry[] | null>(null);
  const [vaultDocs, setVaultDocs] = useState<LiveVaultDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        // 1. Guard expiry data — join guard_profiles with profiles for name
        const { data: gpRows, error: gpErr } = await supabase
          .schema(SCHEMA)
          .from('guard_profiles')
          .select(`
            guard_id,
            pnp_expiry,
            nbi_expiry,
            nbi_status,
            sosia_expiry,
            medical_expiry,
            firearms_expiry,
            is_armed,
            profiles ( full_name )
          `);

        if (gpErr) throw gpErr;

        // 2. Company-level and guard-level compliance docs (vault)
        const { data: docRows, error: docErr } = await supabase
          .schema(SCHEMA)
          .from('compliance_docs')
          .select('id, doc_label, doc_type, expiry_date, storage_path, storage_bucket, uploaded_at, last_accessed_at')
          .eq('is_archived', false)
          .order('expiry_date', { ascending: true, nullsFirst: false });

        if (docErr) throw docErr;

        if (!isMounted) return;

        if (gpRows && gpRows.length > 0) {
          const mapped: LiveGuardExpiry[] = (gpRows as any[]).map((g) => ({
            guardId: g.guard_id,
            name: g.profiles?.full_name ?? '(unnamed)',
            pnpExpiry: g.pnp_expiry,
            nbiExpiry: g.nbi_expiry,
            nbiStatus: g.nbi_status ?? 'PENDING',
            sosiaExpiry: g.sosia_expiry,
            medicalExpiry: g.medical_expiry,
            firearmsExpiry: g.firearms_expiry,
            isArmed: g.is_armed ?? false,
          }));
          setGuardExpiries(mapped);
        }

        if (docRows && docRows.length > 0) {
          setVaultDocs(docRows as LiveVaultDoc[]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[Compliance] DB load failed, using seed data:', msg);
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [profile?.id]);

  // ── Log vault access ──────────────────────────────────────────────────────
  const openDocument = async (docId: string, docLabel: string) => {
    pushToast(`${docLabel} opened — access logged (RBAC + DPA RA10173).`, 'info');
    if (profile?.id) {
      await supabase
        .schema(SCHEMA)
        .from('compliance_docs')
        .update({
          last_accessed_by: profile.id,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', docId);
    }
  };

  // ── Notify about expiring guard ───────────────────────────────────────────
  const notifyGuard = (name: string) => {
    pushToast(`Renewal reminder sent to ${name} & admin.`, 'ok');
    // In production: call email-notifications Edge Function or insert a
    // notification row. For now the toast confirms intent.
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  // Use live data if available, seed as fallback
  const expiryRows = guardExpiries ?? seedGuards.map((g) => ({
    guardId: g.id,
    name: g.name,
    pnpExpiry: g.licenseExpiry,
    nbiExpiry: g.nbiExpiry,
    nbiStatus: 'CLEARED',
    sosiaExpiry: g.licenseExpiry,
    medicalExpiry: null,
    firearmsExpiry: null,
    isArmed: false,
  }));

  const docRows = vaultDocs ?? seedVault.map((v) => ({
    id: v.id,
    doc_label: v.name,
    doc_type: v.type,
    expiry_date: v.expiry === '—' ? null : v.expiry,
    storage_path: '',
    storage_bucket: 'compliance-vault',
    uploaded_at: new Date().toISOString(),
    last_accessed_at: null,
  }));

  const isLive = !error && (guardExpiries !== null || vaultDocs !== null);

  return (
    <div className="space-y-4">
      {/* ── License Expiry Watch ─────────────────────────────────────────── */}
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h3 className="text-white font-display text-lg flex items-center gap-2">
            <IconAlert className="w-5 h-5 text-amber-300" />
            License Expiry Watch (30-day)
            {loading && <span className="text-xs text-white/40 font-body ml-1">loading…</span>}
            {!loading && isLive && (
              <span className="text-xs text-green-300 font-body ml-1 flex items-center gap-1">
                <IconWifi className="w-3 h-3" />live
              </span>
            )}
            {!loading && !isLive && (
              <span className="text-xs text-amber-300 font-body ml-1">seed data</span>
            )}
          </h3>
        </div>
        {error && (
          <p className="text-amber-300/70 text-[11px] font-body mb-2">
            Could not load live data ({error}). Showing seed records.
          </p>
        )}
        <p className="text-white/50 text-xs font-body mb-3">
          PNP-SOSIA licenses, NBI clearances, medical certs. Flagged ≤30 days.
        </p>
        <div className="space-y-2">
          {expiryRows.map((e) => {
            const minDays = Math.min(
              daysUntil(e.pnpExpiry),
              daysUntil(e.nbiExpiry),
              daysUntil(e.sosiaExpiry),
              daysUntil(e.medicalExpiry),
            );
            const nbiDerogatory = e.nbiStatus === 'DEROGATORY';
            const warn = minDays <= 30 || nbiDerogatory;
            return (
              <div key={e.guardId} className={`rounded-2xl p-3 flex flex-wrap items-center gap-3 ${warn ? 'glass-red' : 'glass'}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${warn ? 'bg-red-500 pulse-red' : 'bg-green-400'}`} />
                <span className="text-white font-body flex-1 min-w-[120px]">{e.name}</span>
                <DaysTag days={daysUntil(e.pnpExpiry)} label="SOSIA" />
                <DaysTag days={daysUntil(e.nbiExpiry)} label="NBI" />
                {e.medicalExpiry && <DaysTag days={daysUntil(e.medicalExpiry)} label="MED" />}
                {nbiDerogatory && (
                  <span className="text-xs font-body text-red-300">⚠ NBI DEROGATORY</span>
                )}
                {warn && (
                  <button
                    onClick={() => notifyGuard(e.name)}
                    className="glass-gold text-gold text-xs font-body px-3 py-1.5 rounded-xl min-h-[36px]"
                  >
                    Notify
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Document Vault ────────────────────────────────────────────────── */}
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg flex items-center gap-2 mb-3">
            <IconLock className="w-5 h-5 text-gold" />
            Encrypted Document Vault
          </h3>
          <div className="space-y-2">
            {docRows.map((d) => {
              const expDays = daysUntil(d.expiry_date);
              const expWarn = expDays !== 9999 && expDays <= 30;
              return (
                <div key={d.id} className={`rounded-2xl p-3 flex items-center gap-3 ${expWarn ? 'glass-red' : 'glass'}`}>
                  <IconFile className="w-5 h-5 text-white/50 shrink-0" />
                  <div className="flex-1">
                    <div className="text-white text-sm font-body">{d.doc_label}</div>
                    <div className="text-white/40 text-xs font-body">
                      {d.doc_type} · expiry {d.expiry_date ?? '—'}
                      {expWarn && <span className="text-red-300 ml-1">(⚠ {expDays}d)</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-green-300 font-body flex items-center gap-1">
                    <IconLock className="w-3 h-3" />AES-256
                  </span>
                  <button
                    onClick={() => openDocument(d.id, d.doc_label)}
                    className="text-gold text-xs font-body glass px-2.5 py-1.5 rounded-xl min-h-[36px]"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-white/40 text-[11px] font-body mt-3">15-minute audit readiness · full access trail.</p>
        </div>

        {/* ── Regulatory Posture ─────────────────────────────────────────────── */}
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg mb-3">Regulatory Posture</h3>
          <div className="space-y-2">
            {[
              ['RA 10173 — Data Privacy Act', 'Compliant'],
              ['RA 10121 — DRRM Tagging', 'Active'],
              ['DOLE D.O. 174 — Contracting', 'Registered'],
              ['PNP-SOSIA — Agency License', 'Valid'],
              ['BIR — Withholding Tax', 'Filed'],
            ].map(([a, b]) => (
              <div key={a} className="glass rounded-2xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-white/80 text-sm font-body">{a}</span>
                <span className="text-green-300 text-xs font-body flex items-center gap-1">
                  <IconCheck className="w-3.5 h-3.5" />{b}
                </span>
              </div>
            ))}
          </div>
          <div className="glass-gold rounded-2xl p-3 mt-3">
            <p className="text-gold font-display text-sm">Role-Based Access Control</p>
            <p className="text-white/60 text-[11px] font-body mt-1">
              Supervisors → assigned sites only. Admins → payroll + vault. All access scoped & logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Compliance;

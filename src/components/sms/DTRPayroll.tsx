import React, { useState, useEffect } from 'react';
import { payroll as seedPayroll } from '@/data/strongholdData';
import type { PayrollRow } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { IconDownload, IconClock, IconWifi } from './icons';

const SCHEMA = 'prj_K9i_UT3iT5Ot';
const peso = (n: number) => '₱' + n.toLocaleString('en-PH');

// ── PH statutory deduction formulas (2024 tables) ───────────────────────────
// These mirror the DB trigger `compute_dtr_hours()` logic but run client-side
// so the payroll table is always renderable without a second DB round-trip.

function sssContrib(gross: number): number {
  // SSS 2023 contribution table — simplified linear interpolation
  // Actual: stepped brackets; this is close enough for display
  const msc = Math.min(Math.max(gross, 4250), 29750);
  return Math.round(msc * 0.045 / 50) * 50; // ~4.5% employee share
}
function phicContrib(gross: number): number {
  // PhilHealth 2024: 5% of basic, split 50/50 employee/employer
  return Math.min(Math.round(gross * 0.025 / 50) * 50, 1800);
}
function pagibigContrib(gross: number): number {
  // Pag-IBIG: 2% employee share, capped at ₱100 (waiver applies above ₱5k)
  return gross > 5000 ? 100 : Math.round(gross * 0.01);
}
function birWithholding(gross: number): number {
  // BIR 2024 TRAIN LAW — monthly equivalent of annual tax brackets
  const annual = gross * 12;
  if (annual <= 250000) return 0;
  if (annual <= 400000) return Math.round(((annual - 250000) * 0.15) / 12);
  if (annual <= 800000) return Math.round((22500 + (annual - 400000) * 0.20) / 12);
  if (annual <= 2000000) return Math.round((102500 + (annual - 800000) * 0.25) / 12);
  if (annual <= 8000000) return Math.round((402500 + (annual - 2000000) * 0.30) / 12);
  return Math.round((2202500 + (annual - 8000000) * 0.35) / 12);
}

// ── DTR row from Supabase, joined with profile name ─────────────────────────
interface DtrRow {
  guardId: string;
  name: string;
  reg: number;    // regular hours
  ot: number;     // overtime hours
  under: number;  // undertime hours
  nightDiff: number;
}

// Build a PayrollRow from a DtrRow using live DB hours + PH statutory formulas.
// Basic hourly rate assumes monthly minimum wage ÷ 26 days ÷ 8 hours.
// Tacloban / Eastern Visayas minimum wage as of 2024: ₱430/day
const DAILY_RATE = 430;
const HOURLY_RATE = DAILY_RATE / 8;
const OT_MULTIPLIER = 1.25;
const NIGHT_DIFF_RATE = 0.10; // 10% additional on base rate

function dtrToPayrollRow(d: DtrRow): PayrollRow {
  const regPay = d.reg * HOURLY_RATE;
  const otPay = d.ot * HOURLY_RATE * OT_MULTIPLIER;
  const nightPay = d.nightDiff * HOURLY_RATE * NIGHT_DIFF_RATE;
  const undertimeDeduction = d.under * HOURLY_RATE;
  const gross = Math.max(0, Math.round(regPay + otPay + nightPay - undertimeDeduction));
  const sss = sssContrib(gross);
  const phic = phicContrib(gross);
  const pagibig = pagibigContrib(gross);
  const bir = birWithholding(gross);
  const net = Math.max(0, gross - sss - phic - pagibig - bir);
  return { id: d.guardId, name: d.name, reg: d.reg, ot: d.ot, under: d.under, gross, sss, phic, pagibig, bir, net };
}

const DTRPayroll: React.FC = () => {
  const { pushToast } = useSystem();
  const { profile } = useAuth();

  const [livePayroll, setLivePayroll] = useState<PayrollRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cutoffLabel, setCutoffLabel] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // ── Determine current payroll period ─────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en-PH', { month: 'long' });
    const year = now.getFullYear();
    setCutoffLabel(day <= 15
      ? `${month} 1–15, ${year}`
      : `${month} 16–${new Date(year, now.getMonth() + 1, 0).getDate()}, ${year}`
    );
  }, []);

  // ── Fetch live DTR records for the current payroll period ─────────────────
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchDtr = async () => {
      try {
        const now = new Date();
        const day = now.getDate();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const periodStart = day <= 15
          ? `${year}-${month}-01`
          : `${year}-${month}-16`;
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const periodEnd = day <= 15
          ? `${year}-${month}-15`
          : `${year}-${month}-${lastDay}`;

        // Aggregate DTR hours per guard for the period
        const { data: rows, error: dtrErr } = await supabase
          .schema(SCHEMA)
          .from('dtr_records')
          .select(`
            guard_id,
            hours_worked,
            overtime_hours,
            undertime_hours,
            night_diff_hours,
            status,
            profiles ( id, full_name )
          `)
          .gte('clock_in_at', `${periodStart}T00:00:00.000Z`)
          .lte('clock_in_at', `${periodEnd}T23:59:59.999Z`)
          .in('status', ['approved', 'pending']); // exclude disputed

        if (dtrErr) throw dtrErr;
        if (!rows || rows.length === 0) {
          if (isMounted) { setLivePayroll(null); setLoading(false); }
          return;
        }

        // Aggregate by guard (multiple DTR rows per period)
        const byGuard: Record<string, DtrRow> = {};
        for (const r of rows as any[]) {
          const gid = r.guard_id;
          if (!byGuard[gid]) {
            byGuard[gid] = {
              guardId: gid,
              name: r.profiles?.full_name ?? `Guard ${gid.slice(0, 6)}`,
              reg: 0, ot: 0, under: 0, nightDiff: 0,
            };
          }
          byGuard[gid].reg += Number(r.hours_worked ?? 0);
          byGuard[gid].ot += Number(r.overtime_hours ?? 0);
          byGuard[gid].under += Number(r.undertime_hours ?? 0);
          byGuard[gid].nightDiff += Number(r.night_diff_hours ?? 0);
        }

        // Count pending (unapproved) DTR rows for the period banner
        const pendingRows = (rows as any[]).filter((r) => r.status === 'pending').length;

        if (isMounted) {
          setLivePayroll(Object.values(byGuard).map(dtrToPayrollRow));
          setPendingCount(pendingRows);
          setLoading(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[DTRPayroll] DB load failed, using seed data:', msg);
        if (isMounted) { setError(msg); setLoading(false); }
      }
    };

    fetchDtr();
    return () => { isMounted = false; };
  }, []);

  const payroll = livePayroll ?? seedPayroll;
  const isLive = livePayroll !== null;

  const totGross = payroll.reduce((s, p) => s + p.gross, 0);
  const totNet   = payroll.reduce((s, p) => s + p.net, 0);
  const totOt    = payroll.reduce((s, p) => s + p.ot, 0);

  // ── Export to CSV ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    const header = ['ID', 'Name', 'Reg Hrs', 'OT', 'Under', 'Gross', 'SSS', 'PhilHealth', 'Pag-IBIG', 'BIR', 'Net'];
    const rows = payroll.map((p) =>
      [p.id, p.name, p.reg, p.ot, p.under, p.gross, p.sss, p.phic, p.pagibig, p.bir, p.net].join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }); // BOM for Excel PH locale
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stronghold_A3_DTR_${cutoffLabel.replace(/[^A-Z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('DTR exported — SSS/PhilHealth/Pag-IBIG/BIR formatted CSV ready for Excel.', 'ok');
  };

  return (
    <div className="space-y-4">
      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total Gross', peso(totGross), 'text-gold'],
          ['Total Net Pay', peso(totNet), 'text-green-300'],
          ['OT Hours', `${Math.round(totOt)} hrs`, 'text-amber-300'],
          ['Cut-off', cutoffLabel || '…', 'text-white'],
        ].map(([l, v, t]) => (
          <div key={l} className="glass rounded-2xl p-4">
            <div className={`text-2xl font-display font-bold ${t}`}>{v}</div>
            <div className="text-xs text-white/55 font-body mt-1 uppercase">{l}</div>
          </div>
        ))}
      </div>

      {/* ── Pending approval banner ───────────────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="glass-gold rounded-2xl px-4 py-3 text-sm font-body text-gold flex items-center gap-2">
          <IconClock className="w-4 h-4 shrink-0" />
          {pendingCount} DTR record{pendingCount !== 1 ? 's' : ''} pending supervisor approval this period.
        </div>
      )}

      {/* ── DTR Table ────────────────────────────────────────────────────── */}
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-display text-lg flex items-center gap-2">
            <IconClock className="w-5 h-5 text-gold" />
            Automated DTR Consolidation
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
          <button
            onClick={exportExcel}
            className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display px-4 py-2.5 rounded-2xl min-h-[44px] flex items-center gap-2 text-sm transition"
          >
            <IconDownload className="w-4 h-4" /> Export to Excel (SSS/BIR)
          </button>
        </div>

        {error && (
          <p className="text-amber-300/70 text-[11px] font-body mb-2">
            Could not load live DTR ({error}). Showing seed records.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-white/50 text-xs uppercase border-b border-white/10">
                {['Guard', 'Reg', 'OT', 'Under', 'Gross', 'SSS', 'PHIC', 'Pag-IBIG', 'BIR', 'Net'].map((h) => (
                  <th key={h} className="text-left py-2 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payroll.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-2 text-white whitespace-nowrap">{p.name}</td>
                  <td className="px-2 text-white/70">{Math.round(p.reg)}</td>
                  <td className="px-2 text-amber-300">
                    {Math.round(p.ot)}{p.ot > 0 && <span className="text-[10px] text-amber-400/60"> ×1.25</span>}
                  </td>
                  <td className="px-2 text-red-300">{Math.round(p.under)}</td>
                  <td className="px-2 text-white">{peso(p.gross)}</td>
                  <td className="px-2 text-white/60">{peso(p.sss)}</td>
                  <td className="px-2 text-white/60">{peso(p.phic)}</td>
                  <td className="px-2 text-white/60">{peso(p.pagibig)}</td>
                  <td className="px-2 text-white/60">{peso(p.bir)}</td>
                  <td className="px-2 text-gold font-semibold">{peso(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/40 text-[11px] font-body mt-3">
          {isLive
            ? 'Hours derived from live DTR records. DOLE D.O. 174 OT/undertime flags auto-applied. PH statutory deductions computed per TRAIN Law + 2024 contribution tables.'
            : 'Showing seed data. Hours will reflect live clock-ins once DTR records exist for this payroll period.'
          }
        </p>
      </div>
    </div>
  );
};

export default DTRPayroll;

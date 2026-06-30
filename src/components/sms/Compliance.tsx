import React from 'react';
import { guards, vault } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { IconLock, IconAlert, IconFile, IconCheck } from './icons';

const daysUntil = (d: string) => {
  if (d === '—') return 9999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

const Compliance: React.FC = () => {
  const { pushToast } = useSystem();
  const expiring = guards.map((g) => ({ name: g.name, sosia: daysUntil(g.licenseExpiry), nbi: daysUntil(g.nbiExpiry), licenseExpiry: g.licenseExpiry, nbiExpiry: g.nbiExpiry }));

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <h3 className="text-white font-display text-lg flex items-center gap-2 mb-1"><IconAlert className="w-5 h-5 text-amber-300" /> License Expiry Watch (30-day)</h3>
        <p className="text-white/50 text-xs font-body mb-3">PNP-SOSIA licenses & NBI clearances. Flagged ≤30 days.</p>
        <div className="space-y-2">
          {expiring.map((e) => {
            const minDays = Math.min(e.sosia, e.nbi);
            const warn = minDays <= 30;
            return (
              <div key={e.name} className={`rounded-2xl p-3 flex flex-wrap items-center gap-3 ${warn ? 'glass-red' : 'glass'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${warn ? 'bg-red-500 pulse-red' : 'bg-green-400'}`} />
                <span className="text-white font-body flex-1 min-w-[120px]">{e.name}</span>
                <span className="text-xs font-body text-white/70">SOSIA: <span className={e.sosia <= 30 ? 'text-red-300' : 'text-green-300'}>{e.sosia}d</span></span>
                <span className="text-xs font-body text-white/70">NBI: <span className={e.nbi <= 30 ? 'text-red-300' : 'text-green-300'}>{e.nbi}d</span></span>
                {warn && <button onClick={() => pushToast(`Renewal reminder sent to ${e.name} & admin.`, 'ok')} className="glass-gold text-gold text-xs font-body px-3 py-1.5 rounded-xl min-h-[36px]">Notify</button>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg flex items-center gap-2 mb-3"><IconLock className="w-5 h-5 text-gold" /> Encrypted Document Vault</h3>
          <div className="space-y-2">
            {vault.map((d) => (
              <div key={d.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <IconFile className="w-5 h-5 text-white/50 shrink-0" />
                <div className="flex-1">
                  <div className="text-white text-sm font-body">{d.name}</div>
                  <div className="text-white/40 text-xs font-body">{d.type} · expiry {d.expiry}</div>
                </div>
                <span className="text-[11px] text-green-300 font-body flex items-center gap-1"><IconLock className="w-3 h-3" />AES-256</span>
                <button onClick={() => pushToast(`${d.name} opened — access logged (RBAC + DPA RA10173).`, 'info')} className="text-gold text-xs font-body glass px-2.5 py-1.5 rounded-xl min-h-[36px]">View</button>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-[11px] font-body mt-3">15-minute audit readiness · full access trail.</p>
        </div>

        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg mb-3">Regulatory Posture</h3>
          <div className="space-y-2">
            {[['RA 10173 — Data Privacy Act', 'Compliant'], ['RA 10121 — DRRM Tagging', 'Active'], ['DOLE D.O. 174 — Contracting', 'Registered'], ['PNP-SOSIA — Agency License', 'Valid'], ['BIR — Withholding Tax', 'Filed']].map(([a, b]) => (
              <div key={a} className="glass rounded-2xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-white/80 text-sm font-body">{a}</span>
                <span className="text-green-300 text-xs font-body flex items-center gap-1"><IconCheck className="w-3.5 h-3.5" />{b}</span>
              </div>
            ))}
          </div>
          <div className="glass-gold rounded-2xl p-3 mt-3">
            <p className="text-gold font-display text-sm">Role-Based Access Control</p>
            <p className="text-white/60 text-[11px] font-body mt-1">Supervisors → assigned sites only. Admins → payroll + vault. All access scoped & logged.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Compliance;

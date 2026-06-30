import React from 'react';
import { payroll } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { IconDownload, IconClock } from './icons';

const peso = (n: number) => '₱' + n.toLocaleString('en-PH');

const DTRPayroll: React.FC = () => {
  const { pushToast } = useSystem();
  const totGross = payroll.reduce((s, p) => s + p.gross, 0);
  const totNet = payroll.reduce((s, p) => s + p.net, 0);
  const totOt = payroll.reduce((s, p) => s + p.ot, 0);

  const exportExcel = () => {
    const header = ['ID', 'Name', 'Reg Hrs', 'OT', 'Under', 'Gross', 'SSS', 'PhilHealth', 'Pag-IBIG', 'BIR', 'Net'];
    const rows = payroll.map((p) => [p.id, p.name, p.reg, p.ot, p.under, p.gross, p.sss, p.phic, p.pagibig, p.bir, p.net].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Stronghold_A3_DTR_Payroll.csv'; a.click();
    URL.revokeObjectURL(url);
    pushToast('DTR exported — SSS/PhilHealth/Pag-IBIG/BIR formatted CSV ready for Excel.', 'ok');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total Gross', peso(totGross), 'text-gold'], ['Total Net Pay', peso(totNet), 'text-green-300'], ['OT Hours', totOt + ' hrs', 'text-amber-300'], ['Cut-off', 'Jun 1–15', 'text-white']].map(([l, v, t]) => (
          <div key={l} className="glass rounded-2xl p-4"><div className={`text-2xl font-display font-bold ${t}`}>{v}</div><div className="text-xs text-white/55 font-body mt-1 uppercase">{l}</div></div>
        ))}
      </div>

      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-display text-lg flex items-center gap-2"><IconClock className="w-5 h-5 text-gold" /> Automated DTR Consolidation</h3>
          <button onClick={exportExcel} className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display px-4 py-2.5 rounded-2xl min-h-[44px] flex items-center gap-2 text-sm transition">
            <IconDownload className="w-4 h-4" /> Export to Excel (SSS/BIR)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-white/50 text-xs uppercase border-b border-white/10">
                {['Guard', 'Reg', 'OT', 'Under', 'Gross', 'SSS', 'PHIC', 'Pag-IBIG', 'BIR', 'Net'].map((h) => <th key={h} className="text-left py-2 px-2 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payroll.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-2 text-white whitespace-nowrap">{p.name}</td>
                  <td className="px-2 text-white/70">{p.reg}</td>
                  <td className="px-2 text-amber-300">{p.ot}{p.ot > 0 && <span className="text-[10px] text-amber-400/60"> ×1.25</span>}</td>
                  <td className="px-2 text-red-300">{p.under}</td>
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
        <p className="text-white/40 text-[11px] font-body mt-3">Hours derived from biometric face + GPS geofence clock-ins. DOLE D.O. 174 OT/undertime flags auto-applied.</p>
      </div>
    </div>
  );
};
export default DTRPayroll;

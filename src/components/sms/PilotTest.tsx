import React, { useState } from 'react';
import { useSystem } from './SystemContext';
import { IconCheck, IconShield } from './icons';

const tests = [
  { id: 'air', name: 'Airplane Mode Test', desc: '1h data blackout → patrol logs complete & auto-sync.' },
  { id: 'batt', name: 'Low Battery Test', desc: 'Benchmark drain from 15% with Lite Mode on.' },
  { id: 'sms', name: 'SMS Fallback Test', desc: 'Disable SIM data → Ops still gets coded reports.' },
  { id: 'pay', name: 'Payroll Export Test', desc: 'DTR exports seamlessly into Excel templates.' },
];

const PilotTest: React.FC = () => {
  const { pushToast } = useSystem();
  const [passed, setPassed] = useState<string[]>([]);
  const run = (id: string, name: string) => {
    pushToast(`Running ${name}...`, 'info');
    setTimeout(() => { setPassed((p) => [...new Set([...p, id])]); pushToast(`${name} PASSED.`, 'ok'); }, 1200);
  };
  return (
    <div className="glass-strong rounded-3xl p-4">
      <h3 className="text-white font-display text-lg flex items-center gap-2 mb-1"><IconShield className="w-5 h-5 text-gold" /> 3-Day Pilot · "Tacloban Survival" Test</h3>
      <p className="text-white/50 text-xs font-body mb-3">5 guards · 1 supervisor · unhappy-path validation. {passed.length}/4 passed.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {tests.map((t) => {
          const ok = passed.includes(t.id);
          return (
            <div key={t.id} className={`rounded-2xl p-3 ${ok ? 'glass-gold' : 'glass'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`font-body text-sm font-semibold ${ok ? 'text-gold' : 'text-white'}`}>{t.name}</span>
                {ok ? <IconCheck className="w-4 h-4 text-gold" /> : <button onClick={() => run(t.id, t.name)} className="text-[11px] text-gold glass px-2 py-1 rounded-lg">Run</button>}
              </div>
              <p className="text-white/50 text-[11px] font-body">{t.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default PilotTest;

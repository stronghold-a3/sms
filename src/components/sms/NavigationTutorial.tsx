import React, { useEffect, useState } from 'react';
import { IconX, IconArrowRight, IconShield, IconMap, IconClock, IconFile, IconUsers, IconBook, IconCheck } from './icons';

interface Step {
  title: string;
  body: string;
  Icon: React.FC<{ className?: string }>;
}

const STEPS: Step[] = [
  { title: 'Ops Command Center', body: 'Your home base. See every guard live on the map, monitor battery & sync status, review incidents, and broadcast crisis alerts in one tap.', Icon: IconShield },
  { title: 'Field Patrol (Offline-First)', body: 'Guards scan QR / NFC checkpoints and file incident reports — even with no signal. Everything syncs automatically when connectivity returns.', Icon: IconMap },
  { title: 'DTR & Payroll', body: 'Daily Time Records consolidate automatically. Overtime, undertime and DOLE-compliant deductions (SSS, PhilHealth, Pag-IBIG, BIR) are computed for you.', Icon: IconClock },
  { title: 'Compliance Vault', body: 'A single encrypted home for PNP-SOSIA licenses, LGU permits and guard clearances. Expiry alerts keep you audit-ready, always.', Icon: IconFile },
  { title: 'Client Portal', body: 'Give clients a white-label, view-only window into their sites — live guard status and automated daily / post-crisis reports.', Icon: IconUsers },
  { title: 'Resources & Settings', body: 'Open Resources in the sidebar for policies & protocols. Use Settings to manage your profile, security, notifications, updates and integrations.', Icon: IconBook },
];

const NavigationTutorial: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (open) {
      setI(0);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Navigation tutorial">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl p-6 sm:p-8 w-full max-w-lg animate-spring">
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-white/50 hover:text-white">
          <IconX className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-gold font-display text-sm tracking-widest">NAVIGATION TUTORIAL</span>
          <span className="text-white/40 text-xs font-body ml-auto">{i + 1} / {STEPS.length}</span>
        </div>

        <div className="flex flex-col items-center text-center" key={i}>
          <div className="glass-gold rounded-3xl p-5 mb-4 animate-spring">
            <step.Icon className="w-12 h-12 text-gold" />
          </div>
          <h3 className="font-display text-2xl text-white mb-2">{step.title}</h3>
          <p className="text-white/60 font-body text-sm leading-relaxed max-w-sm">{step.body}</p>
        </div>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 my-6">
          {STEPS.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`Go to step ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
            className="glass rounded-2xl px-4 py-3 text-white/70 font-body text-sm disabled:opacity-30 min-h-[48px]">Back</button>
          {last ? (
            <button onClick={onClose} className="flex-1 bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-4 py-3 min-h-[48px] flex items-center justify-center gap-2 transition">
              <IconCheck className="w-4 h-4" /> Got it
            </button>
          ) : (
            <button onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
              className="flex-1 bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-4 py-3 min-h-[48px] flex items-center justify-center gap-2 transition">
              Next <IconArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationTutorial;

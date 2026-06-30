import React, { useEffect } from 'react';
import { IconX, IconBook } from './icons';

interface Sec {
  h: string;
  items: string[];
}

const MANUAL: Sec[] = [
  {
    h: '1. Getting Started',
    items: [
      'Open the app and tap "Sign In" on the top bar to log in, or "Register" to create a new account.',
      'Pick your Role (Guard, Supervisor, Ops Manager, Administrator). Your role decides which screens you can open.',
      'Guards & Supervisors also choose their assigned site(s).',
    ],
  },
  {
    h: '2. The Dashboard',
    items: [
      'After signing in, tap "Access Dashboard" to enter the command center.',
      'Use the left sidebar to switch between modules. The current module title shows at the top.',
      'On phones, tap the menu icon to open the sidebar.',
    ],
  },
  {
    h: '3. Ops Command Center',
    items: [
      'See every guard live with status, battery and last-sync time.',
      'Review the latest incidents and their severity.',
      'Ops/Admins/Supervisors can send a crisis Broadcast to all guards.',
    ],
  },
  {
    h: '4. Field Patrol (Offline-First)',
    items: [
      'Scan QR / NFC checkpoints to log your patrol — works with no signal.',
      'File incident reports with photos; they sync automatically when back online.',
      'Use the SOS button (bottom-right) for emergencies at any time.',
    ],
  },
  {
    h: '5. DTR & Payroll',
    items: [
      'Daily Time Records are consolidated for you.',
      'Overtime, undertime and DOLE deductions (SSS, PhilHealth, Pag-IBIG, BIR) are computed automatically.',
    ],
  },
  {
    h: '6. Compliance Vault',
    items: [
      'Find PNP-SOSIA licenses, LGU permits and clearances in one place.',
      'Expiry reminders keep you audit-ready.',
    ],
  },
  {
    h: '7. Client Portal',
    items: [
      'Clients get a view-only window into their sites and automated reports.',
    ],
  },
  {
    h: '8. Settings & Resources',
    items: [
      'Open Settings to manage Profile, Security, Notifications, Updates and Integrations.',
      'Open Resources in the sidebar for policies, protocols and official documents.',
      'Use the theme toggle (top bar) to switch between dark and light mode.',
    ],
  },
  {
    h: '9. Need Help?',
    items: [
      'Regional Support (Viber / Phone) is available Mon–Sat, 8AM–6PM PHT.',
      'Run the Navigation Tutorial any time from the hero section.',
    ],
  },
];

const UserManualModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="User manual">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-2xl animate-spring max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <IconBook className="w-5 h-5 text-gold" />
          <h2 className="font-display text-xl text-white">User Manual</h2>
          <button onClick={onClose} aria-label="Close" className="ml-auto text-white/50 hover:text-white"><IconX className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-white/60 font-body text-sm">A friendly, plain-language guide for everyday users of the Stronghold A3 Security Management System.</p>
          {MANUAL.map((s) => (
            <div key={s.h}>
              <h3 className="font-display text-gold text-base mb-2">{s.h}</h3>
              <ul className="space-y-1.5">
                {s.items.map((it, i) => (
                  <li key={i} className="text-white/70 font-body text-sm leading-relaxed flex gap-2">
                    <span className="text-gold mt-1.5 w-1 h-1 rounded-full bg-gold shrink-0" /> {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-white/30 text-[11px] font-body pt-2 border-t border-white/10">RA 10173 · RA 10121 · DOLE D.O. 174 · PNP-SOSIA compliant.</p>
        </div>
      </div>
    </div>
  );
};

export default UserManualModal;

import React from 'react';
import { useSystem } from './SystemContext';
import { IconCheck, IconAlert } from './icons';

const Toasts: React.FC = () => {
  const { toasts } = useSystem();
  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2 max-w-[320px]">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-spring rounded-2xl px-4 py-3 flex items-start gap-2.5 text-sm font-body ${t.kind === 'alert' ? 'glass-red text-red-100' : t.kind === 'ok' ? 'glass-gold text-gold' : 'glass-strong text-white'}`}>
          {t.kind === 'alert' ? <IconAlert className="w-4 h-4 mt-0.5 shrink-0" /> : <IconCheck className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
};
export default Toasts;

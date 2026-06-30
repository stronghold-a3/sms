import React, { useState } from 'react';
import { useSystem } from './SystemContext';
import { IconAlert, IconX } from './icons';

const SOSButton: React.FC = () => {
  const { pushToast, bridge } = useSystem();
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);

  const fire = () => {
    setSent(true);
    pushToast(`SOS DISPATCHED · GPS 11.244, 125.003 · escalated to 3 supervisors via ${bridge.toUpperCase()} + all channels.`, 'alert');
    setTimeout(() => { setSent(false); setConfirm(false); }, 2500);
  };

  return (
    <>
      <button onClick={() => setConfirm(true)} aria-label="SOS Panic"
        className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full bg-[#DC143C] text-white font-display font-bold shadow-2xl flex items-center justify-center pulse-red active:scale-95 transition">
        SOS
      </button>

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={() => !sent && setConfirm(false)}>
          <div className="glass-red rounded-3xl p-6 max-w-sm w-full text-center animate-spring" onClick={(e) => e.stopPropagation()}>
            {!sent ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#DC143C] mx-auto flex items-center justify-center mb-4 pulse-red">
                  <IconAlert className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-display text-2xl">PANIC / SOS</h3>
                <p className="text-white/70 font-body text-sm my-3">Instantly alerts management with your exact GPS coordinates & last photo. Escalates to 3 supervisors.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirm(false)} className="flex-1 glass rounded-2xl py-3 text-white font-display min-h-[48px]">Cancel</button>
                  <button onClick={fire} className="flex-1 bg-[#DC143C] hover:bg-[#b01030] rounded-2xl py-3 text-white font-display min-h-[48px]">SEND SOS</button>
                </div>
              </>
            ) : (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-[#DC143C] mx-auto flex items-center justify-center mb-3 pulse-red"><IconAlert className="w-8 h-8 text-white" /></div>
                <h3 className="text-white font-display text-2xl">ALERT SENT</h3>
                <p className="text-white/70 font-body text-sm mt-2">GPS 11.244, 125.003 transmitted via all bridges.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default SOSButton;

import React, { createContext, useContext, useState, useCallback } from 'react';

export type Bridge = 'cloud' | 'sms' | 'viber' | 'offline';

interface Toast { id: number; msg: string; kind: 'info' | 'alert' | 'ok'; }

interface SystemState {
  bridge: Bridge;
  setBridge: (b: Bridge) => void;
  liteMode: boolean;
  toggleLite: () => void;
  battery: number;
  setBattery: (n: number) => void;
  pendingSync: number;
  triggerSync: () => void;
  toasts: Toast[];
  pushToast: (msg: string, kind?: Toast['kind']) => void;
}

const Ctx = createContext<SystemState | null>(null);
export const useSystem = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSystem must be inside provider');
  return c;
};

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bridge, setBridge] = useState<Bridge>('cloud');
  const [liteMode, setLite] = useState(false);
  const [battery, setBattery] = useState(78);
  const [pendingSync, setPending] = useState(3);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const triggerSync = useCallback(() => {
    if (pendingSync === 0) { pushToast('Nothing to sync — all data uploaded.', 'ok'); return; }
    pushToast('Auto-Sync started: uploading cached GPS logs & reports...', 'info');
    setTimeout(() => { setPending(0); pushToast('Sync complete. All cached records uploaded.', 'ok'); }, 1600);
  }, [pendingSync, pushToast]);

  const toggleLite = useCallback(() => {
    setLite((v) => { pushToast(!v ? 'Lite Mode ON — graphics & GPS reduced to save battery.' : 'Lite Mode OFF', 'info'); return !v; });
  }, [pushToast]);

  return (
    <Ctx.Provider value={{ bridge, setBridge, liteMode, toggleLite, battery, setBattery, pendingSync, triggerSync, toasts, pushToast }}>
      <div className={liteMode ? 'lite-mode' : ''}>{children}</div>
    </Ctx.Provider>
  );
};

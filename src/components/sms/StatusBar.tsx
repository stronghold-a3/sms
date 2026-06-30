import React from 'react';
import { useSystem } from './SystemContext';
import { IconWifi, IconMessage, IconRadio, IconSync, IconBattery, IconBolt } from './icons';

const StatusBar: React.FC = () => {
  const { bridge, setBridge, battery, pendingSync, triggerSync, liteMode, toggleLite } = useSystem();

  const bridges = [
    { key: 'cloud', label: 'Bridge 1 · Cloud', Icon: IconWifi, color: 'bg-green-500', text: 'text-green-300' },
    { key: 'sms', label: 'Bridge 2 · SMS', Icon: IconMessage, color: 'bg-amber-500', text: 'text-amber-300' },
    { key: 'viber', label: 'Bridge 3 · Viber/Radio', Icon: IconRadio, color: 'bg-violet-500', text: 'text-violet-300' },
  ] as const;

  return (
    <div className="glass-strong rounded-2xl px-3 py-2.5 flex flex-wrap items-center gap-2 sticky top-2 z-30">
      <div className="flex items-center gap-1.5">
        {bridges.map((b) => {
          const active = bridge === b.key;
          return (
            <button key={b.key} onClick={() => setBridge(b.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-body transition ${active ? 'glass-gold text-gold' : 'text-white/55 hover:text-white'}`}>
              <span className={`relative w-2 h-2 rounded-full ${active ? b.color + (b.key === 'cloud' ? ' pulse-green' : '') : 'bg-white/20'}`} />
              <b.Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{b.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <button onClick={triggerSync} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-body glass text-white hover:glass-gold transition">
        <IconSync className="w-4 h-4" />
        <span>{pendingSync > 0 ? `${pendingSync} pending` : 'Synced'}</span>
      </button>
      <button onClick={toggleLite} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-body transition ${liteMode ? 'glass-gold text-gold' : 'glass text-white'}`}>
        <IconBolt className="w-4 h-4" />
        <span className="hidden sm:inline">Lite</span>
      </button>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-body glass ${battery < 20 ? 'text-red-400' : 'text-white'}`}>
        <IconBattery className="w-4 h-4" />
        <span>{battery}%</span>
      </div>
    </div>
  );
};

export default StatusBar;

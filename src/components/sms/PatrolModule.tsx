import React, { useState } from 'react';
import { postOrders as seed } from '@/data/strongholdData';
import { useSystem } from './SystemContext';
import { IconQr, IconCamera, IconCheck, IconShield } from './icons';

const PatrolModule: React.FC<{ sites?: string[] }> = ({ sites }) => {
  const siteName = sites && sites.length > 0 ? sites[0] : 'Robinsons Place';
  const { pushToast, bridge } = useSystem();
  const [orders, setOrders] = useState(seed);
  const done = orders.filter((o) => o.done).length;
  const pct = Math.round((done / orders.length) * 100);

  const scan = (id: string, kind: string) => {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, done: true } : x)));
    pushToast(`${kind} verified — anti-buddy-punch confirmed. ${bridge === 'cloud' ? 'Uploaded.' : 'Cached for auto-sync.'}`, 'ok');
  };

  const [report, setReport] = useState('');
  const submitReport = () => {
    if (!report.trim()) { pushToast('Enter incident details first.', 'alert'); return; }
    if (bridge === 'cloud') pushToast('Incident report uploaded to cloud.', 'ok');
    else if (bridge === 'sms') pushToast(`SMS Fallback: coded report (160ch) sent → "A3#INC SITE:RPT TYP:OBS ${report.slice(0, 12).toUpperCase()}..."`, 'ok');
    else pushToast('Report queued for Viber/Radio relay.', 'ok');
    setReport('');
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-display text-lg flex items-center gap-2"><IconShield className="w-5 h-5 text-gold" /> Tour Checklist · {siteName}</h3>
          <span className="text-gold font-display text-lg">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#ffaa00] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className={`glass rounded-2xl p-3 flex items-center gap-3 ${o.done ? 'opacity-60' : ''}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${o.done ? 'bg-green-500' : 'border-2 border-white/30'}`}>
                {o.done && <IconCheck className="w-4 h-4 text-white" />}
              </span>
              <div className="flex-1">
                <div className={`font-body text-sm ${o.done ? 'line-through text-white/50' : 'text-white'}`}>{o.title}</div>
                <div className="text-white/40 text-xs font-body">Due {o.time} · {o.site}</div>
              </div>
              {!o.done && (
                <button onClick={() => scan(o.id, o.title.includes('NFC') ? 'NFC tag' : o.title.includes('Photo') ? 'Photo evidence' : 'QR checkpoint')}
                  className="glass-gold text-gold rounded-xl px-3 py-2 min-h-[44px] flex items-center gap-1.5 text-sm font-body">
                  {o.title.includes('Photo') ? <IconCamera className="w-4 h-4" /> : <IconQr className="w-4 h-4" />}
                  {o.title.includes('Photo') ? 'Capture' : 'Scan'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-strong rounded-3xl p-4">
          <h3 className="text-white font-display text-lg mb-2">Field Incident Report</h3>
          <p className="text-white/50 text-xs font-body mb-3">Works offline. Routes via <span className="text-gold uppercase">{bridge}</span> bridge automatically.</p>
          <textarea value={report} onChange={(e) => setReport(e.target.value)} rows={4} placeholder="Describe observation / incident..."
            className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 resize-none" />
          <button onClick={submitReport} className="mt-3 w-full bg-[#003a7a] hover:bg-[#004a9a] text-white font-display py-3 rounded-2xl min-h-[48px] transition">SUBMIT REPORT</button>
        </div>
        <div className="glass-strong rounded-3xl p-4 flex flex-col">
          <h3 className="text-white font-display text-lg mb-2">Offline Cache Status</h3>
          <div className="space-y-2 flex-1 font-body text-sm">
            {[['Post orders cached', '12 templates'], ['GPS breadcrumbs', '72h local store'], ['Photo evidence', 'auto-compressed'], ['Incident drafts', '2 queued']].map(([a, b]) => (
              <div key={a} className="glass rounded-xl px-3 py-2.5 flex justify-between">
                <span className="text-white/80">{a}</span><span className="text-gold">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-[11px] font-body mt-3">All cached records auto-upload the moment connectivity returns.</p>
        </div>
      </div>
    </div>
  );
};
export default PatrolModule;

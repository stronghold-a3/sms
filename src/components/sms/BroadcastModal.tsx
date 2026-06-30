import React, { useState } from 'react';
import { useSystem } from './SystemContext';
import { supabase } from '@/lib/supabase';
import { IconX, IconWifi, IconMessage, IconRadio } from './icons';

const presets = [
  'TYPHOON SIGNAL #3 — All sites secure perimeter, activate DRRM protocol.',
  'ALL UNITS report status immediately via active bridge.',
  'Storm surge advisory — evacuate ground-floor posts to muster point.',
];

const BroadcastModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { pushToast } = useSystem();
  const [msg, setMsg] = useState(presets[0]);
  const [ch, setCh] = useState({ push: true, sms: true, viber: true });
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  if (!open) return null;

  const aiDraft = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-ai-assistant', {
        body: {
          prompt: `Improve and tighten this security mass-alert SMS into a clear, professional broadcast under 320 characters: "${msg}"`,
        },
      });
      if (error) throw error;
      if (data?.reply) {
        setMsg(String(data.reply).trim());
        pushToast('AI refined the broadcast message.', 'info');
      } else {
        pushToast('AI did not return a draft.', 'alert');
      }
    } catch (e) {
      pushToast('AI assistant unavailable right now.', 'alert');
    } finally {
      setAiBusy(false);
    }
  };

  const send = async () => {
    const channels = Object.entries(ch).filter(([, v]) => v).map(([k]) => k.toUpperCase());
    if (!channels.length) {
      pushToast('Select at least one channel.', 'alert');
      return;
    }
    if (!msg.trim()) {
      pushToast('Message cannot be empty.', 'alert');
      return;
    }

    setBusy(true);
    try {
      // Real SMS delivery via Twilio when SMS channel is enabled and a test recipient is given
      if (ch.sms && phone.trim()) {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: { to: phone.trim(), body: msg },
        });
        if (error) throw error;
        if (data?.sent > 0) {
          pushToast(`SMS delivered to ${phone.trim()} via Twilio.`, 'info');
        } else {
          pushToast(`Twilio rejected the SMS: ${data?.results?.[0]?.error || 'unknown error'}.`, 'alert');
        }
      }

      pushToast(`RED ALERT broadcast queued to ALL personnel via ${channels.join(' + ')}.`, 'alert');
      onClose();
    } catch (e) {
      pushToast('Broadcast partially failed — check connectivity.', 'alert');
    } finally {
      setBusy(false);
    }
  };

  const Toggle = ({ k, label, Icon }: { k: keyof typeof ch; label: string; Icon: React.FC<{ className?: string }> }) => (
    <button
      onClick={() => setCh((c) => ({ ...c, [k]: !c[k] }))}
      className={`flex-1 rounded-2xl p-3 flex flex-col items-center gap-1 min-h-[64px] transition ${ch[k] ? 'glass-gold text-gold' : 'glass text-white/50'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-body">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="glass-strong rounded-3xl p-5 max-w-md w-full animate-spring max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-display text-xl">Mass Red Alert Broadcast</h3>
          <button onClick={onClose} className="text-white/60"><IconX className="w-5 h-5" /></button>
        </div>

        <p className="text-white/50 text-xs font-body mb-2">Quick presets:</p>
        <div className="space-y-1.5 mb-3">
          {presets.map((p) => (
            <button key={p} onClick={() => setMsg(p)} className={`w-full text-left text-xs font-body rounded-xl px-3 py-2 ${msg === p ? 'glass-gold text-gold' : 'glass text-white/70'}`}>{p}</button>
          ))}
        </div>

        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 resize-none mb-2" />

        <button
          onClick={aiDraft}
          disabled={aiBusy}
          className="w-full mb-3 glass-gold text-gold rounded-2xl py-2.5 text-xs font-display tracking-wide disabled:opacity-50 transition"
        >
          {aiBusy ? 'AI drafting…' : '✦ Refine with AI Assistant'}
        </button>

        <div className="flex gap-2 mb-3">
          <Toggle k="push" label="Push" Icon={IconWifi} />
          <Toggle k="sms" label="SMS" Icon={IconMessage} />
          <Toggle k="viber" label="Viber/Radio" Icon={IconRadio} />
        </div>

        {ch.sms && (
          <div className="mb-4">
            <label className="text-white/50 text-xs font-body mb-1.5 block">Live SMS test recipient (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+639XXXXXXXXX"
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 min-h-[48px]"
            />
            <p className="text-white/30 text-[11px] font-body mt-1">Sends a real Twilio SMS to this number for verification.</p>
          </div>
        )}

        <button
          onClick={send}
          disabled={busy}
          className="w-full bg-[#DC143C] hover:bg-[#b01030] disabled:opacity-50 text-white font-display tracking-wide py-3.5 rounded-2xl min-h-[52px] transition"
        >
          {busy ? 'SENDING…' : 'SEND TO ALL PERSONNEL'}
        </button>
      </div>
    </div>
  );
};

export default BroadcastModal;

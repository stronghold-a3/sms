import React, { useState } from 'react';
import { useAuth, ROLE_LABEL } from './AuthContext';
import { hybridIntegrations } from '@/data/strongholdData';
import { IconX, IconUser, IconLock, IconBell, IconRefresh, IconLink, IconCheck } from './icons';

type Section = 'profile' | 'security' | 'notifications' | 'updates' | 'integration';

const NAV: { key: Section; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'profile', label: 'Profile', Icon: IconUser },
  { key: 'security', label: 'Security', Icon: IconLock },
  { key: 'notifications', label: 'Notifications', Icon: IconBell },
  { key: 'updates', label: 'Updates', Icon: IconRefresh },
  { key: 'integration', label: 'Integrations', Icon: IconLink },
];

const APP_VERSION = '2.4.0';

const field =
  'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 placeholder:text-white/30 min-h-[48px] transition-colors';
const labelCls = 'text-white/50 text-xs font-body mb-1.5 block';

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string; sub?: string }> = ({ checked, onChange, label, sub }) => (
  <button type="button" onClick={onChange} className="w-full flex items-center gap-3 glass rounded-2xl px-4 py-3 text-left">
    <div className="flex-1">
      <div className="text-white font-body text-sm">{label}</div>
      {sub && <div className="text-white/40 text-[11px] font-body">{sub}</div>}
    </div>
    <span className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-gold' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
);

const Saved: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <div className="glass-gold rounded-xl px-3 py-2 text-gold text-xs font-body flex items-center gap-2">
      <IconCheck className="w-4 h-4" /> Saved successfully.
    </div>
  ) : null;

const Settings: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>('profile');
  const [saved, setSaved] = useState<Section | null>(null);

  // Profile
  const [name, setName] = useState(profile?.full_name || 'Operative');
  const [phone, setPhone] = useState('');
  // Security
  const [twoFA, setTwoFA] = useState(true);
  const [pw, setPw] = useState('');
  // Notifications
  const [notif, setNotif] = useState({ email: true, sms: true, push: true, crisis: true, expiry: true });
  // Updates
  const [checking, setChecking] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [upToDate, setUpToDate] = useState(false);
  // Integration
  const [webhook, setWebhook] = useState(hybridIntegrations[0]?.webhook_url || '');

  if (!open) return null;

  const flash = (s: Section) => {
    setSaved(s);
    setTimeout(() => setSaved(null), 2500);
  };

  const checkUpdates = () => {
    setChecking(true);
    setUpToDate(false);
    setTimeout(() => {
      setChecking(false);
      setUpToDate(true);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-3xl animate-spring max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <h2 className="font-display text-xl text-white">Configuration Settings</h2>
          <button onClick={onClose} aria-label="Close" className="ml-auto text-white/50 hover:text-white"><IconX className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          {/* Nav */}
          <nav className="sm:w-52 p-3 flex sm:flex-col gap-1.5 overflow-x-auto border-b sm:border-b-0 sm:border-r border-white/10">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setSection(n.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-body whitespace-nowrap transition ${section === n.key ? 'glass-gold text-gold' : 'text-white/60 hover:bg-white/5'}`}>
                <n.Icon className="w-4 h-4" /> {n.label}
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {section === 'profile' && (
              <>
                <h3 className="font-display text-white text-lg">Profile</h3>
                <div className="glass-gold rounded-2xl p-3 text-xs font-body text-white/70">Signed in as <span className="text-gold">{profile?.full_name || 'Operative'}</span> · {profile ? ROLE_LABEL[profile.role] : 'Demo'}</div>
                <div><label className={labelCls}>Display name</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><label className={labelCls}>Mobile number</label><input className={field} type="tel" placeholder="09XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <Saved show={saved === 'profile'} />
                <button onClick={() => flash('profile')} className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-5 py-3 min-h-[48px] transition">Save Profile</button>
              </>
            )}

            {section === 'security' && (
              <>
                <h3 className="font-display text-white text-lg">Security</h3>
                <Toggle checked={twoFA} onChange={() => setTwoFA((v) => !v)} label="Two-Factor Authentication" sub="Require an OTP on every new device." />
                <div><label className={labelCls}>Change password</label><input className={field} type="password" placeholder="New password (min 6 chars)" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
                <p className="text-white/40 text-[11px] font-body">Role-Based Access Control is enforced server-side. Sessions expire after 12 hours of inactivity.</p>
                <Saved show={saved === 'security'} />
                <button onClick={() => { setPw(''); flash('security'); }} className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-5 py-3 min-h-[48px] transition">Update Security</button>
              </>
            )}

            {section === 'notifications' && (
              <>
                <h3 className="font-display text-white text-lg">Notifications</h3>
                <Toggle checked={notif.email} onChange={() => setNotif((n) => ({ ...n, email: !n.email }))} label="Email updates" sub="Client & document changes via SendGrid." />
                <Toggle checked={notif.sms} onChange={() => setNotif((n) => ({ ...n, sms: !n.sms }))} label="SMS alerts" sub="Critical alerts via Twilio (Msg & data rates may apply)." />
                <Toggle checked={notif.push} onChange={() => setNotif((n) => ({ ...n, push: !n.push }))} label="Push notifications" sub="In-app real-time pushes." />
                <Toggle checked={notif.crisis} onChange={() => setNotif((n) => ({ ...n, crisis: !n.crisis }))} label="Crisis broadcasts" sub="Typhoon / emergency activations." />
                <Toggle checked={notif.expiry} onChange={() => setNotif((n) => ({ ...n, expiry: !n.expiry }))} label="License expiry reminders" sub="PNP / NBI / medical clearances." />
                <Saved show={saved === 'notifications'} />
                <button onClick={() => flash('notifications')} className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-5 py-3 min-h-[48px] transition">Save Preferences</button>
              </>
            )}

            {section === 'updates' && (
              <>
                <h3 className="font-display text-white text-lg">Updates</h3>
                <div className="glass rounded-2xl p-4">
                  <div className="text-white/60 text-xs font-body">Current version</div>
                  <div className="text-gold font-display text-2xl">v{APP_VERSION}</div>
                </div>
                <Toggle checked={autoUpdate} onChange={() => setAutoUpdate((v) => !v)} label="Automatic updates" sub="Apply patches during the next low-traffic window." />
                <div className="glass rounded-2xl p-4 text-xs font-body text-white/60 space-y-1">
                  <p className="text-white font-display text-sm mb-1">What&apos;s new</p>
                  <p>• Landing experience, navigation tutorial &amp; user manual.</p>
                  <p>• Email notifications (SendGrid) for client &amp; document changes.</p>
                  <p>• SMS AI Assistant powered by the AI Gateway.</p>
                  <p>• Configuration Settings &amp; Resources library.</p>
                </div>
                {upToDate && <div className="glass-gold rounded-xl px-3 py-2 text-gold text-xs font-body flex items-center gap-2"><IconCheck className="w-4 h-4" /> You&apos;re on the latest version.</div>}
                <button onClick={checkUpdates} disabled={checking} className="bg-[#003a7a] hover:bg-[#004a9a] disabled:opacity-50 text-white font-display rounded-2xl px-5 py-3 min-h-[48px] flex items-center gap-2 transition">
                  <IconRefresh className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Checking…' : 'Check for updates'}
                </button>
              </>
            )}

            {section === 'integration' && (
              <>
                <h3 className="font-display text-white text-lg">Integrations</h3>
                <div className="space-y-2">
                  {hybridIntegrations.map((h) => (
                    <div key={h.integration_id} className="glass rounded-2xl p-4 flex items-center gap-3">
                      <IconLink className="w-5 h-5 text-gold" />
                      <div className="flex-1"><div className="text-white font-body text-sm">{h.vendor_name}</div><div className="text-white/40 text-[11px] font-body break-all">{h.webhook_url}</div></div>
                      <span className={`text-[10px] font-body px-2 py-1 rounded-full ${h.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>{h.status}</span>
                    </div>
                  ))}
                </div>
                <div><label className={labelCls}>Outbound webhook URL</label><input className={field} value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://…" /></div>
                <p className="text-white/40 text-[11px] font-body">Connect CCTV, access-control or LGU DRRM feeds. API keys are stored encrypted on the backend.</p>
                <Saved show={saved === 'integration'} />
                <button onClick={() => flash('integration')} className="bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-5 py-3 min-h-[48px] transition">Save Integration</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

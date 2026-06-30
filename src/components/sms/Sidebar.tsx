import React, { useState } from 'react';
import { LOGO, RESOURCES } from '@/data/strongholdData';
import { IconShield, IconMap, IconClock, IconFile, IconUsers, IconX, IconBook, IconSettings, IconExternal, IconChevronRight, IconPlay } from './icons';
import { useAuth, ROLE_LABEL } from './AuthContext';

export type Tab = 'ops' | 'patrol' | 'dtr' | 'compliance' | 'client';

const items: { key: Tab; label: string; sub: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'ops', label: 'Ops Command', sub: '3-Bridge Center', Icon: IconShield },
  { key: 'patrol', label: 'Field Patrol', sub: 'Offline-First', Icon: IconMap },
  { key: 'dtr', label: 'DTR & Payroll', sub: 'DOLE Compliant', Icon: IconClock },
  { key: 'compliance', label: 'Compliance Vault', sub: 'PNP-SOSIA · DPA', Icon: IconFile },
  { key: 'client', label: 'Client Portal', sub: 'White-Label', Icon: IconUsers },
];

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  open: boolean;
  onClose: () => void;
  allowed: Tab[];
  onResource?: () => void;
  onSettings?: () => void;
  onTutorial?: () => void;
  onManual?: () => void;
}

const Sidebar: React.FC<Props> = ({ tab, setTab, open, onClose, allowed, onSettings, onTutorial, onManual }) => {
  const { profile, signOut } = useAuth();
  const visible = items.filter((i) => allowed.includes(i.key));
  const [resOpen, setResOpen] = useState(false);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 z-50 p-4 transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="glass-strong rounded-3xl h-full flex flex-col p-4 overflow-y-auto">
          <div className="flex items-center gap-3 mb-5 mt-1">
            <img src={LOGO} alt="Stronghold A3" className="w-14 h-14 object-contain drop-shadow-lg" />
            <div className="flex-1">
              <h1 className="text-gold text-lg leading-none font-bold">STRONGHOLD A3</h1>
              <p className="text-white/50 text-xs font-body tracking-wide">Security · Tacloban City</p>
            </div>
            <button className="lg:hidden text-white/60" onClick={onClose}><IconX className="w-5 h-5" /></button>
          </div>

          {profile && (
            <div className="glass-gold rounded-2xl p-3 mb-4">
              <div className="text-gold font-display text-sm leading-none">{profile.full_name || 'Operative'}</div>
              <div className="text-white/60 text-[11px] font-body mt-0.5">{ROLE_LABEL[profile.role]}{profile.rank ? ` · ${profile.rank}` : ''}</div>
              {profile.assigned_sites?.length > 0 && (
                <div className="text-white/40 text-[10px] font-body mt-1">{profile.role === 'admin' || profile.role === 'ops' ? 'All sites' : profile.assigned_sites.join(' · ')}</div>
              )}
            </div>
          )}

          <nav className="flex flex-col gap-2 flex-1">
            {visible.map((it) => {
              const active = tab === it.key;
              return (
                <button key={it.key} onClick={() => { setTab(it.key); onClose(); }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition min-h-[56px] ${active ? 'glass-gold' : 'hover:bg-white/5'}`}>
                  <it.Icon className={`w-6 h-6 ${active ? 'text-gold' : 'text-white/60'}`} />
                  <div>
                    <div className={`font-display text-sm ${active ? 'text-gold' : 'text-white'}`}>{it.label}</div>
                    <div className="text-[11px] text-white/40 font-body">{it.sub}</div>
                  </div>
                </button>
              );
            })}

            {/* Resources collapsible */}
            <button onClick={() => setResOpen((v) => !v)} className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-white/5 transition min-h-[52px]">
              <IconBook className="w-6 h-6 text-white/60" />
              <div className="flex-1"><div className="font-display text-sm text-white">Resources</div><div className="text-[11px] text-white/40 font-body">Policies · Protocols</div></div>
              <IconChevronRight className={`w-4 h-4 text-white/40 transition-transform ${resOpen ? 'rotate-90' : ''}`} />
            </button>
            {resOpen && (
              <div className="pl-2 space-y-1 mb-1">
                {RESOURCES.map((r) => (
                  <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/60 hover:text-gold hover:bg-white/5 text-[12px] font-body transition">
                    <IconExternal className="w-3.5 h-3.5 shrink-0 text-gold/70" /> <span className="flex-1">{r.label}</span>
                  </a>
                ))}
              </div>
            )}

            <button onClick={onTutorial} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left hover:bg-white/5 transition min-h-[48px]">
              <IconPlay className="w-5 h-5 text-white/60" /><span className="font-body text-sm text-white">Navigation Tutorial</span>
            </button>
            <button onClick={onManual} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left hover:bg-white/5 transition min-h-[48px]">
              <IconBook className="w-5 h-5 text-white/60" /><span className="font-body text-sm text-white">User Manual</span>
            </button>
            <button onClick={onSettings} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left hover:bg-white/5 transition min-h-[48px]">
              <IconSettings className="w-5 h-5 text-white/60" /><span className="font-body text-sm text-white">Settings</span>
            </button>
          </nav>

          <button onClick={signOut} className="glass rounded-2xl px-3 py-2.5 text-white/70 hover:text-red-300 font-body text-sm my-3 min-h-[44px] transition">Sign Out</button>

          <div className="glass rounded-2xl p-3 text-[11px] text-white/50 font-body">
            <p className="text-gold font-semibold mb-1">Zero-Liability Mode</p>
            RA 10173 · RA 10121 · DOLE D.O. 174 compliant. RBAC enforced.
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;

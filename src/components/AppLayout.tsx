import React, { useMemo, useState } from 'react';
import { SystemProvider } from './sms/SystemContext';
import { AuthProvider, useAuth, ROLE_TABS, ROLE_LABEL } from './sms/AuthContext';
import Sidebar, { Tab } from './sms/Sidebar';
import StatusBar from './sms/StatusBar';
import OpsDashboard from './sms/OpsDashboard';
import PatrolModule from './sms/PatrolModule';
import DTRPayroll from './sms/DTRPayroll';
import Compliance from './sms/Compliance';
import ClientPortal from './sms/ClientPortal';
import SOSButton from './sms/SOSButton';
import BroadcastModal from './sms/BroadcastModal';
import PilotTest from './sms/PilotTest';
import Toasts from './sms/Toasts';
import Topbar from './sms/Topbar';
import Hero from './sms/Hero';
import AuthModal from './sms/AuthModal';
import NavigationTutorial from './sms/NavigationTutorial';
import UserManualModal from './sms/UserManualModal';
import Settings from './sms/Settings';
import { IconMenu, IconHome, IconExternal, IconShield, IconMap, IconClock, IconFile, IconUsers } from './sms/icons';
import { LOGO, RESOURCES, SITE_URL } from '@/data/strongholdData';

const titles: Record<Tab, string> = {
  ops: 'Operations Command Center',
  patrol: 'Field Patrol · Offline-First',
  dtr: 'DTR Consolidation & Payroll',
  compliance: 'Compliance & Document Vault',
  client: 'Client Transparency Portal',
};

const FEATURES = [
  { Icon: IconShield, t: 'Ops Command', d: 'Live guard map, incident feed & crisis broadcasts.' },
  { Icon: IconMap, t: 'Field Patrol', d: 'Offline-first QR/NFC checkpoints & incident reports.' },
  { Icon: IconClock, t: 'DTR & Payroll', d: 'Auto-consolidated time records, DOLE-compliant payroll.' },
  { Icon: IconFile, t: 'Compliance Vault', d: 'PNP-SOSIA, LGU & guard documents with expiry alerts.' },
  { Icon: IconUsers, t: 'Client Portal', d: 'White-label, view-only transparency & auto reports.' },
];

const Landing: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [auth, setAuth] = useState(false);
  const [tut, setTut] = useState(false);
  const [man, setMan] = useState(false);

  return (
    <div className="min-h-screen pb-10">
      <Topbar onSignIn={() => setAuth(true)} />
      <Hero onDashboard={onEnter} onTutorial={() => setTut(true)} onManual={() => setMan(true)} />

      {/* Features */}
      <section className="px-3 sm:px-5 mt-8">
        <h2 className="font-display text-2xl text-white mb-4">Everything your agency needs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="glass rounded-2xl p-5 hover:glass-gold transition cursor-pointer" onClick={onEnter}>
              <f.Icon className="w-8 h-8 text-gold mb-3" />
              <h3 className="font-display text-white text-lg">{f.t}</h3>
              <p className="text-white/55 font-body text-sm mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="px-3 sm:px-5 mt-8">
        <h2 className="font-display text-2xl text-white mb-4">Resources</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {RESOURCES.map((r) => (
            <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-white/75 hover:text-gold text-sm font-body transition">
              <IconExternal className="w-4 h-4 shrink-0 text-gold" /> <span className="flex-1">{r.label}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="px-3 sm:px-5 mt-8">
        <div className="glass rounded-2xl p-5 text-center text-white/40 text-xs font-body">
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">stronghold-a3.github.io</a> · Tacloban City · Regional Support (Viber/Phone) Mon–Sat 8AM–6PM PHT ·
          <span className="text-gold"> RA 10173 · RA 10121 · DOLE D.O. 174 · PNP-SOSIA</span>
        </div>
      </footer>

      <AuthModal open={auth} onClose={() => setAuth(false)} onAuthed={onEnter} />
      <NavigationTutorial open={tut} onClose={() => setTut(false)} />
      <UserManualModal open={man} onClose={() => setMan(false)} />
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { loading, profile } = useAuth();
  const activeProfile = profile || ({ id: 'demo', full_name: 'Demo Admin', role: 'admin', rank: 'ADM', assigned_sites: [] } as any);
  const allowed = useMemo<Tab[]>(() => ROLE_TABS[activeProfile.role], [activeProfile]);
  const [tab, setTab] = useState<Tab>('ops');
  const [sidebar, setSidebar] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [tut, setTut] = useState(false);
  const [man, setMan] = useState(false);
  const [settings, setSettings] = useState(false);

  const activeTab = allowed.includes(tab) ? tab : allowed[0];
  const allowedSites = activeProfile.role === 'admin' || activeProfile.role === 'ops' ? undefined : activeProfile.assigned_sites;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <img src={LOGO} className="w-20 h-20 object-contain animate-pulse" alt="A3" />
        <p className="text-white/50 font-body text-sm">Securing session…</p>
      </div>
    );
  }

  const canBroadcast = ['ops', 'admin', 'supervisor'].includes(activeProfile.role);

  return (
    <SystemProvider>
      <div className="flex min-h-screen text-white">
        <Sidebar tab={activeTab} setTab={setTab} open={sidebar} onClose={() => setSidebar(false)} allowed={allowed}
          onResource={() => window.open(SITE_URL, '_blank')} onSettings={() => setSettings(true)} onTutorial={() => setTut(true)} onManual={() => setMan(true)} />
        <main className="flex-1 min-w-0 p-3 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden glass rounded-xl p-2.5" onClick={() => setSidebar(true)}><IconMenu className="w-5 h-5 text-white" /></button>
            <img src={LOGO} className="w-9 h-9 object-contain lg:hidden" alt="A3" />
            <div className="flex-1">
              <h2 className="font-display text-xl sm:text-2xl text-white leading-none">{titles[activeTab]}</h2>
              <p className="text-white/40 text-xs font-body">{activeProfile.full_name || 'Operative'} · {ROLE_LABEL[activeProfile.role]}</p>
            </div>
            <button onClick={() => setSettings(true)} className="glass rounded-xl px-3 py-2 text-white/70 hover:text-gold text-sm font-body min-h-[44px]">Settings</button>
          </div>

          <StatusBar />

          <div className="animate-spring" key={activeTab}>
            {activeTab === 'ops' && <OpsDashboard onBroadcast={() => setBroadcast(true)} sites={allowedSites} canBroadcast={canBroadcast} />}
            {activeTab === 'patrol' && <PatrolModule sites={allowedSites} />}
            {activeTab === 'dtr' && <DTRPayroll />}
            {activeTab === 'compliance' && <Compliance />}
            {activeTab === 'client' && <ClientPortal sites={allowedSites} />}
          </div>

          {activeTab === 'ops' && (activeProfile.role === 'admin' || activeProfile.role === 'ops') && <PilotTest />}

          <footer className="glass rounded-2xl p-4 text-center text-white/40 text-xs font-body">
            Stronghold A3 Security Agency · Tacloban City · Regional Support (Viber/Phone) Mon–Sat 8AM–6PM PHT ·
            <span className="text-gold"> RA 10173 · RA 10121 · DOLE D.O. 174 · PNP-SOSIA</span>
          </footer>
        </main>
      </div>
      <SOSButton />
      {canBroadcast && <BroadcastModal open={broadcast} onClose={() => setBroadcast(false)} />}
      <NavigationTutorial open={tut} onClose={() => setTut(false)} />
      <UserManualModal open={man} onClose={() => setMan(false)} />
      <Settings open={settings} onClose={() => setSettings(false)} />
      <Toasts />
    </SystemProvider>
  );
};

const Shell: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  if (view === 'landing') return <Landing onEnter={() => setView('dashboard')} />;
  return (
    <div className="relative">
      <button onClick={() => setView('landing')} className="fixed top-3 right-3 z-30 glass rounded-xl px-3 py-2 text-white/70 hover:text-gold text-xs font-body flex items-center gap-1.5">
        <IconHome className="w-4 h-4" /> Home
      </button>
      <Dashboard />
    </div>
  );
};

const AppLayout: React.FC = () => (
  <AuthProvider>
    <Shell />
  </AuthProvider>
);

export default AppLayout;

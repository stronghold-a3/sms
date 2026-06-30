import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, Role, ROLE_LABEL, ROLE_RANKS } from './AuthContext';
import { LOGO } from '@/data/strongholdData';
import { IconShield, IconLock, IconX, IconCheck } from './icons';

// ============================================================================
// CONSTANTS & VALIDATION (shared logic, friendly errors)
// ============================================================================

const SITES = ['Robinsons Place Tacloban', 'Gaisano Capital', 'EVRMC Hospital', 'Leyte Park Resort'];
const ROLES: Role[] = ['guard', 'supervisor', 'ops', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once a session is successfully established (sign-in). */
  onAuthed?: () => void;
}

/**
 * Friendly, accessible Sign-In / Register modal.
 * Reuses the AuthContext so it stays consistent with the rest of the app.
 */
const AuthModal: React.FC<Props> = ({ open, onClose, onAuthed }) => {
  const { signIn, signUp, profile } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [rank, setRank] = useState('SG');
  const [role, setRole] = useState<Role>('guard');
  const [sites, setSites] = useState<string[]>([SITES[0]]);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availableRanks = useMemo(() => ROLE_RANKS[role] || ['SG'], [role]);

  useEffect(() => setRank(availableRanks[0]), [availableRanks]);

  // Auto-close the modal once a profile is established (successful login).
  useEffect(() => {
    if (open && profile) {
      onAuthed?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, open]);

  // Lock background scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const toggleSite = (s: string) =>
    setSites((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setErr(null);
    setMsg(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!email.trim()) return setErr('Please enter your email address.');
    if (!EMAIL_REGEX.test(email.trim())) return setErr('That email address looks incomplete.');
    if (!password) return setErr('Please enter your password.');
    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH)
      return setErr(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (mode === 'signup' && fullName.trim().length < 2)
      return setErr('Please tell us your full name.');
    if (mode === 'signup' && (role === 'guard' || role === 'supervisor') && sites.length === 0)
      return setErr('Please choose at least one assigned site.');

    setBusy(true);
    try {
      if (mode === 'login') {
        const m = await signIn(email.trim(), password);
        if (m) setErr(m);
        // success handled by profile effect above
      } else {
        const assigned = role === 'admin' || role === 'ops' ? SITES : sites;
        const m = await signUp({ email: email.trim(), password, full_name: fullName.trim(), role, rank, assigned_sites: assigned });
        if (m) setErr(m);
        else {
          setMsg('Welcome aboard! Your account is ready. You can sign in now (check your email if confirmation is required).');
          setMode('login');
          setPassword('');
        }
      }
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 placeholder:text-white/30 min-h-[48px] transition-colors';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Account access">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl p-6 sm:p-7 w-full max-w-md animate-spring max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-white/50 hover:text-white">
          <IconX className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <img src={LOGO} className="w-16 h-16 object-contain drop-shadow-lg mb-2" alt="Stronghold A3" />
          <h1 className="text-gold font-display text-xl font-bold leading-none">STRONGHOLD A3</h1>
          <p className="text-white/50 text-xs font-body mt-1">{mode === 'login' ? 'Welcome back — sign in to continue.' : 'Create your operative account.'}</p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['login', 'signup'] as const).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-2xl font-display text-sm transition ${mode === m ? 'glass-gold text-gold' : 'glass text-white/60 hover:text-white/80'}`}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          {mode === 'signup' && (
            <input className={input} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          )}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <div className="relative">
            <input className={input} type={showPw ? 'text' : 'password'} placeholder={mode === 'signup' ? `Password (min ${MIN_PASSWORD_LENGTH} chars)` : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold text-[11px] font-body">{showPw ? 'Hide' : 'Show'}</button>
          </div>

          {mode === 'signup' && (
            <>
              <fieldset>
                <legend className="text-white/50 text-xs font-body mb-1.5 flex items-center gap-1"><IconShield className="w-3.5 h-3.5 text-gold" /> Role (RBAC)</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)} className={`py-2.5 rounded-xl text-xs font-body transition ${role === r ? 'glass-gold text-gold' : 'glass text-white/60 hover:text-white/80'}`}>{ROLE_LABEL[r]}</button>
                  ))}
                </div>
              </fieldset>
              {(role === 'guard' || role === 'supervisor') && (
                <select className={input + ' appearance-none'} value={rank} onChange={(e) => setRank(e.target.value)}>
                  {availableRanks.map((r) => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                </select>
              )}
              {role === 'guard' || role === 'supervisor' ? (
                <div className="space-y-1.5">
                  <p className="text-white/50 text-xs font-body">Assigned Sites</p>
                  {SITES.map((s) => (
                    <button type="button" key={s} onClick={() => toggleSite(s)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-body transition flex items-center gap-2 ${sites.includes(s) ? 'glass-gold text-gold' : 'glass text-white/60 hover:text-white/80'}`}>
                      {sites.includes(s) ? <IconCheck className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-white/30 inline-block" />}
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-[11px] font-body">{ROLE_LABEL[role]} has access to all sites &amp; elevated modules.</p>
              )}
            </>
          )}

          {err && <div className="glass-red rounded-xl px-3 py-2 text-red-200 text-xs font-body" role="alert">{err}</div>}
          {msg && <div className="glass-gold rounded-xl px-3 py-2 text-gold text-xs font-body" role="status">{msg}</div>}

          <button type="submit" disabled={busy} className="w-full bg-[#003a7a] hover:bg-[#004a9a] disabled:opacity-50 text-white font-display tracking-wide py-3.5 rounded-2xl min-h-[52px] flex items-center justify-center gap-2 transition">
            <IconLock className="w-4 h-4" />
            {busy ? 'Please wait…' : mode === 'login' ? 'SECURE LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-white/30 text-[11px] font-body text-center mt-4">RA 10173 (DPA) compliant · Role-Based Access Control enforced</p>
      </div>
    </div>
  );
};

export default AuthModal;

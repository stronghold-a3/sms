import React, { useState } from 'react';
import { LOGO, SITE_URL } from '@/data/strongholdData';
import { IconSearch, IconUser } from './icons';
import ThemeToggle from './ThemeToggle';

interface Props {
  onSignIn: () => void;
  onSearch?: (q: string) => void;
}

/**
 * Public top navigation bar for the landing experience.
 * - Logo links to the public Stronghold A3 site (opens new tab).
 * - Search bar, Sign in / Sign up, and theme toggle.
 */
const Topbar: React.FC<Props> = ({ onSignIn, onSearch }) => {
  const [q, setQ] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(q.trim());
  };

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3">
      <div className="glass-strong rounded-2xl px-3 sm:px-5 py-2.5 flex items-center gap-3">
        {/* Logo → public site */}
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 shrink-0" title="Visit Stronghold A3">
          <img src={LOGO} alt="Stronghold A3" className="w-10 h-10 object-contain drop-shadow" />
          <div className="hidden sm:block leading-none">
            <div className="text-gold font-display text-base font-bold">STRONGHOLD A3</div>
            <div className="text-white/45 text-[10px] font-body tracking-wide">Security · Tacloban City</div>
          </div>
        </a>

        {/* Search */}
        <form onSubmit={submit} className="flex-1 max-w-md mx-auto hidden md:flex items-center glass rounded-xl px-3 py-2">
          <IconSearch className="w-4 h-4 text-white/40 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guards, sites, incidents, modules…"
            aria-label="Search"
            className="flex-1 bg-transparent outline-none text-white text-sm font-body placeholder:text-white/30 px-2"
          />
        </form>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 bg-[#003a7a] hover:bg-[#004a9a] text-white font-display text-sm rounded-xl px-3.5 sm:px-4 py-2.5 min-h-[44px] transition"
          >
            <IconUser className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">Sign In</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile search */}
      <form onSubmit={submit} className="md:hidden mt-2 flex items-center glass rounded-xl px-3 py-2">
        <IconSearch className="w-4 h-4 text-white/40 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          aria-label="Search"
          className="flex-1 bg-transparent outline-none text-white text-sm font-body placeholder:text-white/30 px-2"
        />
      </form>
    </header>
  );
};

export default Topbar;

import React from 'react';
import { IconShield, IconPlay, IconBook, IconArrowRight, IconCheck } from './icons';

// FIX: was pointing at a different Supabase project (fhwhqoiucfxmfsclianh.
// databasepad.com) than the one configured in src/lib/supabase.ts. Now uses
// the same project so this asset is governed by the same Storage policies.
const BANNER = 'https://zpahlcmuowwwiauffrby.supabase.co/storage/v1/object/public/sop-files/public/Stronghold-Sequence-AAA.png';

interface Props {
  onDashboard: () => void;
  onTutorial: () => void;
  onManual: () => void;
}

const HIGHLIGHTS = [
  'Offline-first field patrol',
  'PNP-SOSIA & DOLE compliant',
  'Crisis-proof broadcasts',
  'White-label client portal',
];

const Hero: React.FC<Props> = ({ onDashboard, onTutorial, onManual }) => {
  return (
    <section className="px-3 sm:px-5 mt-4">
      <div className="relative overflow-hidden rounded-3xl glass-strong">
        {/* Banner image */}
        <div className="absolute inset-0">
          <img src={BANNER} alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#021024]/95 via-[#021024]/80 to-[#021024]/40" />
        </div>

        <div className="relative px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 glass-gold rounded-full px-3 py-1.5 mb-5">
            <IconShield className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-body tracking-wider">SECURITY MANAGEMENT SYSTEM · TACLOBAN CITY</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05]">
            ANCHORED. ARMORED. ASSURED.<br />
            <span className="text-gold">Anchored in Legitimacy. Armored by Resilience. Assured by Zero-Liability.</span>
          </h1>

          <p className="text-white/70 font-body text-base sm:text-lg mt-5 max-w-xl leading-relaxed">
            One unified platform for operations, live patrol, DTR &amp; payroll, compliance and client transparency —
            engineered to keep running even when the storm hits.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-8">
            <button onClick={onDashboard} className="flex items-center gap-2 bg-[#003a7a] hover:bg-[#004a9a] text-white font-display rounded-2xl px-6 py-4 min-h-[56px] transition shadow-lg">
              <IconShield className="w-5 h-5" /> Access Dashboard <IconArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onTutorial} className="flex items-center gap-2 glass-gold text-gold font-display rounded-2xl px-6 py-4 min-h-[56px] transition">
              <IconPlay className="w-5 h-5" /> Navigation Tutorial
            </button>
            <button onClick={onManual} className="flex items-center gap-2 glass text-white/80 hover:text-white font-display rounded-2xl px-6 py-4 min-h-[56px] transition">
              <IconBook className="w-5 h-5" /> User Manual
            </button>
          </div>

          {/* Highlights */}
          <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-8">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-2 text-white/60 text-xs sm:text-sm font-body">
                <IconCheck className="w-4 h-4 text-gold" /> {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Hero;

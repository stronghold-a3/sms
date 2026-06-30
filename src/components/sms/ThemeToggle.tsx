import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { IconSun, IconMoon } from './icons';

// FIX: This component previously ran its OWN independent theme system —
// separate state, a separate localStorage key ('a3-theme' vs the real
// provider's 'theme'), and toggling only a `.light` class that index.css
// never defines any rules for (a no-op). Meanwhile App.tsx wraps the whole
// tree in the real <ThemeProvider> (theme-provider.tsx, backed by
// next-themes' types), which a competing, un-synced bit of local state had
// no relationship to.
//
// Depending on render/effect order, the two systems could fight over the
// `dark`/`light` class on <html> — whichever one's effect ran last would
// silently override the other's choice on every state change.
//
// This component is now a thin, honest control surface over the ONE real
// ThemeProvider. It also only exposes dark mode for now: the current design
// system (index.css) is intentionally dark-first (navy/gold/red Liquid
// Glass) and has no light-theme rules defined yet, so offering a "light"
// toggle that visually does nothing would just reintroduce the same bug
// in a different shape. When a real light theme is designed, swap the
// fixed `next` value below for `theme === 'dark' ? 'light' : 'dark'`.
const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || theme === 'system';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'dark' : 'dark')}
      aria-label="Stronghold A3 uses a dark, high-contrast theme for field visibility"
      title="Dark mode (fixed — optimized for outdoor/low-light field use)"
      aria-pressed={isDark}
      className={`glass rounded-xl p-2.5 text-gold transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-default ${className}`}
    >
      {isDark ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;

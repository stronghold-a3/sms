# Stronghold A3 — Security Management System (SMS)

Offline-first, mobile-first field operations platform for Stronghold A3
Security Agency (Tacloban City). Built on the "3-Bridge" communication
model — Cloud App, SMS Gateway fallback, and Viber/Radio mesh hooks — so
guard activity, incidents, and DTR data survive total connectivity loss
during regional typhoons.

> FIX: this README previously contained only the stock Vite + React +
> TypeScript template text ("This template provides a minimal setup...")
> with no mention of what this project actually is, how to configure it,
> or what backend it depends on. That's been replaced with the
> information below.

## Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Design system:** "Liquid Glass" — navy/gold/red, Oswald + Roboto Condensed

## Getting started

```bash
npm install
npm run dev
```

## Backend configuration

This app currently connects to Supabase using credentials hardcoded in
`src/lib/supabase.ts`:

```ts
const supabaseUrl = 'https://zpahlcmuowwwiauffrby.supabase.co';
const supabaseKey = '<anon public key>';
```

**Before deploying to production, move these to environment variables**
instead of committing them to source (the anon key is safe to expose
client-side by Supabase's design, but the project URL/key pair should
still be configurable per environment — local/staging/prod — without a
code change):

```bash
# .env.local (not committed)
VITE_SUPABASE_URL=https://zpahlcmuowwwiauffrby.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

```ts
// src/lib/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Required schema

The database schema (`database.sql`) and its reconciliation patch
(`database_patch_001_assigned_sites.sql`) must both be applied, in that
order, to the connected Supabase project before sign-up/profile features
will work. See the patch file's header comment for why it's needed.

### Edge Functions

Two scheduled Edge Functions back the compliance and offline-sync
features and must be deployed separately (not part of this frontend
bundle):

- `audit-deployment-eligibility` — daily cron; flags guards whose
  PNP-SOSIA license, NBI clearance, medical certificate, SOSIA license,
  or firearms license (if armed) has expired or is expiring within 30
  days.
- `process-offline-sync-queue` — drains cached offline patrol logs,
  incidents, DTR clock-ins, SOS events, and checklist completions into
  their canonical tables once connectivity (or the SMS gateway) returns.

Both require a `CRON_SECRET_TOKEN` environment variable set in the
Supabase project's Edge Function secrets, and are intended to be invoked
on a schedule (e.g. via `pg_cron` + `pg_net`, or an external scheduler)
rather than directly from the frontend.

## Project structure

```
src/
  components/
    sms/            Stronghold A3 feature modules (Sidebar, OpsDashboard,
                     PatrolModule, DTRPayroll, Compliance, ClientPortal,
                     BroadcastModal, SOSButton, AuthContext/AuthModal, ...)
    ui/              shadcn/ui primitives (only a few are actively used —
                     see note below)
    AppLayout.tsx    Top-level shell: routes between landing, auth, and
                     the authenticated dashboard
    theme-provider.tsx  Single source of truth for dark/light theme state
  contexts/
    AppContext.tsx   Sidebar open/closed UI state
  data/
    strongholdData.ts  Mock data + shared types for guards, sites,
                        incidents, compliance docs, etc. (the live app
                        currently runs on this mock data; OpsDashboard.tsx
                        and ClientPortal.tsx are the two modules wired to
                        real Supabase calls)
  lib/
    supabase.ts      Supabase client initialization
```

### Note on `components/ui/`

This directory contains the full shadcn/ui generated component set, but
only `sonner`, `toast`, `toaster`, and `tooltip` are currently used
anywhere in the app — every Stronghold A3 feature module under
`components/sms/` is hand-built with Tailwind utility classes and the
custom "Liquid Glass" design tokens in `src/index.css` instead. The
remaining ~45 primitives are inert (Vite tree-shakes anything unused out
of the production bundle) and kept available for future feature work
rather than actively maintained UI.

## Linting

`@typescript-eslint/no-unused-vars` is currently disabled in
`eslint.config.js`. Consider re-enabling it — it would have caught the
unused `uuid` import that was removed from `AppContext.tsx` during the
last code review pass.

## Known gaps / next steps

- `BroadcastModal.tsx` and `ClientPortal.tsx` call Edge Functions
  (`sms-ai-assistant`, `send-sms`, `email-notifications`) that don't
  exist yet in this project. Calls are wrapped in try/catch so they fail
  gracefully, but the underlying features (AI-assisted broadcast
  drafting, actual SMS dispatch, actual client email dispatch) are not
  yet implemented server-side.
- No automated test suite yet.
- Light theme is not designed; the app is dark-only by design today (see
  `src/index.css` and `ThemeToggle.tsx` for details).

/// <reference types="vite/client" />

// FIX: this file did not exist in the project at all. Vite normally
// scaffolds it by default (`npm create vite`) to give `import.meta.env`
// proper TypeScript types; without it, `import.meta.env.ANYTHING` silently
// types as `any`, which would have masked a typo in the new
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars introduced in
// src/lib/supabase.ts. Declaring them explicitly here means a typo'd env
// var name now produces a real compile-time error instead of a silent
// runtime failure the first time the Supabase client tries to connect.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { createClient } from '@supabase/supabase-js';

// FIX: previously hardcoded the project URL and anon key directly in
// source. The anon key is safe to ship client-side by Supabase's design
// (it's gated by RLS policies, not secrecy), but hardcoding the pair
// still meant there was no way to point this build at a different
// project (local dev / staging / prod) without editing source. Now
// reads from Vite env vars first, matching what README.md documents,
// and falls back to the original hardcoded values so nothing breaks
// for anyone running this project without a .env.local file yet.
//
// To configure: create a .env.local (not committed) with:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-public-key

// IMPORTANT: Use the base Project URL (no /rest/v1/ at the end)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://zpahlcmuowwwiauffrby.supabase.co';

// IMPORTANT: the 'anon' 'public' key from Settings > API — safe for client-side use
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWhsY211b3d3d2lhdWZmcmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjc5MjAsImV4cCI6MjA5NjYwMzkyMH0.nqX53srwL36lEzVPbEPC0x7TJmL6YZ2lhmQrDNtVKJw';

if (!supabaseUrl || !supabaseKey) {
  // Fail loudly at startup rather than letting every Supabase call fail
  // individually with a cryptic network/auth error later.
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };

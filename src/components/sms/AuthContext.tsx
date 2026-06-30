import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tab } from './Sidebar';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type Role = 'guard' | 'supervisor' | 'ops' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  rank: string;
  assigned_sites: string[];
}

export const ROLE_LABEL: Record<Role, string> = {
  guard: 'Security Guard',
  supervisor: 'Supervisor',
  ops: 'Ops Manager',
  admin: 'Administrator',
};

/** Which sidebar tabs each role can access (RBAC) */
export const ROLE_TABS: Record<Role, Tab[]> = {
  guard: ['patrol'],
  supervisor: ['ops', 'patrol', 'client'],
  ops: ['ops', 'patrol', 'compliance', 'client'],
  admin: ['ops', 'patrol', 'dtr', 'compliance', 'client'],
};

/** Valid ranks per role */
export const ROLE_RANKS: Record<Role, string[]> = {
  guard: ['SG', 'SO', 'SS'],
  supervisor: ['SS', 'SM', 'SL'],
  ops: ['OM', 'DM'],
  admin: ['ADM', 'SYS'],
};

interface AuthState {
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (data: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    rank: string;
    assigned_sites: string[];
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

// ============================================================================
// RUNTIME VALIDATION
// ============================================================================

function isValidRole(r: unknown): r is Role {
  return typeof r === 'string' && ['guard', 'supervisor', 'ops', 'admin'].includes(r);
}

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((i) => typeof i === 'string');
}

/**
 * Validates that a raw Supabase row matches the Profile interface.
 * Returns null if validation fails (prevents unsafe type assertions).
 *
 * FIX: previously a missing/null `assigned_sites` column caused
 * validation to fail outright (isStringArray(undefined) === false),
 * which meant ANY profile row from a database where this column was
 * renamed, dropped, or normalized into a join table (see the
 * profile_sites design discussed for the SMS schema) would silently
 * come back as "no profile found" — kicking a legitimately signed-in
 * user back to an auto-create flow instead of surfacing a clear error.
 * Missing assigned_sites now degrades to [] rather than invalidating
 * the entire profile.
 */
function validateProfile(data: unknown): Profile | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (typeof d.id !== 'string') return null;
  if (typeof d.full_name !== 'string') return null;
  if (!isValidRole(d.role)) return null;
  if (typeof d.rank !== 'string') return null;

  // FIX: degrade gracefully instead of rejecting the whole profile.
  const assignedSites = isStringArray(d.assigned_sites) ? d.assigned_sites : [];

  return {
    id: d.id,
    full_name: d.full_name,
    role: d.role,
    rank: d.rank,
    assigned_sites: assignedSites,
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

const Ctx = createContext<AuthState | null>(null);

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within an AuthProvider');
  return c;
};

// ============================================================================
// PROVIDER
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  /**
   * Load the user's profile from the public 'profiles' table.
   * Includes error handling and runtime validation.
   * Returns the profile or null (does NOT set state — caller decides).
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Profile load error:', error.message);
        return null;
      }
      return validateProfile(data);
    } catch (err) {
      console.error('[AuthContext] Unexpected error in fetchProfile:', err);
      return null;
    }
  }, []);

  /**
   * Ensure a profile exists for the signed-in user.
   * If none is found, build one from the auth user's metadata (set during
   * sign-up). This is the robust fallback that covers the email-confirmation
   * flow where no session exists at sign-up time.
   */
  const ensureProfile = useCallback(
    async (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
      // 1. Try to load existing profile
      let prof = await fetchProfile(user.id);
      if (prof) {
        setProfile(prof);
        return;
      }

      // 2. None found — create from auth metadata
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const role: Role = isValidRole(meta.role) ? meta.role : 'guard';
      const newRow = {
        id: user.id,
        full_name:
          typeof meta.full_name === 'string' && meta.full_name.trim()
            ? meta.full_name
            : (user.email || 'Operative').split('@')[0],
        role,
        rank: typeof meta.rank === 'string' ? meta.rank : 'SG',
        assigned_sites: isStringArray(meta.assigned_sites) ? meta.assigned_sites : [],
      };

      const { error: insErr } = await supabase.from('profiles').insert([newRow]);
      if (insErr) {
        console.error('[AuthContext] Profile auto-create failed:', insErr.message);
        // Still try one more read in case it was created concurrently
        prof = await fetchProfile(user.id);
        if (prof) setProfile(prof);
        return;
      }

      const created = validateProfile(newRow);
      if (created) setProfile(created);
    },
    [fetchProfile]
  );

  /**
   * Listen for auth state changes and load/unload profile accordingly.
   */
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        await ensureProfile(session.user);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      switch (event) {
        case 'SIGNED_IN':
        case 'USER_UPDATED':
          if (session?.user) {
            await ensureProfile(session.user);
          }
          break;

        case 'SIGNED_OUT':
          setProfile(null);
          break;

        default:
          break;
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [ensureProfile]);


  /**
   * Sign in with email/password.
   * Returns an error message string on failure, null on success.
   * Profile loading is handled by the onAuthStateChange listener.
   */
  const signIn = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    } catch (err) {
      console.error('[AuthContext] Sign-in exception:', err);
      return 'An unexpected error occurred during sign-in. Please try again.';
    }
  };

  /**
   * Sign up a new user.
   *
   * FLOW:
   * 1. Create the user in Supabase Auth (role/rank/sites stored as metadata).
   * 2. If a session is returned (email confirmation OFF), the
   *    onAuthStateChange → ensureProfile flow creates the profile row.
   * 3. If NO session is returned (email confirmation ON), we attempt a
   *    best-effort profile insert; if it fails due to RLS that's fine —
   *    the profile is created on first successful sign-in via ensureProfile.
   *
   * Returns an error message string on failure, null on success.
   */
  const signUp: AuthState['signUp'] = async ({
    email,
    password,
    full_name,
    role,
    rank,
    assigned_sites,
  }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, role, rank, assigned_sites },
        },
      });

      if (authError) return authError.message;
      if (!authData.user) return 'User creation failed. Please try again.';

      // Best-effort immediate profile creation (works when a session exists).
      // If it fails (no session / RLS), ensureProfile will create it on
      // first sign-in, so we intentionally do NOT surface that as an error.
      if (authData.session) {
        const { error: profileError } = await supabase.from('profiles').insert([
          { id: authData.user.id, full_name, role, rank, assigned_sites },
        ]);
        if (profileError) {
          console.warn('[AuthContext] Deferred profile creation:', profileError.message);
        }
      }

      return null; // Success
    } catch (err) {
      console.error('[AuthContext] Sign-up exception:', err);
      return 'An unexpected error occurred during registration. Please try again.';
    }
  };


  /**
   * Sign out and clear local profile state.
   * Only clears profile if sign-out succeeds.
   */
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Sign-out error:', error.message);
        throw new Error(error.message);
      }
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] Sign-out exception:', err);
      // Re-throw so the UI can display an error
      throw err instanceof Error ? err : new Error('Sign-out failed. Please try again.');
    }
  };

  return (
    <Ctx.Provider value={{ loading, profile, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

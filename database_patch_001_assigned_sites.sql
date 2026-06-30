-- ============================================================
-- Stronghold A3 SMS — Schema Patch 001
-- Reconciles profiles.assigned_sites with the frontend contract
-- ============================================================
--
-- CONTEXT
-- The database.sql delivered previously normalized site assignment
-- into a `profile_sites` junction table (profile_id, site_id) for
-- referential integrity, removing the `assigned_sites text[]` column
-- that used to live directly on `profiles`.
--
-- This sms.zip frontend bundle (AuthContext.tsx, AuthModal.tsx,
-- Sidebar.tsx) was built and is fully wired against the SIMPLER
-- earlier contract: `assigned_sites` as a direct text[] column,
-- written at sign-up time alongside full_name/role/rank, and read
-- directly off the `profiles` row with no join. None of the three
-- call sites that touch this field were ever updated to use the
-- junction table, so as delivered, signups and profile reads against
-- the normalized schema would either fail validation (now hardened
-- to degrade to [] — see AuthContext.tsx fix) or insert into a
-- column that no longer exists.
--
-- RATHER THAN forcing a junction-table join pattern into a frontend
-- that is already built, tested, and stable around the simpler
-- shape, this patch restores `assigned_sites text[]` as the SOURCE
-- OF TRUTH on `profiles`, and keeps `profile_sites` as an optional,
-- derived table for future reporting/joins that need real
-- referential integrity (e.g. cascading a site rename, or querying
-- "all guards at site X" efficiently at scale). The two are kept in
-- sync by a trigger so existing call sites work AS BUILT, while
-- giving a path to the more normalized structure later without
-- another frontend rewrite.
--
-- APPLY THIS AFTER the previously-delivered database.sql.
-- ============================================================

SET search_path = "prj_K9i_UT3iT5Ot";

-- 1. Restore assigned_sites as the source of truth on profiles.
ALTER TABLE "prj_K9i_UT3iT5Ot".profiles
  ADD COLUMN IF NOT EXISTS assigned_sites text[] DEFAULT '{}'::text[] NOT NULL;

-- 2. Backfill assigned_sites from the existing profile_sites junction
--    table (site names, since the frontend works with site name
--    strings, not UUIDs — see SITES constant in AuthModal.tsx).
UPDATE "prj_K9i_UT3iT5Ot".profiles p
SET assigned_sites = COALESCE((
  SELECT array_agg(s.name ORDER BY s.name)
  FROM "prj_K9i_UT3iT5Ot".profile_sites ps
  JOIN "prj_K9i_UT3iT5Ot".sites s ON s.id = ps.site_id
  WHERE ps.profile_id = p.id
), '{}'::text[]);

-- 3. Keep profile_sites in sync going forward, so reporting/joins that
--    rely on the normalized table (added in the original database.sql)
--    don't silently go stale now that the frontend writes to the
--    text[] column directly.
CREATE OR REPLACE FUNCTION "prj_K9i_UT3iT5Ot".sync_profile_sites() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  site_name text;
  found_site_id uuid;
BEGIN
  -- Clear existing junction rows for this profile, then rebuild from
  -- the text[] column. Simple and correct; profile site lists are
  -- small (a handful of sites per guard) so this is cheap.
  DELETE FROM "prj_K9i_UT3iT5Ot".profile_sites WHERE profile_id = NEW.id;

  FOREACH site_name IN ARRAY NEW.assigned_sites
  LOOP
    SELECT id INTO found_site_id
    FROM "prj_K9i_UT3iT5Ot".sites
    WHERE name = site_name
    LIMIT 1;

    IF found_site_id IS NOT NULL THEN
      INSERT INTO "prj_K9i_UT3iT5Ot".profile_sites (profile_id, site_id)
      VALUES (NEW.id, found_site_id)
      ON CONFLICT (profile_id, site_id) DO NOTHING;
    END IF;
    -- NOTE: if a guard's metadata names a site that doesn't exist yet
    -- in `sites`, it is intentionally NOT silently dropped from
    -- assigned_sites (the frontend still shows it), but it also won't
    -- appear in profile_sites until a matching site row exists. This
    -- favors the simpler frontend contract over strict referential
    -- integrity, consistent with the rest of this patch.
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_sync_sites ON "prj_K9i_UT3iT5Ot".profiles;
CREATE TRIGGER profiles_sync_sites
AFTER INSERT OR UPDATE OF assigned_sites ON "prj_K9i_UT3iT5Ot".profiles
FOR EACH ROW EXECUTE FUNCTION "prj_K9i_UT3iT5Ot".sync_profile_sites();

-- 4. Update handle_new_user() to write assigned_sites directly onto
--    profiles (matching AuthModal.tsx's signUp payload), instead of
--    only inserting into profile_sites. The sync trigger above will
--    populate profile_sites automatically as a side effect.
CREATE OR REPLACE FUNCTION "prj_K9i_UT3iT5Ot".handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  sites text[];
BEGIN
  SELECT COALESCE(array_agg(x), '{}'::text[]) INTO sites
  FROM jsonb_array_elements_text(
    COALESCE(NEW.raw_user_meta_data->'assigned_sites', '[]'::jsonb)
  ) x;

  INSERT INTO "prj_K9i_UT3iT5Ot".profiles (id, full_name, role, rank, phone, assigned_sites)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'guard'),
    COALESCE(NEW.raw_user_meta_data->>'rank', ''),
    NEW.phone,
    sites
  );
  -- profile_sites is populated automatically by the profiles_sync_sites
  -- trigger fired by this INSERT.

  RETURN NEW;
END $$;

-- 5. RLS: profiles_select_own / profiles_supervisor_select policies
--    from the original database.sql already reference profile_sites
--    for the supervisor visibility check — these continue to work
--    unchanged since profile_sites is still maintained (now via the
--    sync trigger instead of being the only source of truth).

-- ============================================================
-- End of Schema Patch 001
-- ============================================================

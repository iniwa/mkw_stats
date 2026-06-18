-- record_only_cleanup.sql
--
-- Purpose:
--   Delete all user/verification play data from the MKWorld Stats Manager database
--   while preserving master data (courses, routes, map_points, route_repick_equivalents,
--   course_aliases, characters, vehicles, item_tables) and configuration
--   (vr_accounts, app_settings).
--
-- What this script DELETES:
--   rating_snapshots     -- VR/MMR snapshots tied to individual races or lounge tables
--   map_annotations      -- Map annotations created during verification sessions
--   race_records         -- Individual race results from all play sessions
--   play_sessions        -- All play sessions (ranked VR and Lounge)
--   course_notes         -- Course/route notes entered during verification
--   lounge_table_players -- Lounge table player entries
--   lounge_tables        -- Lounge table records
--
-- What this script PRESERVES:
--   courses, routes, map_points, route_repick_equivalents, course_aliases
--   characters, vehicles, item_tables
--   vr_accounts          -- Account rows kept; current_vr is reset to initial_vr
--   app_settings         -- All settings preserved (lounge_player_id, lounge_season, etc.)
--   uploaded_files       -- Excluded: no FK links to play data; may hold intentional assets
--   time_attack_records  -- Independent Time Attack user data (PB, WR, target times)
--
-- BEFORE RUNNING:
--   Take a pg_dump backup first:
--     docker exec mkw-postgres pg_dump -U mkw mkw_stats > ~/mkw_stats_backup_$(date +%Y%m%d).sql
--
-- DEFAULT BEHAVIOR:
--   This script ends with ROLLBACK. It will NOT commit any changes unless you explicitly
--   change ROLLBACK to COMMIT after reviewing the pre- and post-cleanup row counts.
--
-- HOW TO APPLY:
--   1. Review the pre-cleanup counts shown in the output.
--   2. If counts look correct, edit this file: comment out ROLLBACK and uncomment COMMIT.
--   3. Re-run the script.
--
-- USAGE (from the Pi host or another shell with Docker access):
--   docker exec -i mkw-postgres psql -U mkw mkw_stats < scripts/record_only_cleanup.sql
--   Or paste/run the reviewed SQL through a Portainer console connected to PostgreSQL.

BEGIN;

-- ---------------------------------------------------------------------------
-- Pre-cleanup row counts
-- ---------------------------------------------------------------------------

SELECT 'PRE-CLEANUP COUNTS' AS checkpoint;

SELECT table_name, row_count FROM (
    SELECT 'rating_snapshots'    AS table_name, COUNT(*)::bigint AS row_count FROM rating_snapshots
    UNION ALL
    SELECT 'map_annotations',                   COUNT(*)         FROM map_annotations
    UNION ALL
    SELECT 'race_records',                       COUNT(*)         FROM race_records
    UNION ALL
    SELECT 'play_sessions',                      COUNT(*)         FROM play_sessions
    UNION ALL
    SELECT 'course_notes',                       COUNT(*)         FROM course_notes
    UNION ALL
    SELECT 'lounge_table_players',               COUNT(*)         FROM lounge_table_players
    UNION ALL
    SELECT 'lounge_tables',                      COUNT(*)         FROM lounge_tables
    UNION ALL
    SELECT 'vr_accounts (preserved)',            COUNT(*)         FROM vr_accounts
    UNION ALL
    SELECT 'app_settings (preserved)',           COUNT(*)         FROM app_settings
    UNION ALL
    SELECT 'courses (preserved)',                COUNT(*)         FROM courses
    UNION ALL
    SELECT 'routes (preserved)',                 COUNT(*)         FROM routes
    UNION ALL
    SELECT 'uploaded_files (not deleted)',       COUNT(*)         FROM uploaded_files
    UNION ALL
    SELECT 'time_attack_records (preserved)',    COUNT(*)         FROM time_attack_records
) counts
ORDER BY table_name;

-- ---------------------------------------------------------------------------
-- Deletions — FK-safe order
--
-- Dependency graph (A -> B means A has a FK referencing B):
--   rating_snapshots  -> race_records   (race_record_id)
--   rating_snapshots  -> lounge_tables  (lounge_table_id)
--   map_annotations   -> course_notes   (note_id)
--   race_records      -> play_sessions  (session_id)
--   play_sessions     -> lounge_tables  (lounge_table_id)
--   lounge_table_players -> lounge_tables (lounge_table_id)
--
-- Required deletion order (child before parent):
--   1. rating_snapshots      (before race_records and lounge_tables)
--   2. map_annotations       (before course_notes)
--   3. race_records          (before play_sessions)
--   4. play_sessions         (before lounge_tables)
--   5. course_notes          (after map_annotations)
--   6. lounge_table_players  (before lounge_tables)
--   7. lounge_tables         (after play_sessions, rating_snapshots, lounge_table_players)
-- ---------------------------------------------------------------------------

-- Step 1: rating_snapshots
--   References race_records.id and lounge_tables.id — must be first.
DELETE FROM rating_snapshots;

-- Step 2: map_annotations
--   References course_notes.id — must precede course_notes.
DELETE FROM map_annotations;

-- Step 3: race_records
--   References play_sessions.id — must precede play_sessions.
DELETE FROM race_records;

-- Step 4: play_sessions
--   References lounge_tables.id — must precede lounge_tables.
DELETE FROM play_sessions;

-- Step 5: course_notes
--   Safe after map_annotations is deleted.
DELETE FROM course_notes;

-- Step 6: lounge_table_players
--   References lounge_tables.id — must precede lounge_tables.
DELETE FROM lounge_table_players;

-- Step 7: lounge_tables
--   Safe after play_sessions, rating_snapshots, lounge_table_players are deleted.
DELETE FROM lounge_tables;

-- ---------------------------------------------------------------------------
-- Reset vr_accounts.current_vr
--   Ranked race history is gone, so current_vr would otherwise be stale.
--   Reset each account's current_vr back to its initial_vr baseline.
-- ---------------------------------------------------------------------------

UPDATE vr_accounts SET current_vr = initial_vr;

-- ---------------------------------------------------------------------------
-- Post-cleanup row counts
-- ---------------------------------------------------------------------------

SELECT 'POST-CLEANUP COUNTS' AS checkpoint;

SELECT table_name, row_count FROM (
    SELECT 'rating_snapshots'    AS table_name, COUNT(*)::bigint AS row_count FROM rating_snapshots
    UNION ALL
    SELECT 'map_annotations',                   COUNT(*)         FROM map_annotations
    UNION ALL
    SELECT 'race_records',                       COUNT(*)         FROM race_records
    UNION ALL
    SELECT 'play_sessions',                      COUNT(*)         FROM play_sessions
    UNION ALL
    SELECT 'course_notes',                       COUNT(*)         FROM course_notes
    UNION ALL
    SELECT 'lounge_table_players',               COUNT(*)         FROM lounge_table_players
    UNION ALL
    SELECT 'lounge_tables',                      COUNT(*)         FROM lounge_tables
    UNION ALL
    SELECT 'vr_accounts (preserved)',            COUNT(*)         FROM vr_accounts
    UNION ALL
    SELECT 'app_settings (preserved)',           COUNT(*)         FROM app_settings
    UNION ALL
    SELECT 'courses (preserved)',                COUNT(*)         FROM courses
    UNION ALL
    SELECT 'routes (preserved)',                 COUNT(*)         FROM routes
    UNION ALL
    SELECT 'uploaded_files (not deleted)',       COUNT(*)         FROM uploaded_files
    UNION ALL
    SELECT 'time_attack_records (preserved)',    COUNT(*)         FROM time_attack_records
) counts
ORDER BY table_name;

-- ---------------------------------------------------------------------------
-- Default: ROLLBACK
-- Review the counts above. If correct, change ROLLBACK to COMMIT and re-run.
-- ---------------------------------------------------------------------------

ROLLBACK;
-- COMMIT; -- uncomment and comment out ROLLBACK above to apply changes

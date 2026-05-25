Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Prepare a reviewed, repository-tracked record-only cleanup script for the Pi PostgreSQL database.

This script is for resetting verification/play data while preserving master data and app configuration. It must be safe to review before anyone runs it.

Do **not** execute destructive SQL in this handoff.

## Background

The MVP is close to complete. Many Pi verification passes intentionally left completed sessions, races, notes, annotations, and MMR sync history in the database.

The user has said current record data is not important and may be deleted, but destructive operations should still be explicit and reviewable.

`docs/design/operations.md` already says record-only cleanup should be done through a dedicated SQL handoff. This is that handoff.

Relevant current model tables:

Master / configuration data to preserve:

- `courses`
- `routes`
- `map_points`
- `route_repick_equivalents`
- `course_aliases`
- `characters`
- `vehicles`
- `item_tables`
- `vr_accounts`
- `app_settings`

User / verification data to clean:

- `play_sessions`
- `race_records`
- `rating_snapshots`
- `course_notes`
- `map_annotations`
- `lounge_tables`
- `lounge_table_players`

Potentially user-file data:

- `uploaded_files`

For this slice, do not delete `uploaded_files` unless the schema/docs clearly show they are only unused verification artifacts. If uncertain, leave them out and document the choice.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/operations.md`
- `backend/app/models/sessions.py`
- `backend/app/models/vr.py`
- `backend/app/models/courses.py`
- `backend/app/models/lounge.py`
- `backend/app/models/files.py`
- `backend/alembic/versions/001_initial_schema.py`
- `backend/alembic/versions/002_result_model_redesign.py`
- `backend/alembic/versions/003_lounge_mmr_sync.py`
- `backend/alembic/versions/004_lounge_mmr_game.py`
- `backend/alembic/versions/005_lounge_completion_reason.py`

## Files To Edit

Preferred:

- `scripts/record_only_cleanup.sql` (new)
- `docs/design/operations.md`
- `docs/handoffs/README.md` only if needed for active state consistency

Do not edit application code.

## Required Work

### 1. Confirm Delete Order

Review foreign keys and confirm the safe deletion order.

At minimum, account for:

- `rating_snapshots.race_record_id -> race_records.id`
- `race_records.session_id -> play_sessions.id`
- `play_sessions.lounge_table_id -> lounge_tables.id`
- `map_annotations.note_id -> course_notes.id`
- `lounge_table_players.lounge_table_id -> lounge_tables.id`

Document the order in comments inside the SQL script.

### 2. Create A Safe SQL Script

Create `scripts/record_only_cleanup.sql`.

Requirements:

- The script must start with clear comments explaining:
  - what it deletes
  - what it preserves
  - that a backup should be taken first
  - that it defaults to `ROLLBACK`
- The script must use a transaction.
- The script must include pre-cleanup counts for affected tables.
- The script must perform deletes in FK-safe order.
- The script must include post-cleanup counts for affected tables.
- The script must end with `ROLLBACK;` by default, not `COMMIT;`.
- Include a clearly commented line showing how to switch to `COMMIT` after review.
- Reset `vr_accounts.current_vr` back to `initial_vr` because deleting ranked race history otherwise leaves account current VR inconsistent.
- Do not delete `vr_accounts` rows.
- Do not clear `app_settings.lounge_player_id`, `app_settings.lounge_season`, or selected account settings.
- Do not delete master course/route/map-point data.

Recommended affected tables:

- `rating_snapshots`
- `race_records`
- `play_sessions`
- `map_annotations`
- `course_notes`
- `lounge_table_players`
- `lounge_tables`

If you decide to include or exclude any other table, explain why in comments and in the report.

### 3. Update Operations Runbook

Update `docs/design/operations.md` under the record-only cleanup section to reference:

- `scripts/record_only_cleanup.sql`
- backup first
- default `ROLLBACK` behavior
- use `psql` inside `mkw-postgres` or another reviewed DB client
- switch to `COMMIT` only after reviewing counts

Keep this concise.

### 4. Verification

Do not run the cleanup against Pi.

Local verification should be static:

- SQL file exists and is readable.
- SQL contains `BEGIN;`.
- SQL ends with `ROLLBACK;` by default.
- SQL does not contain `DROP TABLE`, `TRUNCATE`, or `DELETE FROM courses/routes/map_points/vr_accounts/app_settings`.
- `git diff --check`.

If a local PostgreSQL scratch DB is available without extra setup, you may optionally syntax-check there, but it is not required.

## Constraints

- Do not execute the cleanup on Pi.
- Do not run destructive DB commands.
- Do not edit application code.
- No Alembic migration.
- No new dependencies.
- No deployment or Portainer changes.
- Keep the script explicit and reviewable; avoid dynamic SQL.
- Do not include secrets, `.env`, passwords, or dumps.

## Non Goals

- No automated cleanup endpoint.
- No UI for cleanup.
- No backup automation.
- No full DB reset script.
- No deletion of master course/route seed data.
- No deletion of VR accounts or app settings.

## Verification

Run:

```powershell
git diff --check
rg -n "BEGIN;|ROLLBACK;|COMMIT|DROP TABLE|TRUNCATE|DELETE FROM courses|DELETE FROM routes|DELETE FROM map_points|DELETE FROM vr_accounts|DELETE FROM app_settings" scripts/record_only_cleanup.sql docs/design/operations.md
```

No backend/frontend test is required unless you edit application code, which this handoff should not do.

## Expected Report

- Changed files
- Summary
- Tables deleted by the script
- Tables explicitly preserved
- Whether `uploaded_files` was included or excluded, with reason
- Verification results
- Blocked checks
- Design questions for Codex

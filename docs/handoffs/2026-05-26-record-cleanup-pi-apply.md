Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Apply the reviewed record-only cleanup to the Pi PostgreSQL database, deleting verification/play data while preserving master data and settings.

This is the actual cleanup apply step. It is destructive for user/play records only.

## Background

The dry-run handoff completed successfully:

- Archived handoff: `docs/handoffs/archive/2026-05-26-record-cleanup-pi-dry-run.md`
- Backup created on Pi:
  - `/home/iniwa/mkw_stats_pre_record_cleanup_20260526_035801.sql`
  - size: 147 KB
- Dry-run used `ROLLBACK`; no persistent DB changes were made.
- Alembic current was `005 (head)`.
- API sanity passed.

Dry-run delete counts:

| Table | Rows to delete |
|---|---:|
| `rating_snapshots` | 9 |
| `map_annotations` | 0 |
| `race_records` | 68 |
| `play_sessions` | 34 |
| `course_notes` | 5 |
| `lounge_table_players` | 0 |
| `lounge_tables` | 0 |

Preserved counts in dry-run:

| Table | Rows |
|---|---:|
| `courses` | 30 |
| `routes` | 203 |
| `app_settings` | 1 |
| `vr_accounts` | 2 |
| `uploaded_files` | 0 |

The reviewed SQL file is:

- `scripts/record_only_cleanup.sql`

It currently ends with:

```sql
ROLLBACK;
-- COMMIT; -- uncomment and comment out ROLLBACK above to apply changes
```

For this apply step, you may use a temporary copy or direct psql input where only that final transaction command is changed to commit.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/operations.md`
- `scripts/record_only_cleanup.sql`
- `docs/handoffs/archive/2026-05-26-record-cleanup-pi-dry-run.md`

## Files To Edit

None.

Do not modify repository files. If you need a COMMIT version, create a temporary copy outside the repo or pipe transformed SQL without altering the tracked file.

## Required Work

### 1. Confirm Script And Backup

Before applying:

- confirm `scripts/record_only_cleanup.sql` still has `ROLLBACK;` and commented `COMMIT;`
- confirm it still has no:
  - `DROP TABLE`
  - `TRUNCATE`
  - `DELETE FROM courses`
  - `DELETE FROM routes`
  - `DELETE FROM map_points`
  - `DELETE FROM vr_accounts`
  - `DELETE FROM app_settings`
- confirm backup exists:
  - `/home/iniwa/mkw_stats_pre_record_cleanup_20260526_035801.sql`

If the backup is missing, create a new timestamped `pg_dump` backup before continuing and report the new path.

### 2. Confirm Pi State

On Pi:

- containers up:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- backend health OK:
  - `GET http://192.168.1.205:8001/api/v1/health`
- Alembic current:
  - `docker exec mkw-backend alembic current`

Do not redeploy unless the stack is broken. This handoff is not a deployment handoff.

### 3. Apply Cleanup With COMMIT

Apply the exact reviewed cleanup SQL with only the final transaction command changed from:

```sql
ROLLBACK;
-- COMMIT; -- uncomment and comment out ROLLBACK above to apply changes
```

to an effective commit, for example:

```sql
-- ROLLBACK;
COMMIT;
```

Do not otherwise change the SQL.

Acceptable approaches:

- create a temporary SQL file outside the repo and edit only the final lines
- pipe a transformed version of the SQL where only final `ROLLBACK;` is disabled and `COMMIT;` is enabled
- paste the reviewed SQL into `psql` and manually apply the final `COMMIT`

Do not edit the tracked `scripts/record_only_cleanup.sql` file.

Capture the output counts and any `DELETE` / `UPDATE` command summaries.

### 4. Verify Post-Cleanup Database State

After commit, query and report counts for:

- `rating_snapshots`
- `map_annotations`
- `race_records`
- `play_sessions`
- `course_notes`
- `lounge_table_players`
- `lounge_tables`
- `courses`
- `routes`
- `map_points`
- `vr_accounts`
- `app_settings`
- `uploaded_files`

Expected:

- cleaned tables are zero
- courses = 30
- routes = 203
- map_points = 30
- vr_accounts = 2
- app_settings = 1
- uploaded_files = 0 unless new files were added since dry-run

Also verify:

- `vr_accounts.current_vr = initial_vr` for all accounts
- no active sessions remain

### 5. API/UI Smoke

Check API:

- `GET /api/v1/health` OK
- `GET /api/v1/play-sessions?limit=1` returns an empty list
- `GET /api/v1/play-sessions/active` returns an empty list
- `GET /api/v1/courses` returns 30 active courses
- `GET /api/v1/routes` returns 203 active routes
- `GET /api/v1/vr-accounts` returns existing accounts with reset `current_vr`
- `GET /api/v1/notes` returns an empty list
- `GET /api/v1/map-annotations` returns an empty list

Smoke Web GUI:

- Dashboard loads without crash
- Records shows empty state or no sessions
- Playing can still load course selection data
- Courses/Notes view loads with no notes/annotations
- Settings still shows VR accounts and Lounge settings

### 6. Report Recovery Path

Include the backup path in the report and state that it can be restored if cleanup was unintended.

Do not perform a restore unless explicitly requested.

## Constraints

- Do not modify repository files.
- Do not commit.
- Do not push.
- Do not redeploy unless stack is broken and user approval is obtained.
- Do not drop tables.
- Do not truncate tables.
- Do not delete master data.
- Do not delete `vr_accounts` or `app_settings`.
- Do not expose DB passwords or raw dump content.
- Keep all stack management under Portainer ownership; no direct Docker Compose deployment.

## Non Goals

- No source code changes.
- No schema changes.
- No backup automation.
- No full DB reset.
- No restore operation.
- No deploy changes.

## Verification

Expected checks:

- backup exists
- cleanup SQL applied with `COMMIT`
- cleaned table counts are zero
- preserved table counts match expectations
- `vr_accounts.current_vr = initial_vr`
- core API and GUI smoke checks pass

## Expected Report

- Changed files: should be `None`
- Backup path used
- Pi container / health / Alembic state
- Apply command summary
- Pre/post cleanup counts
- VR account reset verification
- API sanity results
- GUI smoke results
- Residual data, if any
- Recovery path
- Blocked checks
- Design questions for Codex

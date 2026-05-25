Read AGENTS.md, CLAUDE.md, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

## Goal

Run a safe Pi dry-run of `scripts/record_only_cleanup.sql` and report the exact rows that would be deleted, without committing any database changes.

This is a verification/operations handoff. It must not modify source files or permanently change the Pi database.

## Background

`scripts/record_only_cleanup.sql` was added as a reviewed record-only cleanup script.

It is intended to remove user/verification data while preserving:

- courses
- routes
- map_points
- route_repick_equivalents
- course_aliases
- characters
- vehicles
- item_tables
- vr_accounts rows
- app_settings
- uploaded_files

The script currently ends with:

```sql
ROLLBACK;
-- COMMIT; -- uncomment and comment out ROLLBACK above to apply changes
```

So running it as-is should show pre/post counts inside the transaction and then roll back, leaving the database unchanged.

The next decision after this handoff is whether to run a separate commit/apply handoff.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/operations.md`
- `scripts/record_only_cleanup.sql`
- `docs/handoffs/archive/2026-05-26-record-only-cleanup-script.md`

## Files To Edit

None.

Do not modify source files, SQL files, docs, or git state in this handoff.

## Required Work

### 1. Confirm Local Script Safety

Before touching Pi, confirm the checked-out script still has:

- `BEGIN;`
- `ROLLBACK;`
- `COMMIT` only as a commented line
- no `DROP TABLE`
- no `TRUNCATE`
- no `DELETE FROM courses`
- no `DELETE FROM routes`
- no `DELETE FROM map_points`
- no `DELETE FROM vr_accounts`
- no `DELETE FROM app_settings`

Use read-only commands such as `rg`.

### 2. Confirm Pi State

On Pi:

- confirm containers are up:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- confirm backend health:
  - `GET http://192.168.1.205:8001/api/v1/health`
- confirm Alembic current head:
  - `docker exec mkw-backend alembic current`

Do not redeploy unless the stack is broken. This handoff is not a deployment handoff.

### 3. Take A Pre-Dry-Run Backup

Take a timestamped `pg_dump` backup on the Pi before running the dry-run, even though the script rolls back.

Use a path under the Pi user's home or `/mnt/nas/pi_backup/` if mounted and available.

Example:

```sh
ssh iniwapi
docker exec mkw-postgres pg_dump -U mkw mkw_stats > ~/mkw_stats_pre_record_cleanup_YYYYMMDD_HHMMSS.sql
```

Report:

- backup path
- file exists
- approximate size

Do not commit backup files to the repository.

### 4. Run SQL As Dry-Run Only

Run `scripts/record_only_cleanup.sql` as-is against Pi PostgreSQL.

Acceptable approaches:

- from a shell that has the repo and Docker access:
  ```sh
  docker exec -i mkw-postgres psql -U mkw mkw_stats < scripts/record_only_cleanup.sql
  ```
- copy/paste the SQL into a reviewed `psql` session
- use a temporary copy of the SQL on the Pi, as long as the content is unchanged and still ends with `ROLLBACK`

Important:

- Do not edit `ROLLBACK` to `COMMIT`.
- Do not run any manual `DELETE`.
- Do not run `TRUNCATE`.
- Do not run `DROP`.

Capture the output counts.

### 5. Confirm No Permanent Change

After the dry-run, query the same affected table counts again outside the transaction or rerun the pre-count portion in read-only form.

Confirm counts are unchanged from before the dry-run.

Also check:

- `GET /api/v1/play-sessions?limit=1` still returns the same class of data as before the dry-run if there were sessions.
- `GET /api/v1/courses` still returns 30 active courses.
- `GET /api/v1/routes` still returns 203 active routes.
- `GET /api/v1/vr-accounts` still returns existing accounts.

### 6. Report Whether COMMIT Is Safe

Based on counts, report whether applying the cleanup appears safe.

Do not apply it in this handoff.

If there is anything surprising, such as:

- unexpected nonzero `uploaded_files`
- unexpected missing master data
- errors during SQL execution
- backup failure
- FK errors

stop and report the issue.

## Constraints

- Do not change files.
- Do not commit.
- Do not push.
- Do not redeploy unless the stack is broken and user approval is obtained.
- Do not modify the SQL to use `COMMIT`.
- Do not permanently delete Pi data.
- Do not run direct Docker Compose management on Pi.
- Do not expose secrets, DB passwords, or raw dumps in the report.

## Non Goals

- No actual cleanup apply.
- No SQL changes.
- No app code changes.
- No Portainer stack changes.
- No backup automation.

## Verification

Expected checks:

- script safety confirmed locally
- Pi containers up
- backend health OK
- Alembic current reported
- backup file created
- dry-run SQL completes and ends with `ROLLBACK`
- post-dry-run counts match pre-dry-run counts
- core API data still accessible

## Expected Report

- Changed files: should be `None`
- Script safety confirmation
- Pi container / health / Alembic state
- Backup path and size
- Pre-cleanup counts
- Dry-run post-cleanup counts shown by the transaction
- After-rollback counts proving no permanent change
- API sanity results
- Whether applying with `COMMIT` appears safe
- Blocked checks
- Design questions for Codex

Read AGENTS.md, CLAUDE.md, `docs/design/operations.md`, the relevant decisions and archived handoffs named below, and this handoff file before implementation.
If implementation would violate constraints or require files outside this handoff, stop and ask before editing.

> Reviewed and accepted by Codex on 2026-06-19. Commit `99aa4d8` preserves existing `map_points.x/y/radius` during seed, all 157 backend tests passed, the published backend was deployed with matching GHCR/runtime digest, and the June 18 pre-seed backup was restored through an isolated temporary database using a coordinate-only 30-row transaction. Production coordinates matched the recovery source exactly and remained unchanged after one seed run. Unrelated production counts and active VR state were unchanged.

Use Opus as coordinator. Delegate scoped implementation and verification work to Sonnet where available. Report if the intended model split is unavailable.

## Goal

Prevent seed execution from overwriting user-calibrated world-map marker coordinates, deploy that protection to the Raspberry Pi, and restore the lost production coordinates from the PostgreSQL backup taken immediately before the June 18, 2026 production seed runs.

Success requires:

- existing `map_points.x`, `map_points.y`, and `map_points.radius` values are treated as user-managed calibration data
- fresh databases still receive the seed coordinates for newly inserted map points
- repeated seed execution preserves coordinates on existing map points while continuing to synchronize non-coordinate map-point master fields
- the fix is covered by automated tests and recorded as a durable decision
- the fixed backend is published and deployed through the existing GitHub Actions/GHCR/Portainer flow
- only map-point coordinate fields are recovered from the pre-seed backup
- all unrelated production data remains unchanged
- a production seed run after recovery leaves the restored coordinates unchanged

## Background

Working environment:

- local repository: `D:\Git\mkw_stats`
- environment: Home Sub PC, Windows 11
- deployment target: Raspberry Pi 4, `linux/arm64`
- production stack owner: Portainer
- fixed container names: `mkw-postgres`, `mkw-backend`, `mkw-frontend`
- PostgreSQL persistence: `/home/iniwa/docker/mkw-stats/postgres`

Map calibration is intentionally persisted through:

```text
PATCH /api/v1/map-points/{map_point_id}
```

The frontend sends normalized `x/y` values to the backend, and the backend commits them to PostgreSQL. These values are shared by every browser and device using the same Raspberry Pi backend; they are not browser-local state.

The current seed implementation breaks that persistence:

- `backend/app/seed/initial_data.py` contains placeholder grid coordinates in `MAP_POINTS`
- `seed()` calls `_sync_seed_fields(existing, mp_data)` for existing map points
- this copies the placeholder `x/y` values over user-calibrated production values every time the seed runs

On June 18, 2026, the production seed was deliberately run twice during the reviewed VR-account idempotency deployment. A new plain SQL PostgreSQL backup was created immediately before those runs using this naming convention:

```text
/home/iniwa/mkw_stats_pre_seed_fix_YYYYMMDD_HHMMSS.sql
```

That pre-seed backup is the preferred recovery source. The exact filename must be discovered and validated on the Pi before any recovery write. Do not assume that the newest arbitrary database backup has the wanted coordinates.

The local worktree was clean when this handoff was created.

## Source Documents

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/operations.md`
- `docs/design/ui-redesign-roadmap.md`
- `docs/decisions/2026-05-22-map-point-course-ownership.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-25-portainer-api-env-preservation.md`
- `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`
- `docs/handoffs/archive/2026-05-25-map-point-calibration.md`
- `docs/handoffs/archive/2026-06-18-fix-seed-vr-idempotency.md`
- `docs/handoffs/archive/2026-06-18-publish-seed-vr-idempotency.md`
- `docs/handoffs/archive/2026-06-18-deploy-seed-vr-idempotency.md`

## Files To Inspect

- `backend/app/seed/initial_data.py`
- `backend/app/models/courses.py`
- `backend/app/api/courses.py`
- `backend/tests/conftest.py`
- `backend/tests/test_api.py`
- `backend/tests/test_smoke.py`
- `frontend/src/WorldMapPicker.tsx`
- `frontend/src/api.ts`
- `.github/workflows/docker-publish.yml`
- `deploy/portainer-stack.yml`
- all source documents listed above

## Files To Edit

- `backend/app/seed/initial_data.py`
- `backend/tests/test_smoke.py`
- `docs/design/operations.md`
- `docs/decisions/2026-06-19-preserve-map-point-calibration-during-seed.md` (new)

If a focused seed regression test belongs more naturally in an existing backend test file after inspection, `backend/tests/test_api.py` may also be edited. Do not edit frontend, API, schema, migration, Docker, compose, workflow, or deployment files unless an unexpected blocker is found; stop and report first.

## Required Implementation

### 1. Preserve Existing Calibration During Seed

Change map-point seed behavior so:

- a missing map point is inserted with all seed fields, including initial `x/y` and `radius` when present
- an existing map point keeps its current `x`, `y`, and `radius`
- an existing map point may still receive synchronized seed-owned fields such as `course_id`, `label_ja`, and `label_en`
- course and route synchronization behavior remains unchanged
- VR-account behavior from the June 18 decision remains unchanged

Do not remove seed coordinates from `MAP_POINTS`; fresh installations still need usable initial values.

Prefer an explicit field-ownership rule over a positional or accidental workaround. The code should make it obvious that coordinate fields are excluded only when synchronizing an existing map point.

### 2. Add Regression Coverage

Add tests that prove at least:

1. A fresh seed inserts map points with the seed-defined coordinates.
2. After a map point's `x`, `y`, and `radius` are changed to non-seed values, another `seed(session)` call preserves all three values.
3. The same repeated seed can still restore/update a non-coordinate seed-owned field on that map point, demonstrating that only calibration fields are excluded.
4. Existing course and route synchronization tests remain valid.
5. Existing VR-account seed tests remain valid.

Use values clearly different from the placeholder grid. Test the real `seed()` behavior, not only a helper in isolation.

### 3. Record Durable Ownership

Create:

```text
docs/decisions/2026-06-19-preserve-map-point-calibration-during-seed.md
```

Record:

- calibration is shared PostgreSQL state, not browser-local state
- `map_points.x/y/radius` become user-managed after insertion
- seed values for those fields are defaults for new rows only
- repeated seed execution must not overwrite existing calibration
- map-point identity, labels, and course ownership remain seed-managed master data unless separately changed by a future decision

Update `docs/design/operations.md` so its seed-idempotency description explicitly states that existing calibrated map-point coordinates are preserved.

## Local Verification Before Publication

Run from the appropriate directories:

```text
python -m py_compile app/seed/initial_data.py tests/test_smoke.py
python -m pytest tests/
```

If `backend/tests/test_api.py` is edited, include it in the compile command.

Also inspect:

```text
git diff --check
git status --short
git diff -- backend/app/seed/initial_data.py backend/tests/test_smoke.py backend/tests/test_api.py docs/design/operations.md docs/decisions/2026-06-19-preserve-map-point-calibration-during-seed.md
```

Do not proceed to publication if tests fail or the diff contains unrelated changes.

## Commit, Publish, and Deploy

This handoff explicitly authorizes one scoped commit and push for the reviewed files listed under `Files To Edit`, followed by deployment of the resulting backend image.

Before committing:

- confirm the worktree contains no unrelated changes
- if unexpected unrelated changes exist, leave them untouched and exclude them from the commit
- record the pre-commit HEAD

Create one focused commit with a message such as:

```text
fix: preserve calibrated map point coordinates during seed
```

Push using the repository's established Gitea-to-GitHub mirror flow. Confirm the GitHub Actions workflow succeeds and the backend image for the exact commit is available in GHCR. Do not accept only a mutable `latest` observation when an immutable commit/SHA tag or digest can be verified.

Deploy through the existing Portainer-managed stack:

- preserve all existing stack environment variables, ports, mounts, image names, and container names
- enable image pull
- do not use SSH `docker compose`
- verify the running backend image matches the published commit/digest
- no Alembic migration is expected
- do not run the seed yet; recovery must be prepared first

If publication, mirror synchronization, GHCR, or Portainer deployment is blocked, stop before production recovery writes. Report the blocker and leave the current production database unchanged.

## Production Recovery Procedure

Production recovery is authorized only after the fixed backend image is running.

### 1. Discover and Validate the Recovery Source

Using `ssh iniwapi`, list:

```text
/home/iniwa/mkw_stats_pre_seed_fix_*.sql
```

Select the backup that:

- was created during the reviewed June 18 seed deployment
- predates both June 18 production seed runs
- is non-empty
- is a readable plain SQL `pg_dump`
- contains the `public.map_points` table data

If no single backup can be identified with high confidence, stop without modifying production.

Do not print secrets or broad backup contents in the report.

### 2. Snapshot Current Production State

Before recovery:

- create a new timestamped full `pg_dump` of the current production database
- verify the new backup exists and is non-empty
- record deterministic current snapshots/counts for:
  - all map-point IDs and `x/y/radius`
  - courses
  - routes
  - VR accounts
  - app settings
  - play sessions
  - race records
  - notes
  - map annotations
  - Time Attack records
- record the active VR account identity and current VR

Keep the new current-state backup as the rollback source. Do not overwrite or delete the June 18 recovery source.

### 3. Restore the June 18 Backup Into an Isolated Temporary Database

Do not pipe or restore the old full dump directly into `mkw_stats`.

Inside the existing `mkw-postgres` container/cluster:

- create a uniquely named temporary recovery database
- restore the selected June 18 plain SQL dump into that temporary database
- verify the restore completed without relevant errors
- query the temporary database for deterministic `map_points(id, x, y, radius)` values

The temporary database is only a read source for recovery. Do not start application containers against it.

Before applying anything to production, confirm:

- the temporary backup contains exactly the expected 30 map-point IDs
- production contains the same expected 30 IDs
- there are no missing or extra IDs on either side
- every recovered `x/y` value is within `0.0..1.0`
- every non-null recovered `radius` is within `0.0..1.0`
- the recovered coordinates materially differ from the reset placeholder grid/current production values

If the backup also contains placeholder/reset coordinates, IDs differ, values are invalid, or the recovery source is otherwise ambiguous, stop without updating production.

### 4. Apply Only Coordinate Fields

Prepare a deterministic, reviewable coordinate-only update from the isolated database.

The production write must:

- run in one explicit transaction
- update only `map_points.x`, `map_points.y`, and `map_points.radius`
- match rows only by exact `map_points.id`
- affect exactly the expected 30 rows
- leave `course_id`, labels, and all other columns/tables untouched
- roll back on any count, ID, or validation mismatch

Do not restore, truncate, replace, or merge any other production table. Do not perform a full database restore.

After applying, compare production coordinates exactly against the isolated recovery source.

### 5. Prove the Fix on Production

Capture the exact restored production map-point snapshot, then run once:

```text
docker exec mkw-backend python -m app.seed.initial_data
```

After the seed:

- all 30 `x/y/radius` values must exactly match the pre-seed restored snapshot
- map-point count and IDs must remain unchanged
- active VR account identity and values must remain unchanged
- all unrelated application-data counts recorded earlier must remain unchanged
- backend health must succeed directly and through the frontend proxy
- backend logs must show no new unhandled exception

If the fixed seed changes any restored coordinate, stop further work and report. Do not repeatedly rerun the seed.

### 6. Cleanup

After successful comparison:

- drop only the uniquely named temporary recovery database
- retain both the original June 18 recovery source and the new pre-recovery production backup
- do not delete backups automatically

Browser verification should confirm from at least two separate clients or browser profiles, when feasible:

- the same marker positions are shown
- a hard reload preserves them
- no browser-local storage dependency is involved

If two-client browser verification is unavailable, API/DB equality is required and the manual check should be reported as blocked.

## Constraints

- Target runtime is Raspberry Pi 4, Docker, `linux/arm64`.
- Portainer remains the stack owner.
- SSH `docker exec` is allowed for maintenance and verification.
- Do not use SSH `docker compose` or create a parallel application stack.
- Do not change ports, environment variables, mounts, image conventions, external exposure, or Cloudflare behavior.
- Do not add dependencies.
- Do not add or run a schema migration.
- Do not change frontend or map calibration UI behavior.
- Do not modify `PATCH /api/v1/map-points/{map_point_id}` behavior.
- Do not expose passwords, tokens, registry credentials, or backup contents.
- Do not restore the whole June 18 database over production.
- Do not update any production field except `map_points.x/y/radius` during recovery.
- Do not silently choose a questionable backup.
- Do not delete recovery or rollback backups.
- Do not include unrelated worktree changes in the commit.

## Non Goals

- No recalibration by hand.
- No new map UI.
- No course/route master redesign.
- No database schema change.
- No general backup/restore redesign.
- No cleanup of unrelated production records.
- No changes to VR, Lounge, Time Attack, notes, annotations, or race behavior.
- No CI/CD or deployment architecture changes.

## Verification

Required:

- focused seed regression tests pass
- full backend test suite passes
- `git diff --check` passes
- one scoped commit contains only authorized files
- GitHub Actions succeeds for the exact commit
- running backend image matches the published commit/digest
- valid pre-recovery production backup exists
- valid June 18 pre-seed recovery source is identified
- isolated restore contains valid and complete map-point coordinates
- production coordinate-only update affects exactly 30 matching IDs
- post-recovery production coordinates equal the recovery source
- one production seed run preserves the restored coordinates exactly
- unrelated production counts and active VR state remain unchanged
- direct and proxied health checks pass

## Expected Report

Report in Japanese:

- Changed files
- Implementation summary
- Durable decision summary
- Local verification results
- Commit hash and pushed branches/remotes
- GitHub Actions run/result
- Published and running backend image tags/digests
- Portainer redeploy result
- Selected June 18 recovery backup path, timestamp, and size
- New pre-recovery backup path, timestamp, and size
- Isolated restore and map-point validation results
- Coordinate difference count before recovery
- Production update affected-row count
- Exact post-recovery equality result
- Post-recovery seed preservation result
- Unrelated data/count and active-account comparison
- Health/log/browser verification results
- Temporary database cleanup result
- Blocked checks
- Any files changed outside `Files To Edit`
- Design questions for Codex
- Final `git status --short`

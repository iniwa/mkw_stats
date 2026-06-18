Read AGENTS.md, CLAUDE.md, `docs/design/time-attack.md`, `docs/design/deployment.md`, `docs/design/operations.md`, the relevant Portainer decisions, and this handoff file before starting.
If deployment would require changing stack configuration, environment values, credentials, ports, image names, external exposure, or files outside this handoff, stop and report before making that change.

> Reviewed by Codex on 2026-06-18. Deployment accepted. Running images already matched `f1caa35`, so redundant Portainer redeploy was correctly skipped. Migration `007 -> 008`, API/UI verification, and temporary-row cleanup passed. Follow-up required: make initial seed safe when a non-seed VR account is already active.

## Goal

Deploy the published Time Attack release to the Raspberry Pi through the existing Portainer-managed stack, migrate PostgreSQL from Alembic `007` to `008`, and verify the live API and frontend.

This handoff authorizes:

- creating a pre-migration PostgreSQL backup
- redeploying the existing `mkw-stats` Portainer stack with image pull enabled
- running Alembic and the idempotent seed inside the Portainer-managed backend container
- creating and removing one isolated TA verification row when safe

Do not modify repository files, commit, push, or change deployment architecture.

## Background

Published source commit:

```text
f1caa35408dc0debb099c821333389c5e2f72b74
```

Published images:

```text
ghcr.io/iniwa/mkw-stats-backend:sha-f1caa35
ghcr.io/iniwa/mkw-stats-frontend:sha-f1caa35
```

Published manifest digests:

```text
backend:  sha256:5e90dd5b...
frontend: sha256:92d427ee...
```

At publication time, each `latest` manifest matched its corresponding `sha-f1caa35` manifest.

The Portainer stack normally remains configured on `latest`; do not change it to a SHA tag for this deployment unless normal `latest` verification fails and Codex/user approves a separate change.

Expected Pi deployment:

- host reachable with `ssh iniwapi`
- frontend: `http://192.168.1.205:3030`
- backend: `http://192.168.1.205:8001`
- containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- persistent data: `/home/iniwa/docker/mkw-stats/postgres`

Required Portainer stack environment values:

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
POSTGRES_DB=mkw_stats
POSTGRES_USER=mkw
POSTGRES_PASSWORD=<existing real value; do not expose it>
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

Never print or report the password value.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/time-attack.md`
- `docs/design/deployment.md`
- `docs/design/operations.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-25-portainer-api-env-preservation.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `deploy/portainer-stack.yml`
- `backend/alembic/versions/008_time_attack_records.py`

## Files To Edit

None.

Do not modify repository files.

## Required Work

### 1. Confirm Local And Published State

Before touching the Pi:

- confirm local `main` HEAD is `f1caa35408dc0debb099c821333389c5e2f72b74`
- confirm the local working tree is clean
- reconfirm both `sha-f1caa35` GHCR manifests are readable
- reconfirm `latest` still resolves to the same backend/frontend digest as `sha-f1caa35`

If `latest` no longer matches this release, stop and report. Do not deploy an unknown newer image.

### 2. Read-Only Pi Preflight

Connect with:

```sh
ssh iniwapi
```

Confirm:

- Pi is reachable
- `mkw-postgres`, `mkw-backend`, and `mkw-frontend` are running
- current container port bindings remain frontend `3030` and backend `8001`
- backend direct health succeeds
- frontend-proxied health succeeds
- current Alembic revision is recorded before deployment
- current TA table existence and row count are recorded if the table already exists
- current image references and image IDs/digests for backend/frontend are recorded

Expected pre-migration revision is normally `007`, but do not fail merely because it is already `008`. If already `008`, report why if discoverable and continue with idempotent verification; do not downgrade.

Read the existing Portainer stack environment values before redeploying. Confirm all required variable names are present without exposing `POSTGRES_PASSWORD`.

If any required environment variable is missing, or current ports/data directory differ from the documented values, stop before redeploying.

### 3. Create Pre-Migration Backup

Before redeploy or migration, create a timestamped logical backup on the Pi:

```sh
docker exec mkw-postgres pg_dump -U mkw mkw_stats > ~/mkw_stats_pre_ta_$(date +%Y%m%d_%H%M%S).sql
```

Confirm:

- command exit status is zero
- backup file exists
- backup size is greater than zero

Report the path and size. Do not print dump contents.

If the documented database user/name differ from the live stack, use the existing live values without exposing secrets and report only the non-secret database/user names.

Do not proceed without a valid backup.

### 4. Redeploy Through Portainer

Redeploy the existing `mkw-stats` stack with image pull enabled.

Preferred methods:

- Portainer Stack UI with **Pull latest image**
- existing approved Portainer API workflow

If using the Portainer API:

- fetch/preserve the complete existing stack environment
- resend all existing environment variables in the update payload
- preserve stack file content and endpoint ownership
- never submit a minimal payload that may discard environment values
- never log tokens or password values

Do not use SSH `docker compose up`, create parallel containers, or bypass Portainer ownership.

After redeploy, confirm:

- all three fixed-name containers are running
- host ports remain `3030` and `8001`
- persistent Postgres mount remains under `/home/iniwa/docker/mkw-stats/postgres`
- backend and frontend are running newly pulled images
- running backend/frontend image IDs or RepoDigests correspond to the published `f1caa35` manifests

If Portainer returns `401` while pulling public GHCR images, inspect stale Portainer registry credentials as documented. Do not change GHCR visibility or add credentials without approval.

### 5. Apply Migration And Seed

Run inside the Portainer-managed backend container:

```sh
docker exec mkw-backend alembic upgrade head
docker exec mkw-backend alembic current
docker exec mkw-backend python -m app.seed.initial_data
```

Required result:

```text
008 (head)
```

Then verify directly in PostgreSQL:

- enum type `time_attack_category` exists with `nita` and `item`
- table `time_attack_records` exists
- unique constraint `uq_ta_record_course_category` exists
- the three positive-time check constraints exist
- initial seed did not create TA rows or alter existing TA rows

Do not run a downgrade on the live Pi.

### 6. Live API Verification

Verify direct backend and frontend proxy paths:

```text
GET http://192.168.1.205:8001/api/v1/health
GET http://192.168.1.205:3030/api/v1/health
GET http://192.168.1.205:8001/api/v1/time-attack-records
GET http://192.168.1.205:8001/api/v1/time-attack-records?category=nita
GET http://192.168.1.205:8001/api/v1/time-attack-records?category=item
GET http://192.168.1.205:8001/api/v1/courses
```

Confirm:

- health responses are OK
- TA endpoints return JSON arrays
- category filters return only the requested category
- courses still return 30 active courses
- existing ranked/Lounge endpoints used by Dashboard still respond

### 7. Isolated TA Write Verification

First query existing `time_attack_records`. Select a `(course_id, category)` combination with no existing record.

If all 60 combinations already exist, do not overwrite user data; skip the write test and report it as blocked.

For an unused combination:

1. Record the pre-test row count.
2. PUT a clearly identifiable temporary record through the public backend API with:
   - a valid PB
   - valid WR
   - valid target
   - notes containing a unique marker such as `TA_DEPLOY_VERIFY_<timestamp>`
3. Confirm the response values and category.
4. PUT again to the same course/category with one field omitted and one field explicitly `null`:
   - omitted field must remain unchanged
   - explicit `null` field must clear
   - row count must not increase
5. Confirm zero or negative time returns `422`.
6. Confirm invalid category returns `422`.

Cleanup:

- identify the test row by its exact returned UUID and unique marker
- delete only that exact row directly in PostgreSQL
- confirm one row was deleted
- confirm final TA row count equals the pre-test count

Do not delete or modify any pre-existing TA row. If identity or ownership of the test row is uncertain, do not delete it; stop and report.

### 8. Live Frontend Verification

Hard reload the frontend so the new hashed bundle is used.

Verify at desktop width and 375px width:

- `TA` appears between `Courses` and `Records`
- TA view loads without JavaScript/React errors
- both `NITA` and `アイテムあり` show all 30 active courses
- category switching works
- unsaved draft text survives switching away and back between TA categories
- valid `m:ss.mmm` values are accepted
- invalid examples are rejected without a request:
  - `123456`
  - `1:23`
  - `1:60.000`
  - `0:00.000`
- WR and target differences display correct signs and three decimal places
- note expand/collapse works
- the page itself does not overflow horizontally at 375px
- the TA table has its own horizontal scroll area
- Dashboard, Playing, Courses, Records, and Settings still load without regression

For persistence UI verification, either:

- perform it while the isolated verification record from step 7 exists, then clean it afterward, or
- use a second unused combination and clean the exact created row afterward

Do not overwrite existing user TA data.

### 9. Final State

Confirm:

- containers remain healthy
- Alembic is `008 (head)`
- backend/frontend running images match `f1caa35`
- no temporary TA verification row remains
- no ranked/Lounge/session/note/annotation data was altered
- backup remains available
- local repository remains unchanged and clean

## Constraints

- Raspberry Pi 4 / `linux/arm64` target.
- Portainer remains the stack owner.
- Preserve all existing Portainer environment values.
- Do not expose `POSTGRES_PASSWORD`, Portainer tokens, registry tokens, or dump contents.
- Do not modify source files.
- Do not commit or push.
- Do not edit the Portainer stack YAML, image names, ports, mounts, restart policy, timezone, registry settings, or external exposure.
- Do not downgrade the live database.
- Do not reset or clean play records.
- Do not run `scripts/record_only_cleanup.sql`.
- Do not overwrite or delete existing TA data.
- Only delete an exact temporary TA row created by this verification.
- Do not use SSH Docker Compose deployment.

## Non Goals

- No new application changes.
- No further design changes.
- No external WR import.
- No backup automation.
- No Cloudflare/external exposure changes.

## Verification

Required:

- pre-migration backup exists and is non-empty
- Portainer redeploy pulls the published `f1caa35` images
- ports, mounts, and environment remain correct
- Alembic reaches `008 (head)`
- migration objects and constraints exist
- seed remains idempotent and creates no TA rows
- live TA GET/PUT/null/validation behavior passes without residual test data
- desktop and 375px live UI smoke passes
- existing core views remain functional

## Expected Report

- Changed repository files: should be `None`
- Backup path and size
- Pre/post container status, ports, mounts, and image digests
- Portainer redeploy method and env-preservation confirmation
- Pre/post Alembic revision
- Migration object/constraint verification
- Seed result and TA row-count comparison
- API verification results
- Temporary TA test record UUID/marker and cleanup result
- Live desktop/375px UI verification results
- Existing-view regression smoke results
- Final TA row count and confirmation no test row remains
- Residual data or unexpected state
- Recovery path using the backup
- Blocked checks
- Design questions for Codex

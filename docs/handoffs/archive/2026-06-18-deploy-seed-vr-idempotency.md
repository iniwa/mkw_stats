Read AGENTS.md, CLAUDE.md, `docs/design/deployment.md`, `docs/design/operations.md`, the relevant Portainer decisions, `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`, and this handoff before starting.
If deployment would require changing stack configuration, environment values, credentials, ports, image names, external exposure, or repository files, stop and report before making that change.

> Reviewed by Codex on 2026-06-18. Deployment accepted. Backend `sha-e10e721` was deployed through Portainer, a new backup was created, two production seed runs succeeded, the active `iniwa` account remained unchanged, inactive `main` was added once, and all tracked application-data counts remained stable.

## Goal

Deploy backend commit `e10e721028682183ed5429704fcf94cc968f05f0` to the Raspberry Pi through the existing Portainer-managed stack and verify that production seed execution is now idempotent.

Success requires:

- the Pi backend runs the published `sha-e10e721` image content
- the existing active VR account remains active and unchanged
- missing default account `main` is added inactive, or an existing `main` remains unchanged
- two consecutive seed runs succeed
- the second run makes no further VR-account changes
- existing application data remains intact

This handoff authorizes:

- creating a timestamped PostgreSQL backup
- redeploying the existing Portainer stack with image pull enabled when the running backend does not already match the published image
- running the seed twice inside `mkw-backend`
- read-only database, API, container, and log verification

Do not modify repository files, commit, push, migrate the schema, or change deployment architecture.

## Background

Published source commit:

```text
e10e721028682183ed5429704fcf94cc968f05f0
```

Published backend image:

```text
ghcr.io/iniwa/mkw-stats-backend:sha-e10e721
```

Publication verification reported:

```text
backend sha-e10e721: sha256:4ac6199d...
backend latest:      sha256:4ac6199d...
```

Resolve and compare the full manifest digests before deployment; do not rely only on the abbreviated value above.

Current production facts from the preceding Time Attack deployment:

- containers: `mkw-postgres`, `mkw-backend`, `mkw-frontend`
- frontend port: `3030`
- backend port: `8001`
- PostgreSQL data: `/home/iniwa/docker/mkw-stats/postgres`
- Alembic revision: `008 (head)`
- active VR account: `iniwa`
- default seed account `main` was absent when the old seed failed
- old seed transaction rolled back without data loss
- Time Attack table exists and had zero rows after verification cleanup
- previous backup: `/home/iniwa/mkw_stats_pre_ta_20260618_144154.sql`

The old backup is not a substitute for the new pre-seed backup required by this handoff.

At handoff creation time, local HEAD is `e10e721`, but the following Codex-authored documentation lifecycle changes are intentionally uncommitted:

- delete active `docs/handoffs/2026-06-18-publish-seed-vr-idempotency.md`
- add archived `docs/handoffs/archive/2026-06-18-publish-seed-vr-idempotency.md`
- add this deployment handoff
- update `docs/handoffs/README.md`

These expected documentation changes must remain untouched. No application-code change should be present.

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/deployment.md`
- `docs/design/operations.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `docs/decisions/2026-05-25-portainer-api-env-preservation.md`
- `docs/decisions/2026-06-18-seed-vr-account-idempotency.md`
- `docs/handoffs/archive/2026-06-18-time-attack-pi-deploy.md`
- `deploy/portainer-stack.yml`
- `backend/app/seed/initial_data.py`
- `backend/app/models/vr.py`

## Files To Edit

None.

Do not modify repository files.

## Required Work

### 1. Confirm Local And Published State

Before touching the Pi:

- confirm local `main` HEAD is `e10e721028682183ed5429704fcf94cc968f05f0`
- confirm the local working tree contains only the Codex-authored documentation lifecycle changes listed in Background
- confirm there are no application, deployment, secret, dump, generated-output, or unrelated changes
- confirm `ghcr.io/iniwa/mkw-stats-backend:sha-e10e721` is readable
- resolve the full manifest digest for `sha-e10e721`
- confirm backend `latest` resolves to the same manifest digest

If `latest` differs from `sha-e10e721`, stop. Do not deploy an unknown newer image.

Frontend publication may also have run, but this handoff does not require a frontend code change or browser feature verification.

### 2. Read-Only Pi Preflight

Connect using:

```sh
ssh iniwapi
```

Confirm:

- all three fixed-name containers are running
- host ports remain frontend `3030` and backend `8001`
- backend direct health and frontend-proxied health succeed
- Alembic remains `008 (head)`
- current backend image reference, image ID, and RepoDigest
- PostgreSQL mount remains `/home/iniwa/docker/mkw-stats/postgres`
- required Portainer stack environment variable names remain present without printing `POSTGRES_PASSWORD`

Record these pre-seed database facts:

- total VR account count
- every VR account's UUID, name, display name, initial VR, current VR, active flag, and sort order
- identity and values of the active account
- count of active accounts
- whether `main` exists and all its values if present
- counts for courses, map points, routes, play sessions, races, notes/annotations, and Time Attack records

Use deterministic ordering for snapshots. Preserve the exact pre-seed VR-account snapshot for comparison, but do not expose credentials or database dump contents.

If more than one active VR account exists, stop before seed execution because production state already violates the expected invariant.

### 3. Determine Whether Redeploy Is Required

Compare the running backend image content with the published `sha-e10e721` manifest.

- If they match exactly, skip redeploy and report that it would be redundant.
- If they differ, redeploy the existing `mkw-stats` stack through Portainer with image pull enabled.

For a Portainer redeploy:

- preserve the complete existing stack environment
- resend all existing environment variables if using the API
- preserve stack file content, endpoint ownership, ports, volumes, and fixed container names
- never print tokens or password values
- do not use SSH `docker compose up`
- do not create parallel containers

After redeploy, verify:

- all containers are running
- ports remain `3030` and `8001`
- PostgreSQL mount is unchanged
- backend direct and proxied health succeed
- running backend RepoDigest matches `sha-e10e721`

If a Portainer pull returns `401`, inspect stale Portainer registry credentials as documented. Do not change registry settings, package visibility, or credentials without separate approval.

### 4. Create A New Pre-Seed Backup

Before running seed, create a timestamped logical backup on the Pi:

```sh
docker exec mkw-postgres pg_dump -U mkw mkw_stats > ~/mkw_stats_pre_seed_fix_$(date +%Y%m%d_%H%M%S).sql
```

Confirm:

- exit status is zero
- file exists
- size is greater than zero

Report path and size. Do not print dump contents.

If live database/user names differ, use the existing non-secret live values and report them. Do not expose the password.

Do not run seed without a valid new backup.

### 5. First Production Seed Run

Run inside the existing Portainer-managed backend container:

```sh
docker exec mkw-backend python -m app.seed.initial_data
```

The command must exit successfully.

Immediately collect the same deterministic VR-account snapshot and application-data counts as in preflight.

Expected VR behavior:

- the previously active account remains active
- its UUID, name, display name, initial VR, current VR, and sort order are unchanged
- exactly one active account exists
- if `main` was absent before seed, exactly one `main` row is added with `is_active=false`
- if `main` already existed, every field on it remains unchanged
- no existing VR account is deleted or modified

Expected broader behavior:

- Alembic remains `008 (head)`
- no Time Attack row is created
- user play/session/race/note/annotation data counts remain unchanged
- course, map-point, and route master counts remain valid

If the first seed fails or changes user-managed VR values, stop. Do not run the second seed. Preserve logs and use the backup as the recovery path; do not restore automatically unless explicitly approved.

### 6. Second Production Seed Run

Run the same seed command a second time:

```sh
docker exec mkw-backend python -m app.seed.initial_data
```

The command must exit successfully.

Collect the deterministic snapshots again and compare first-run versus second-run state.

Required:

- VR-account rows and all VR-account values are identical after both runs
- there is exactly one `main`
- there is exactly one active account
- the active account identity is unchanged
- application-data counts are unchanged
- no open or idle-in-transaction database session remains from the seed command

### 7. Live Service Smoke Check

Verify:

```text
GET http://192.168.1.205:8001/api/v1/health
GET http://192.168.1.205:3030/api/v1/health
GET http://192.168.1.205:8001/api/v1/vr-accounts
GET http://192.168.1.205:8001/api/v1/courses
GET http://192.168.1.205:8001/api/v1/time-attack-records
GET http://192.168.1.205:8001/api/v1/play-sessions
```

Confirm:

- direct and proxied health are OK
- VR account API shows the expected active account and inactive `main`
- courses remain available
- Time Attack endpoint remains available
- play-session endpoint remains available
- backend logs contain no new unhandled exception from redeploy or seed

No write API test or browser automation is required for this focused deployment.

### 8. Final State And Recovery

Report:

- whether Portainer redeploy was performed or skipped
- final backend image reference, image ID, and RepoDigest
- backup path and size
- pre-seed, first-run, and second-run VR-account comparison
- active account before and after
- `main` before and after
- application-data count comparison
- final Alembic revision
- final container status, ports, mount, health, and relevant log result

Recovery path:

- retain the new backup
- if a later problem is attributed to this seed run, stop application writes before restore
- restore only with explicit approval using the documented PostgreSQL recovery process

Do not automatically delete the newly created inactive `main`; it is the intended seed result.

## Constraints

- Do not edit repository files.
- Do not commit or push.
- Do not run Alembic upgrade or downgrade; schema is already `008`.
- Do not change migrations, schema, indexes, API, frontend, dependencies, Dockerfiles, workflows, image tags, ports, volumes, credentials, `.env`, or external exposure.
- Do not alter Portainer stack configuration except the normal image-pull redeploy while preserving all existing state.
- Do not use SSH `docker compose` to manage the stack.
- Do not expose secrets, tokens, passwords, or backup contents.
- Do not create, update, or delete user play records.
- Do not activate `main`.
- Do not delete `main` after successful seed.
- Do not restore a backup without explicit approval.
- Do not update or delete `[[feedback_seed_not_idempotent_on_pi]]` until both seed runs and state comparisons pass.

## Non Goals

- No migration.
- No frontend feature verification.
- No Time Attack write verification.
- No account activation or account cleanup.
- No seed refactor.
- No deployment architecture change.

## Verification

Required:

- published and running backend digests match
- valid pre-seed backup exists
- first seed succeeds with expected one-time `main` insertion or no change to existing `main`
- second seed succeeds with no state changes
- exactly one active VR account remains
- existing active account values remain unchanged
- application data remains intact
- health and focused APIs pass
- repository remains untouched
- final working-tree status is identical to the starting expected documentation-only status

## Expected Report

- Changed repository files
- Local/published image confirmation
- Portainer redeploy performed or skipped, with reason
- Backup path and size
- Pre/post container status, ports, mount, and image digests
- Alembic revision
- Pre-seed VR account state
- First seed result and state comparison
- Second seed result and idempotency comparison
- Application-data count comparison
- API and log verification
- Final repository status
- Recovery path
- Blocked checks
- Design questions for Codex

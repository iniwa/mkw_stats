Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
If verification would require direct Docker Compose management on Raspberry Pi outside Portainer, stop and ask before proceeding.

## Goal

Verify the current Playing UI vertical slice on the Raspberry Pi Portainer deployment after the latest frontend/backend images are published.

This is a verification handoff, not a feature implementation handoff.

## Background

The backend core API, Playing UI vertical slice, session race list API, and ranked draft resume behavior have been implemented and pushed to `main`.

Local verification passed:

- backend tests: `python -m pytest` passed
- frontend: `npm run typecheck` and `npm run build` passed

Local live-browser normal-flow verification was blocked because the development PC does not have a running PostgreSQL/backend environment. The Pi deployment is the first realistic end-to-end environment.

Deployment model:

- Gitea `main` -> GitHub mirror `main` -> GitHub Actions -> GHCR
- Portainer Stack uses:
  - `ghcr.io/iniwa/mkw-stats-backend:latest`
  - `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Raspberry Pi host ports:
  - frontend: `3030`
  - backend: `8001`

Relevant docs:

- `docs/design/deployment.md`
- `docs/decisions/2026-05-22-portainer-managed-exec-policy.md`
- `docs/decisions/2026-05-22-raspberry-pi-port-defaults.md`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/design/deployment.md`
- `deploy/portainer-stack.yml`
- `frontend/src/PlayingView.tsx`
- `frontend/src/api.ts`
- `backend/app/api/sessions.py`
- `backend/app/api/races.py`
- `backend/app/services/race_flow.py`

## Files To Edit

None by default.

This is verification-only. Do not edit files unless a small documentation correction is clearly necessary and you can explain it in the report.

Do not edit:

- deploy files
- Docker, GHCR, Portainer, or workflow files
- database migrations or models
- secrets, credentials, `.env`, or local settings

## Verification Steps

### 1. Confirm Image Availability

Confirm that both GHCR images are available and include `linux/arm64` manifests:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
```

If the latest commit has not reached GHCR yet, report the block and wait for/retry only if practical.

### 2. Confirm Portainer Stack State

The stack should be named `mkw-stats` and should expose:

```text
mkw-frontend: 0.0.0.0:3030->80
mkw-backend:  0.0.0.0:8001->8000
mkw-postgres: internal only
```

Use Portainer-managed deployment boundaries:

- It is acceptable to inspect containers/logs over `ssh iniwapi`.
- It is acceptable to run `docker exec` inside existing Portainer-created containers for verification or maintenance.
- Do not run `docker compose up` or create a parallel stack over SSH.
- If the stack needs a pull/redeploy through Portainer Web Editor, ask the user to perform that action and continue after it is done.

### 3. Run Migration/Seed If Needed

No schema migration is expected beyond the existing head, but verify the backend container is at Alembic head.

If needed, run inside the Portainer-managed backend container:

```sh
docker exec mkw-backend alembic upgrade head
docker exec mkw-backend python -m app.seed.initial_data
```

The seed command is idempotent.

### 4. Backend Smoke Tests

Verify:

```text
http://<pi-host>:8001/api/v1/health
```

Expected response:

```json
{"status":"ok","service":"mkw-stats-backend"}
```

Also verify the frontend nginx proxy:

```text
http://<pi-host>:3030/api/v1/health
```

### 5. Playing UI Browser Flow

Open:

```text
http://<pi-host>:3030
```

Verify at least these flows:

1. Page loads the Playing view without a blank panel.
2. Active sessions can be listed or a clear empty/new-session state appears.
3. Ranked flow:
   - Start ranked session.
   - Select a course using map points.
   - Confirm course selection.
   - Before completing the result, reload the browser page.
   - Resume the active ranked session.
   - Confirm the ranked result input form returns for the draft race.
   - Complete the ranked result and confirm race history updates.
4. Lounge flow:
   - Start Lounge session.
   - Record at least two races.
   - Confirm course history and Race N / 12 update.
   - Trigger a repick if practical and confirm warning appears but recording is not blocked.
   - Reload and resume, then confirm completed race history persists.
5. Undo:
   - Undo last race.
   - Confirm the UI refreshes from persisted race history and does not show the undone race.

Do not create large amounts of permanent test data. If cleanup is needed and no cleanup UI exists, report the test records left behind instead of inventing destructive cleanup.

## Constraints

- Verification-only unless a tiny documentation correction is necessary.
- Do not change Portainer stack ownership.
- Do not expose the app externally or change Cloudflare/NAS/network settings.
- Do not add new features during verification.
- Do not commit automatically.

## Expected Report

- Changed files, if any
- Image availability result
- Portainer stack/container status
- Migration/seed result
- Backend health and frontend proxy smoke results
- Playing UI ranked flow result
- Playing UI Lounge flow result
- Undo/resume result
- Blocked checks
- Bugs found, with exact steps to reproduce
- Design questions for Codex

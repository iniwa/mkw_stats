Read AGENTS.md, CLAUDE.md, and this handoff file before starting verification.
This is a verification-only handoff. Do not edit files unless a blocker is discovered and Codex explicitly approves the change.

## Goal

Verify the Dashboard MVP on the Raspberry Pi deployment.

Confirm that commit `a6a662f Add dashboard MVP` has reached GHCR, Portainer is running the updated frontend image, and the Web GUI opens to Dashboard by default with correct data, navigation, error-free rendering, and usable narrow viewport layout.

## Background

The Dashboard MVP was implemented and pushed from Codex:

- commit: `a6a662f Add dashboard MVP`
- frontend-only change
- new component: `frontend/src/DashboardView.tsx`
- `frontend/src/App.tsx` now defaults to `Dashboard`

Dashboard uses existing endpoints only:

- `GET /api/v1/vr-accounts`
- `GET /api/v1/play-sessions/active`
- `GET /api/v1/play-sessions?limit=5`
- `GET /api/v1/courses`
- `GET /api/v1/routes`
- `GET /api/v1/notes`
- `GET /api/v1/map-annotations`

Relevant decisions:

- `docs/decisions/2026-05-24-dashboard-mvp-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `docs/decisions/2026-05-22-raspberry-pi-port-defaults.md`

Deployment facts:

- Git flow: Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer
- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`
- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Pi containers:
  - `mkw-postgres`
  - `mkw-backend`
  - `mkw-frontend`
- Pi host ports:
  - frontend: `3030`
  - backend: `8001`

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-dashboard-mvp-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `deploy/portainer-stack.yml`
- `frontend/src/DashboardView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/App.css`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. Confirm image publication

Confirm GitHub Actions completed for commit `a6a662f` or a later commit containing the Dashboard MVP.

Confirm GHCR has updated images:

- `ghcr.io/iniwa/mkw-stats-frontend:latest`
- `ghcr.io/iniwa/mkw-stats-backend:latest`

The Dashboard is frontend-only, but keep the backend running and healthy because the Dashboard depends on existing APIs.

If SHA tags are visible, also check:

- `ghcr.io/iniwa/mkw-stats-frontend:sha-a6a662f`
- `ghcr.io/iniwa/mkw-stats-backend:sha-a6a662f`

If Portainer pull fails with `401`, check the known stale GHCR credential issue from `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md` before proposing app or workflow changes.

### 2. Update Portainer stack

Use Portainer Stack UI or Portainer API to re-pull/redeploy the `mkw-stats` stack.

Do not use `docker compose up` directly for deployment. SSH/docker inspection is allowed for verification after Portainer has deployed the stack.

Confirm containers are up:

- `mkw-postgres`
- `mkw-backend`
- `mkw-frontend`

Confirm exposed ports remain:

- `mkw-backend`: `0.0.0.0:8001->8000`
- `mkw-frontend`: `0.0.0.0:3030->80`

### 3. API smoke checks

Confirm:

- `GET http://<pi-host>:8001/api/v1/health` returns 200
- `GET http://<pi-host>:3030/api/v1/health` returns 200 through nginx proxy
- Dashboard source endpoints return 200:
  - `/api/v1/vr-accounts`
  - `/api/v1/play-sessions/active`
  - `/api/v1/play-sessions?limit=5`
  - `/api/v1/courses`
  - `/api/v1/routes`
  - `/api/v1/notes`
  - `/api/v1/map-annotations`

Record the counts returned by the list endpoints. These counts should match the Dashboard UI.

### 4. Web GUI checks

Open:

```text
http://<pi-host>:3030
```

Hard reload the browser if an old hashed JS bundle appears to be cached.

Verify:

- app opens to `Dashboard` by default
- `Dashboard` nav button is active
- no placeholder text appears for Dashboard
- VR account panel displays the active account and current VR, or the empty state if no active account exists
- active session panel displays active sessions or the empty state
- recent sessions panel displays up to 5 sessions, newest first
- library counts display:
  - active courses
  - active routes
  - active notes
  - map annotations
- displayed counts match the API counts from Step 3
- quick action buttons navigate correctly:
  - `Playing`
  - `Records`
  - `Courses`
  - `Settings`
- browser back to Dashboard or Dashboard nav rerenders without blank screen
- no Dashboard-caused console errors
- 375px narrow viewport remains usable:
  - no horizontal overflow that hides controls
  - metric counts remain readable
  - quick action buttons remain tappable

If Playwright browser is unavailable because another session owns it, perform manual browser checks or API checks and note exactly which browser checks were blocked.

### 5. Regression spot checks

After navigating from Dashboard, briefly confirm:

- `Playing` view still loads without a blank screen
- `Records` view still loads sessions
- `Courses` view still loads notes and annotations
- `Settings` view still loads VR account settings

Do not create new records or annotations unless necessary for verification.

## Constraints

- Verification-only: do not edit repo files.
- Do not change Docker/Portainer stack files.
- Do not change GHCR package visibility unless explicitly instructed by the user.
- Do not introduce GHCR credentials into Portainer unless private pulls are intentionally required.
- Do not expose the service externally or change Cloudflare Tunnel behavior.
- Do not create persistent test data unless a check cannot be completed without it.
- Delete any temporary screenshots created during local verification unless the user asks to keep them.

## Non Goals

- No new Dashboard features.
- No backend changes.
- No analytics implementation.
- No charts.
- No session editing or deletion.
- No deployment architecture changes.

## Expected Report

Report in Japanese:

- Changed files, if any
- GHCR / GitHub Actions status
- Portainer/container status
- API smoke check results and endpoint counts
- Web GUI Dashboard check results
- Regression spot check results
- Any residual test data left in the DB
- Blocked checks and exact reason
- Bugs found
- Design questions for Codex

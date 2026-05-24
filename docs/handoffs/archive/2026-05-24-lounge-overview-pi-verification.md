Read AGENTS.md, CLAUDE.md, and this handoff file before verification.
This is a verification-only handoff. Do not edit files unless Codex explicitly asks for a fix after this report.

## Goal

Verify the Lounge overview MVP on the Raspberry Pi Portainer deployment.

Confirm that commit `ab0c9c2` (`Add lounge overview MVP`) has reached GHCR, is running in Portainer, and that the `Lounge` view matches the backend data.

## Background

The Lounge overview MVP is frontend-only and was implemented in:

- `frontend/src/LoungeView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

Relevant decisions:

- `docs/decisions/2026-05-24-lounge-overview-mvp-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`

Deployment flow:

- Gitea `main` -> GitHub mirror -> GitHub Actions -> GHCR -> Portainer

Important deployment note:

- Portainer does not automatically recreate MKW containers after GHCR publishes `latest`.
- If the Pi is still running an old image, redeploy through Portainer with image pull enabled.
- Do not use direct `docker compose up`.

Runtime details:

- Frontend image: `ghcr.io/iniwa/mkw-stats-frontend:latest`
- Backend image: `ghcr.io/iniwa/mkw-stats-backend:latest`
- Pi frontend URL: `http://<pi-host>:3030`
- Pi backend URL: `http://<pi-host>:8001`
- Container names: `mkw-frontend`, `mkw-backend`, `mkw-postgres`

The Lounge view fetches:

1. `GET /api/v1/play-sessions?source=lounge&limit=50`
2. `GET /api/v1/courses`
3. `GET /api/v1/routes`
4. `GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true` for each Lounge session

## Files To Inspect

- `AGENTS.md`
- `CLAUDE.md`
- `docs/decisions/2026-05-24-lounge-overview-mvp-scope.md`
- `docs/decisions/2026-05-22-ghcr-sha-tags-and-portainer-auth.md`
- `frontend/src/LoungeView.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/api.ts`
- `deploy/portainer-stack.yml`

## Files To Edit

None.

This handoff is verification-only.

## Verification Steps

### 1. GHCR / GitHub Actions

Verify that the latest frontend image contains the Lounge overview commit.

Check, as available:

- GitHub Actions Docker Publish completed for commit `ab0c9c2` or a later commit containing it.
- `ghcr.io/iniwa/mkw-stats-frontend:latest` is pullable.
- `ghcr.io/iniwa/mkw-stats-frontend:sha-ab0c9c2` exists if the SHA tag is available publicly.

If GitHub or GHCR package APIs require authentication, report that clearly and use image pull / runtime behavior as the practical confirmation.

### 2. Portainer / Container State

Verify the Portainer stack is running the updated frontend image.

Expected containers:

- `mkw-postgres` Up
- `mkw-backend` Up, host `8001 -> 8000`
- `mkw-frontend` Up, host `3030 -> 80`

If the stack is still running an old frontend image, redeploy through Portainer with image pull enabled. Do not use direct `docker compose up`.

After redeploy, confirm the served frontend bundle contains the Lounge view. Practical checks are acceptable, such as finding `Recent 50 Lounge sessions` or `lounge__` class names in the served assets/container files.

### 3. Backend API Sanity

Verify the backend endpoints used by Lounge overview:

- `GET http://<pi-host>:8001/api/v1/health`
- `GET http://<pi-host>:3030/api/v1/health` through nginx proxy
- `GET http://<pi-host>:8001/api/v1/play-sessions?source=lounge&limit=50`
- `GET http://<pi-host>:8001/api/v1/courses`
- `GET http://<pi-host>:8001/api/v1/routes`

For the returned Lounge sessions, sample or fully verify:

- `GET /api/v1/play-sessions/{session_id}/races?include_cancelled=true`

Record the counts needed to compare against the UI:

- Lounge session total in the recent window
- active/completed/cancelled Lounge session counts
- for active Lounge sessions: completed non-cancelled race count, total race records, cancelled race count, warning count, latest target
- for recent Lounge sessions: completed race counts, cancelled counts, warning counts, preview targets
- warning flag counts using `WARNING_LABELS`
- most-used Lounge course/route target counts, excluding cancelled races

### 4. Web GUI Lounge Check

Open the deployed frontend:

```text
http://<pi-host>:3030
```

Verify:

- Dashboard still loads by default.
- `Lounge` nav opens the Lounge overview.
- `Recent 50 Lounge sessions` window label is visible.
- Loading resolves without a blank screen.
- Empty state appears if there are no Lounge sessions. If Lounge sessions exist, verify the data sections below.
- Active Lounge sessions, if any, show progress as completed non-cancelled races `/ 12`.
- Active Lounge rows show total race records, cancelled race count, warning count, and latest target when present.
- Recent Lounge sessions show status, started/completed time, player count, format, completed/cancelled/warning counts, and target preview.
- Warning records show aggregate counts and details using `WARNING_LABELS`.
- Most-used targets show resolved course/route names and distinguish course vs route.
- Cancelled races are excluded from most-used target counts.
- Browser console has no app errors.

### 5. Responsive / Regression Spot Check

Verify around 375px width:

- No horizontal page overflow.
- Lounge rows remain readable.
- Warning details and target list remain usable.

Spot-check existing views:

- Dashboard
- Playing
- Records
- Analytics
- Courses
- Settings

They should still render without blank screens or console errors.

## Constraints

- Verification-only.
- Do not edit source files.
- Do not create migrations.
- Do not mutate production data unless absolutely needed for verification.
- If test data is required, stop and ask Codex first.
- Do not hard-delete existing data.
- Use Portainer deployment flow; do not run direct `docker compose up` on the Pi.

## Non Goals

- Implementing fixes.
- Adding Lounge API sync.
- Adding backend endpoints.
- Creating or cleaning Lounge sessions.
- Adding Watchtower automation.
- Changing deployment files.

## Expected Report

Report in Japanese:

- Changed files, if any. Expected: none.
- GHCR / GitHub Actions status.
- Portainer / container status.
- Backend API counts used for comparison.
- Web GUI Lounge verification results.
- Responsive and regression spot-check results.
- Blocked checks and exact reason.
- Residual test data, if any.
- Bugs found.
- Design questions for Codex.
